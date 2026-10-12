// Task-board media must need sign-in: GET /media/* opens only with the bearer
// token or a short-lived signature from POST /media/sign, and only for objects
// directly under task-board/. GCS is a local fake (STORAGE_EMULATOR_HOST), and
// the database is never reached (only the service token is used).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const SERVICE_TOKEN = 'test-service-token';
const PNG = Buffer.from('fake-png-bytes');
const OBJECTS = {
  'task-board/1760000000000-abc123.png': PNG,
  'task-board/1760000000001-def456.png': PNG,
  'documents/1760000000002-passport.pdf': Buffer.from('private document'),
};

// The client checks downloads against x-goog-hash, as real GCS sends it.
function crc32c(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0x82f63b78 & -(crc & 1));
  }
  const out = Buffer.alloc(4);
  out.writeUInt32BE(~crc >>> 0);
  return out.toString('base64');
}

const gcsRequests = [];
const gcs = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://gcs');
  const match = url.pathname.match(/\/b\/[^/]+\/o\/(.+)$/);
  const name = match && decodeURIComponent(match[1]);
  gcsRequests.push(name);
  if (!name || !OBJECTS[name]) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: { code: 404, message: 'No such object' } }));
  }
  if (url.searchParams.get('alt') === 'media') {
    res.writeHead(200, { 'Content-Type': 'image/png', 'x-goog-hash': `crc32c=${crc32c(OBJECTS[name])}` });
    return res.end(OBJECTS[name]);
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ name, contentType: 'image/png' }));
});

let app;
let base;
let media;

before(async () => {
  await new Promise((resolve) => gcs.listen(0, '127.0.0.1', resolve));
  process.env.STORAGE_EMULATOR_HOST = `http://127.0.0.1:${gcs.address().port}`;
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.AIRM_SERVICE_TOKEN = SERVICE_TOKEN;
  process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/none';

  const { default: express } = await import('express');
  const { default: router } = await import('../features/fjt-board/routes/fjtRoutes.js');
  media = await import('../features/fjt-board/services/mediaAccess.js');

  const server = express();
  server.use(express.json());
  server.use('/api/fjt-board', router);
  server.use('/api/fjt', router);
  app = await new Promise((resolve) => {
    const s = server.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${app.address().port}`;
});

after(() => {
  app?.close();
  gcs.close();
});

// Raw http so paths like /../ reach the server unnormalised.
function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(`${base}${path}`, { headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

const asService = { Authorization: `Bearer ${SERVICE_TOKEN}` };

async function sign(names, headers = asService) {
  const resp = await fetch(`${base}/api/fjt-board/media/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ names }),
  });
  return { status: resp.status, body: await resp.json() };
}

test('media without sign-in is refused on both mounts, before GCS is asked', async () => {
  gcsRequests.length = 0;
  for (const prefix of ['/api/fjt', '/api/fjt-board']) {
    const res = await get(`${prefix}/media/task-board/1760000000000-abc123.png`);
    assert.equal(res.status, 401);
    assert.notDeepEqual(res.body, PNG);
  }
  assert.equal((await get('/api/fjt/media/task-board/1760000000000-abc123.png', { Authorization: 'Bearer nope' })).status, 401);
  assert.deepEqual(gcsRequests, []);
});

test('the bearer token streams the image with a private cache header', async () => {
  const res = await get('/api/fjt/media/task-board/1760000000000-abc123.png', asService);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, PNG);
  assert.equal(res.headers['content-type'], 'image/png');
  assert.equal(res.headers['cache-control'], 'private, max-age=86400');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
});

