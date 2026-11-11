export function freshRoutingCode(storeId: string): string {
  return `import cf from 'cloudfront';
const store = cf.kvs(${JSON.stringify(storeId)});
function reply(status, message) {
  return { statusCode: status, headers: {
    'content-type': { value: 'text/html; charset=utf-8' },
    'cache-control': { value: 'no-store' },
    'x-robots-tag': { value: 'noindex, nofollow' }
  }, body: '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TriCo</title><main><h1>' + message + '</h1><a href="/">Return to TriCo</a></main></html>' };
}

async function handler(event) {
  const request = event.request;
  if (request.method !== 'GET' && request.method !== 'HEAD') return reply(405, 'Method not allowed');
  if (/^\\/fresh-releases\\/[a-f0-9]{40}\\//.test(request.uri)) return request;
  if (request.uri !== '/index.html' && /\\.[a-z0-9]+$/i.test(request.uri) && request.uri !== '/deployment.json') return request;
  try {
    const active = await store.get('active');
    if (!/^[a-f0-9]{40}$/.test(active) || !await store.exists(active + ':/')) return reply(503, 'Please try again shortly');
    if (request.uri === '/deployment.json') {
      request.uri = '/fresh-releases/' + active + '/deployment.json';
      return request;
    }
    const uri = request.uri === '/index.html' ? '/' : (request.uri.replace(/\\/$/, '') || '/');
    if (!await store.exists(active + ':' + uri)) return reply(404, 'Page not found');
    let document = 'index.html';
    if (uri === '/' && await store.exists(active + ':home')) {
      if (await store.get(active + ':home') !== 'home.html') return reply(503, 'Please try again shortly');
      if (request.uri === '/index.html') return reply(404, 'Page not found');
      document = 'home.html';
    }
    request.uri = '/fresh-releases/' + active + '/' + document;
    return request;
  } catch (error) {
    return reply(503, 'Please try again shortly');
  }
}`;
}

export function freshApiViewerCode(): string {
  return `function handler(event) {
  const request = event.request;
  delete request.headers['x-trico-origin-proof'];
  delete request.headers['cloudfront-viewer-address'];
  delete request.headers['x-trico-viewer-ip'];
  if (!event.viewer || !event.viewer.ip) return {
    statusCode: 403,
    headers: { 'content-type': { value: 'application/json' }, 'cache-control': { value: 'no-store' } },
    body: '{"ok":false,"error":"Viewer identity unavailable."}'
  };
  request.headers['x-trico-viewer-ip'] = { value: event.viewer.ip };
  return request;
}`;
}
