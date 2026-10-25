import assert from 'node:assert';
import test from 'node:test';
import http from 'http';
import { createManagementServer } from '../src/api/managementServer';
import { botManager } from '../src/platform/botManager';

const TEST_API_KEY = process.env.BOT_HOST_API_KEY || 'ongrywolf_secret_host_key';
let server: http.Server;
let port: number;

function request(options: http.RequestOptions, body?: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        ...options,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch (_) {
            parsed = raw;
          }
          resolve({ statusCode: res.statusCode || 500, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

test('Management API Test Suite', async (t) => {
  // Start test server
  await new Promise<void>((resolve) => {
    server = createManagementServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      port = addr.port;
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  await t.test('1. Public health check /health responds 200 without auth', async () => {
    const res = await request({ path: '/health', method: 'GET' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.ok(typeof res.data.totalBots === 'number');
  });

  await t.test('2. Unauthenticated access to /api/managed-bots is rejected with 401', async () => {
    const res = await request({ path: '/api/managed-bots', method: 'GET' });
    assert.strictEqual(res.statusCode, 401);
    assert.ok(res.data.error.includes('Unauthorized'));
  });

  await t.test('3. Authenticated GET /api/managed-bots lists fleet', async () => {
    const res = await request({
      path: '/api/managed-bots',
      method: 'GET',
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.data.bots));
    assert.ok(res.data.bots.length >= 2);
  });

  const testBotId = 'test_mgmt_bot';
  const testSecretToken = 'MTEyMjMzNDQ1NS54eXpfdGVzdF90b2tlbg==';

  await t.test('4. POST /api/managed-bots registers a new bot with token and metadata', async () => {
    const res = await request(
      {
        path: '/api/managed-bots',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
      {
        id: testBotId,
        displayName: 'Test Remote Bot',
        applicationId: '1250267167065112616',
        token: testSecretToken,
        defaultPrefix: '!',
        defaultStatusText: 'Testing on Render 1',
        ownerAccount: 'notvoid18',
        enabledModules: ['work_logs'],
        desiredEnabled: false, // Don't try real gateway login with mock token in test
      }
    );

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.bot.id, testBotId);
    assert.strictEqual(res.data.bot.displayName, 'Test Remote Bot');
    // Ensure secrets are never leaked in response
    assert.strictEqual(res.data.bot.token, undefined);
  });

  await t.test('5. GET /api/managed-bots/:id returns single bot', async () => {
    const res = await request({
      path: `/api/managed-bots/${testBotId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.bot.id, testBotId);
    assert.strictEqual(res.data.bot.statusText, 'Testing on Render 1');
  });

  await t.test('6. PATCH /api/managed-bots/:id/config updates configuration', async () => {
    const res = await request(
      {
        path: `/api/managed-bots/${testBotId}/config`,
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
      {
        statusText: 'Updated Presence Text',
        prefix: '?',
      }
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.status.statusText, 'Updated Presence Text');
    assert.strictEqual(res.data.status.prefix, '?');
  });

  await t.test('7. GET /api/managed-bots/:id/logs returns sanitized logs without leaking token', async () => {
    const res = await request({
      path: `/api/managed-bots/${testBotId}/logs`,
      method: 'GET',
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.data.logs));

    // Verify raw secret token is never present in log text
    const stringifiedLogs = JSON.stringify(res.data.logs);
    assert.ok(!stringifiedLogs.includes(testSecretToken));
  });

  await t.test('8. DELETE /api/managed-bots/:id removes bot from hosting runtime', async () => {
    const res = await request({
      path: `/api/managed-bots/${testBotId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);

    // Verify it is gone
    const checkRes = await request({
      path: `/api/managed-bots/${testBotId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${TEST_API_KEY}` },
    });
    assert.strictEqual(checkRes.statusCode, 404);
  });
});
