// GET /board?view=cards is the board without the heavy columns: no description
// text and, of raw_data (every comment and edit), only the assignees. Mr LAD's
// Projects board asks for it and fetches one issue in full when it is opened.
// The plain /board is unchanged for Pulse's own board. The database is a stub
// that records the SQL; the SQL itself was checked against a real Postgres.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const SERVICE_TOKEN = 'test-service-token';
let sql;
let base;
let server;

before(async () => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.AIRM_SERVICE_TOKEN = SERVICE_TOKEN;
  process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/none';

  const { default: pool } = await import('../shared/database/connection.js');
  pool.query = async (text) => {
    sql.push(text);
    if (/FROM \S+\.fjt_issues i/.test(text)) {
      return {
        rows: [/NULL::text as description/.test(text)
          ? { id: 'i1', key: 'K-1', description: null, has_description: true, comment_count: 3, raw_data: {} }
          : { id: 'i1', key: 'K-1', description: 'Long text', raw_data: { comments: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }] } }],
      };
    }
    return { rows: [] };
  };

  const { default: express } = await import('express');
  const { default: router } = await import('../features/fjt-board/routes/fjtRoutes.js');
  const app = express();
  app.use('/api/fjt', router);
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));
beforeEach(() => { sql = []; });

const board = async (q = '') => {
  const r = await fetch(`${base}/api/fjt/board${q}`, { headers: { Authorization: `Bearer ${SERVICE_TOKEN}` } });
  assert.equal(r.status, 200);
  return (await r.json()).data.issues[0];
};
const issueSql = () => sql.find((s) => /FROM \S+\.fjt_issues i/.test(s));

test('the cards view leaves out the description and raw_data, and says what it left out', async () => {
  const card = await board('?view=cards');
  const q = issueSql();
  assert.match(q, /NULL::text as description/);
  assert.doesNotMatch(q, /\bi\.description,/);
  assert.doesNotMatch(q, /\bi\.raw_data,/);
  assert.match(q, /jsonb_build_object\('assignees', i\.raw_data->'assignees'\)/);
  assert.equal(card.description, null);
  assert.deepEqual(card.comments, []);
  assert.equal(card.hasDescription, true);
  assert.equal(card.commentCount, 3);
  assert.equal(card.descriptionSaved, true);
});

test('the plain board is unchanged: full description and comments, no card-only fields', async () => {
  const issue = await board();
  assert.match(issueSql(), /\bi\.description,/);
  assert.match(issueSql(), /\bi\.raw_data,/);
  assert.equal(issue.description, 'Long text');
  assert.equal(issue.comments.length, 3);
  assert.equal('commentCount' in issue, false);
  assert.equal('hasDescription' in issue, false);
});

test('any other view value is the plain board', async () => {
  await board('?view=everything');
  assert.match(issueSql(), /\bi\.raw_data,/);
});
