// Mr LAD shows this board to its own signed-in people and calls Pulse with the
// service token. X-Acting-User-Email makes such a request run AS that Pulse
// user, so comments and reporters name the person, not "Service". Only the
// service token may assert an identity; an unknown or ambiguous email is
// refused. The database is a stub: pool.query answers from USERS.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const SERVICE_TOKEN = 'test-service-token';
const RAVI = { id: '11111111-1111-1111-1111-111111111111', email: 'ravi@techiemaya.com', full_name: 'Ravi Kumar' };
const DUP = 'dup@techiemaya.com';

let USERS;
let dbDown;
let app;
let base;
let server;
let calls;
let jwt;
let FjtService;

before(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.AIRM_SERVICE_TOKEN = SERVICE_TOKEN;
  process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/none';

  const { default: pool } = await import('../shared/database/connection.js');
  pool.query = async (sql, params = []) => {
    if (dbDown) throw new Error('db down');
    if (/WHERE LOWER\(email\) = \$1/.test(sql)) {
      return { rows: USERS.filter((u) => u.email.toLowerCase() === params[0]) };
    }
    if (/WHERE id = \$1/.test(sql)) return { rows: USERS.filter((u) => u.id === params[0]) };
    return { rows: [] };
  };

  ({ FjtService } = await import('../features/fjt-board/services/fjtService.js'));
  FjtService.createIssue = async (schema, body) => { calls.push(['createIssue', body]); return { id: 'i1', ...body }; };
  FjtService.addComment = async (schema, id, comment) => { calls.push(['addComment', comment]); return { comment }; };
  FjtService.deleteIssue = async () => { calls.push(['deleteIssue']); return true; };

  jwt = (await import('jsonwebtoken')).default;
  const { default: express } = await import('express');
  const { default: router } = await import('../features/fjt-board/routes/fjtRoutes.js');
  const { authenticateUserOrService } = await import('../middleware/auth.js');
  app = express();
  app.use(express.json());
  app.get('/whoami', authenticateUserOrService, (req, res) => res.json(req.user));
  app.use('/api/fjt', router);
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  USERS = [RAVI, { id: 'a', email: DUP, full_name: 'A' }, { id: 'b', email: DUP.toUpperCase(), full_name: 'B' }];
  dbDown = false;
  calls = [];
});

const svc = (extra = {}) => ({ Authorization: `Bearer ${SERVICE_TOKEN}`, 'Content-Type': 'application/json', ...extra });
const userJwt = (id) => ({ Authorization: `Bearer ${jwt.sign({ userId: id }, 'test-jwt-secret')}`, 'Content-Type': 'application/json' });

test('the service token acting for a known email runs as that user', async () => {
  const r = await fetch(`${base}/whoami`, { headers: svc({ 'X-Acting-User-Email': ' Ravi@TechieMaya.com ' }) });
  assert.equal(r.status, 200);
  const me = await r.json();
  assert.equal(me.id, RAVI.id);
  assert.equal(me.full_name, 'Ravi Kumar');
  assert.equal(me.service, undefined);
});

test('an unknown or ambiguous acting email is refused, never guessed', async () => {
  for (const email of ['nobody@techiemaya.com', DUP]) {
    const r = await fetch(`${base}/whoami`, { headers: svc({ 'X-Acting-User-Email': email }) });
    assert.equal(r.status, 403, email);
  }
});

test('a database failure while resolving the acting user is a 503, not the service identity', async () => {
  dbDown = true;
  const r = await fetch(`${base}/whoami`, { headers: svc({ 'X-Acting-User-Email': RAVI.email }) });
  assert.equal(r.status, 503);
});

test('without the header the service token is still the service', async () => {
  const me = await (await fetch(`${base}/whoami`, { headers: svc() })).json();
  assert.equal(me.service, true);
  assert.equal(me.id, null);
});

test('a user JWT cannot assert another identity with the header', async () => {
  const other = { id: '22222222-2222-2222-2222-222222222222', email: 'sana@techiemaya.com', full_name: 'Sana' };
  USERS.push(other);
  const r = await fetch(`${base}/whoami`, { headers: { ...userJwt(other.id), 'X-Acting-User-Email': RAVI.email } });
  const me = await r.json();
  assert.equal(me.id, other.id);
});

test('user lookup is service-only and resolves exactly one user', async () => {
  let r = await fetch(`${base}/api/fjt/users/lookup?email=ravi@techiemaya.com`, { headers: svc() });
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).data, { id: RAVI.id, email: RAVI.email, fullName: 'Ravi Kumar' });

  r = await fetch(`${base}/api/fjt/users/lookup?email=${DUP}`, { headers: svc() });
  assert.equal(r.status, 404);

  r = await fetch(`${base}/api/fjt/users/lookup?email=ravi@techiemaya.com`, { headers: userJwt(RAVI.id) });
  assert.equal(r.status, 403);

  r = await fetch(`${base}/api/fjt/users/lookup?email=ravi@techiemaya.com`, { headers: svc({ 'X-Acting-User-Email': RAVI.email }) });
  assert.equal(r.status, 403, 'acting as a person is not the service');
});

test('creating an issue for a user makes them the reporter; the service alone may create too', async () => {
  let r = await fetch(`${base}/api/fjt/issues`, {
    method: 'POST', headers: svc({ 'X-Acting-User-Email': RAVI.email }), body: JSON.stringify({ summary: 'From Mr LAD' }),
  });
  assert.equal(r.status, 201);
  assert.equal(calls[0][1].reporterId, RAVI.id);

  r = await fetch(`${base}/api/fjt/issues`, { method: 'POST', headers: svc(), body: JSON.stringify({ summary: 'Agent task' }) });
  assert.equal(r.status, 201);
  assert.equal(calls[1][1].reporterId, undefined);
});

test('a comment made for a user carries their name and email', async () => {
  const r = await fetch(`${base}/api/fjt/issues/33333333-3333-3333-3333-333333333333/comments`, {
    method: 'POST', headers: svc({ 'X-Acting-User-Email': RAVI.email }), body: JSON.stringify({ content: 'Done', authorName: 'Spoofed' }),
  });
  assert.equal(r.status, 201);
  assert.equal(calls[0][1].authorName, 'Ravi Kumar');
  assert.equal(calls[0][1].authorEmail, RAVI.email);
});

test('deleting needs a person: the bare service token is refused', async () => {
  const id = '33333333-3333-3333-3333-333333333333';
  let r = await fetch(`${base}/api/fjt/issues/${id}`, { method: 'DELETE', headers: svc() });
  assert.equal(r.status, 403);
  r = await fetch(`${base}/api/fjt/issues/${id}`, { method: 'DELETE', headers: svc({ 'X-Acting-User-Email': RAVI.email }) });
  assert.notEqual(r.status, 403);
});