test('a signed link opens its own object without a token, and nothing else', async () => {
  const name = 'task-board/1760000000000-abc123.png';
  const { status, body } = await sign([name]);
  assert.equal(status, 200);
  const { exp, sig } = body.data[name];
  const qs = `?exp=${exp}&sig=${encodeURIComponent(sig)}`;

  const ok = await get(`/api/fjt-board/media/${name}${qs}`);
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body, PNG);
  assert.equal(ok.headers['cache-control'], 'private, max-age=86400');

  assert.equal((await get(`/api/fjt-board/media/task-board/1760000000001-def456.png${qs}`)).status, 401);
  assert.equal((await get(`/api/fjt-board/media/${name}?exp=${exp + 3600}&sig=${encodeURIComponent(sig)}`)).status, 401);
  assert.equal((await get(`/api/fjt-board/media/${name}?exp=${exp}&sig=${encodeURIComponent(sig.slice(0, -2))}AA`)).status, 401);
  assert.equal((await get(`/api/fjt-board/media/${name}?exp=${exp}&sig=${encodeURIComponent(sig)}&sig=x`)).status, 401);
});

test('an expired signature is refused', async () => {
  const name = 'task-board/1760000000000-abc123.png';
  const { exp, sig } = media.signMediaName(name, Date.now() - 3 * 60 * 60 * 1000);
  assert.ok(exp * 1000 < Date.now());
  assert.equal((await get(`/api/fjt/media/${name}?exp=${exp}&sig=${encodeURIComponent(sig)}`)).status, 401);
});

test('only objects directly under task-board/ are served, even when signed in', async () => {
  gcsRequests.length = 0;
  for (const path of [
    'documents/1760000000002-passport.pdf',
    'task-board/../documents/1760000000002-passport.pdf',
    'task-board/%2e%2e%2fdocuments%2f1760000000002-passport.pdf',
    'task-board/..%2fdocuments/1760000000002-passport.pdf',
    'task-board/nested/1760000000000-abc123.png',
    'task-board/',
    'https://storage.googleapis.com/pulse-documents-lad-bucket/documents/1760000000002-passport.pdf',
  ]) {
    const res = await get(`/api/fjt/media/${path}`, asService);
    assert.equal(res.status, 404, path);
  }
  assert.deepEqual(gcsRequests, []);
});

test('/media/sign needs sign-in and only signs task-board names', async () => {
  assert.equal((await sign(['task-board/1760000000000-abc123.png'], {})).status, 401);

  const { status, body } = await sign([
    'task-board/1760000000000-abc123.png',
    'documents/1760000000002-passport.pdf',
    'task-board/../documents/1760000000002-passport.pdf',
    { not: 'a string' },
  ]);
  assert.equal(status, 200);
  assert.deepEqual(Object.keys(body.data), ['task-board/1760000000000-abc123.png']);
});

test('taskBoardObjectName accepts upload names and rejects everything else', () => {
  assert.equal(media.taskBoardObjectName('task-board/1760000000000-k3j2h1.png'), 'task-board/1760000000000-k3j2h1.png');
  assert.equal(media.taskBoardObjectName('/task-board/1760000000000-k3j2h1.PDF'), 'task-board/1760000000000-k3j2h1.PDF');
  for (const bad of [undefined, '', 'task-board', 'task-board/', 'task-board/.', 'task-board/..', 'task-board/a/b.png',
    'task-board/a\\..\\b.png', 'task-board/.hidden', 'task-board/a\nb.png', 'documents/a.pdf', 'Task-Board/a.png']) {
    assert.equal(media.taskBoardObjectName(bad), null, String(bad));
  }
});

test('signatures expire within two hours and stay stable inside the hour', () => {
  const name = 'task-board/1760000000000-abc123.png';
  const now = Date.UTC(2026, 9, 12, 10, 5);
  const a = media.signMediaName(name, now);
  const b = media.signMediaName(name, now + 50 * 60 * 1000);
  assert.deepEqual(a, b);
  assert.ok(a.exp * 1000 > now + 60 * 60 * 1000 && a.exp * 1000 <= now + 2 * 60 * 60 * 1000);
  assert.equal(media.verifyMediaSignature(name, a.exp, a.sig, now), true);
  assert.equal(media.verifyMediaSignature(name, String(a.exp), a.sig, now), true);
  assert.equal(media.verifyMediaSignature(name, a.exp, a.sig, a.exp * 1000), false);
  assert.equal(media.verifyMediaSignature(null, a.exp, a.sig, now), false);
  assert.equal(media.verifyMediaSignature(name, 'abc', a.sig, now), false);
});
