import { createInterface } from 'node:readline';
import {
  editorCommandSchema,
  editorConnectionSchema,
  editorResultSchema,
  editorRpcSchema,
} from '@app/schemas';

const origin = new URL(process.env.TRICO_MCP_ORIGIN ?? 'http://app.localhost:18091');
if (
  origin.protocol !== 'http:' ||
  !/^(localhost|127\.0\.0\.1|.*\.localhost)$/.test(origin.hostname) ||
  origin.username ||
  origin.password
)
  throw new Error('MCP requires a local HTTP backend.');
const api = async (
  path: string,
  method: string,
  body?: unknown,
  bearer?: string,
): Promise<unknown> => {
  const response = await fetch(`${origin.origin}/api/v1/editor/${path}`, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
    headers: {
      Origin: origin.origin,
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok)
    throw new Error(
      `Editor request rejected (${String(response.status)}). Reconnect or review the draft in the website.`,
    );
  return response.json();
};
let connection: ReturnType<typeof editorConnectionSchema.parse> | undefined;
let state: 'new' | 'initialized' | 'ready' = 'new';
for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  let id: string | number | null = null;
  let code = -32700;
  try {
    if (line.length > 1024 * 1024) throw new Error('MCP message exceeds 1 MiB.');
    const json: unknown = JSON.parse(line);
    code = -32600;
    const message = editorRpcSchema.parse(json);
    id = message.id ?? null;
    if (message.method === 'notifications/initialized') {
      state = state === 'new' ? 'new' : 'ready';
      continue;
    }
    if (message.id === undefined) continue;
    let result: unknown;
    if (message.method === 'initialize') {
      const response = await fetch(`${origin.origin}/api/v1/editor/connections`, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Local editor backend is unavailable.');
      connection = editorConnectionSchema.parse(await response.json());
      process.stderr.write(
        `TriCo MCP request ${connection.id.slice(0, 8)}: sign in, open ${origin.origin}/?editorConnection=${connection.id}, enter edit mode, and approve local MCP.\n`,
      );
      state = 'initialized';
      result = {
        protocolVersion: '2025-11-25',
        capabilities: { tools: {} },
        serverInfo: { name: 'trico-local-editor', version: '1.0.0' },
      };
    } else {
      code = -32002;
      if (state !== 'ready') throw new Error('Initialize this MCP connection first.');
      if (message.method === 'ping') result = {};
      else if (message.method === 'tools/list')
        result = {
          tools: [
            {
              name: 'trico_editor',
              description:
                'Inspect page contracts, read/validate/save complete drafts at expected revisions, list or upload managed media, and get preview paths. Cannot publish or deploy.',
              inputSchema: editorCommandSchema.toJSONSchema(),
              annotations: { destructiveHint: false, readOnlyHint: false, openWorldHint: false },
            },
          ],
        };
      else if (message.method === 'tools/call') {
        code = -32602;
        if (message.params?.['name'] !== 'trico_editor' || !connection?.secret)
          throw new Error('Unknown editor tool.');
        try {
          const approval = editorConnectionSchema.parse(
            await api(`connections/${connection.id}`, 'GET', undefined, connection.secret),
          );
          if (!approval.approved)
            throw new Error(
              'Approve the matching local MCP request in your signed-in browser first.',
            );
          const response = editorResultSchema.parse(
            await api(
              'tools',
              'POST',
              editorCommandSchema.parse(message.params['arguments']),
              `${connection.id}.${connection.secret}`,
            ),
          );
          result = { content: [{ type: 'text', text: JSON.stringify(response.result ?? null) }] };
        } catch (error) {
          result = {
            isError: true,
            content: [
              {
                type: 'text',
                text: error instanceof Error ? error.message : 'Editor request failed.',
              },
            ],
          };
        }
      } else {
        code = -32601;
        throw new Error('Method not found.');
      }
    }
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
  } catch (error) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: { code, message: error instanceof Error ? error.message : 'Invalid MCP request.' },
      }) + '\n',
    );
  }
}
