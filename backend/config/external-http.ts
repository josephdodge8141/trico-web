import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const isPrivate = (address: string): boolean => {
  if (isIP(address) === 4) {
    const octets = address.split('.').map(Number);
    const first = octets[0] ?? 0;
    const second = octets[1] ?? 0;
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      first >= 224
    );
  }
  const normalized = address.toLowerCase();
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
};

export type ResolveAddresses = (
  hostname: string,
) => Promise<readonly { readonly address: string }[]>;

const systemResolve: ResolveAddresses = async (hostname) =>
  lookup(hostname, { all: true, verbatim: true });

const validateTarget = async (url: URL, resolveAddresses: ResolveAddresses): Promise<void> => {
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '')
    throw new Error('Only credential-free HTTPS source URLs are allowed');
  const addresses = await resolveAddresses(url.hostname);
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivate(address)))
    throw new Error('Source resolves to a private or unsafe network');
};

export function createBoundedPublicFetch(
  resolveAddresses: ResolveAddresses = systemResolve,
  fetchImpl: typeof fetch = fetch,
): (input: string) => Promise<string> {
  return async (input) => {
    let target = new URL(input);
    for (let redirect = 0; redirect <= 3; redirect += 1) {
      await validateTarget(target, resolveAddresses);
      const response = await fetchImpl(target, {
        redirect: 'manual',
        signal: AbortSignal.timeout(8_000),
        headers: { 'User-Agent': 'TriCoExternalSync/1.0', Accept: 'text/html,text/plain' },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location === null || redirect === 3) throw new Error('Unsafe or excessive redirect');
        target = new URL(location, target);
        continue;
      }
      if (!response.ok) throw new Error(`External source returned ${response.status}`);
      const declared = Number(response.headers.get('content-length') ?? '0');
      if (declared > 1_000_000) throw new Error('External source is too large');
      const text = await response.text();
      if (Buffer.byteLength(text, 'utf8') > 1_000_000)
        throw new Error('External source is too large');
      return text;
    }
    throw new Error('External source could not be fetched');
  };
}

export const boundedPublicFetch = createBoundedPublicFetch();
