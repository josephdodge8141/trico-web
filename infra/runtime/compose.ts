const ALLOWED_SERVICE_FIELDS = new Set([
  'build',
  'command',
  'depends_on',
  'entrypoint',
  'environment',
  'healthcheck',
  'image',
  'networks',
  'ports',
  'restart',
  'user',
  'volumes',
  'working_dir',
]);

const REJECTED_SERVICE_FIELDS = new Set([
  'cap_add',
  'cap_drop',
  'devices',
  'ipc',
  'network_mode',
  'pid',
  'privileged',
  'security_opt',
]);

export interface PreviewService {
  readonly name: string;
  readonly role: 'router' | 'frontend' | 'backend' | 'dependency' | 'one-shot';
  readonly image: string | null;
  readonly command: readonly string[] | null;
  readonly environmentKeys: readonly string[];
}

export interface PreviewCompose {
  readonly cpu: number;
  readonly memoryMiB: number;
  readonly services: readonly PreviewService[];
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${path}: expected an object`);
  }
  return value as Record<string, unknown>;
}

function serviceRole(
  name: string,
  extension: Record<string, unknown>,
  service: Record<string, unknown>,
): PreviewService['role'] {
  if (name === extension.router) return 'router';
  if (name === extension.frontend) return 'frontend';
  if (name === extension.backend) return 'backend';
  return service.restart === 'no' ? 'one-shot' : 'dependency';
}

export function compileNormalizedCompose(value: unknown): PreviewCompose {
  const document = asRecord(value, 'compose');
  const extension = asRecord(document['x-preview'], 'compose.x-preview');
  if (extension.version !== 1) throw new TypeError('compose.x-preview.version: expected 1');
  const task = asRecord(extension.task, 'compose.x-preview.task');
  const cpu = task.cpu;
  const memoryMiB = task.memoryMiB;
  if (typeof cpu !== 'number' || ![256, 512, 1024, 2048, 4096].includes(cpu)) {
    throw new TypeError('compose.x-preview.task.cpu: unsupported Fargate CPU');
  }
  if (typeof memoryMiB !== 'number' || memoryMiB < 512 || memoryMiB > 30_720) {
    throw new TypeError('compose.x-preview.task.memoryMiB: outside bounded Fargate memory');
  }

  const services = asRecord(document.services, 'compose.services');
  const requiredRoles = ['router', 'frontend', 'backend'] as const;
  for (const role of requiredRoles) {
    const serviceName = extension[role];
    if (typeof serviceName !== 'string' || !(serviceName in services)) {
      throw new TypeError(`compose.x-preview.${role}: must name a service`);
    }
  }

  const compiled = Object.entries(services).map(([name, raw]) => {
    const service = asRecord(raw, `compose.services.${name}`);
    for (const field of Object.keys(service)) {
      if (REJECTED_SERVICE_FIELDS.has(field) || !ALLOWED_SERVICE_FIELDS.has(field)) {
        throw new TypeError(`compose.services.${name}.${field}: unsupported preview field`);
      }
    }
    const ports = service.ports;
    if (ports !== undefined && name !== extension.router) {
      throw new TypeError(`compose.services.${name}.ports: only the router may publish ports`);
    }
    const volumes = Array.isArray(service.volumes) ? service.volumes : [];
    if (volumes.some((mount) => typeof mount === 'string' && mount.startsWith('/'))) {
      throw new TypeError(`compose.services.${name}.volumes: host bind mounts are unsupported`);
    }
    const environment = asRecord(service.environment ?? {}, `compose.services.${name}.environment`);
    const command = Array.isArray(service.command)
      ? service.command.map((part, index) => {
          if (typeof part !== 'string') {
            throw new TypeError(
              `compose.services.${name}.command.${String(index)}: expected string`,
            );
          }
          return part;
        })
      : null;
    return {
      name,
      role: serviceRole(name, extension, service),
      image: typeof service.image === 'string' ? service.image : null,
      command,
      environmentKeys: Object.keys(environment).sort(),
    } satisfies PreviewService;
  });

  return { cpu, memoryMiB, services: compiled };
}
