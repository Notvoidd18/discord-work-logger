import assert from 'node:assert';
import test from 'node:test';
import { ActivityType } from 'discord.js';
import { registry } from '../src/commands/registry';
import { getSlashCommandsForBot } from '../src/commands/slashDefinitions';
import { resolveBotToken, resolveBotClientId } from '../src/config/env';
import { botManager } from '../src/platform/botManager';
import { dashboardService } from '../src/platform/dashboardService';
import {
  DEFAULT_BRAND_WATERMARK,
  createWorkLogSavedEmbed,
  createOrderSavedEmbed,
  createOrderStatusUpdatedEmbed,
  createOrderListEmbed,
  createLogListEmbed,
} from '../src/utils/embed';
import { formatLogId } from '../src/types/workLog';
import { formatOrderId } from '../src/types/order';

test('1. Command Segregation: Manager Bot receives only its assigned commands', () => {
  // Manager bot should have log, listlog, channellog
  assert.ok(registry.getForBot('manager', 'log'), 'Manager bot must have !log');
  assert.ok(registry.getForBot('manager', 'listlog'), 'Manager bot must have !listlog');
  assert.ok(registry.getForBot('manager', 'channellog'), 'Manager bot must have !channellog');

  // Manager bot must NOT have order commands
  assert.strictEqual(
    registry.getForBot('manager', 'order'),
    undefined,
    'Manager bot must NOT have !order'
  );
  assert.strictEqual(
    registry.getForBot('manager', 'orders'),
    undefined,
    'Manager bot must NOT have !orders'
  );
  assert.strictEqual(
    registry.getForBot('manager', 'orderstatus'),
    undefined,
    'Manager bot must NOT have !orderstatus'
  );
});

test('2. Command Segregation: Orders Bot receives only its assigned commands', () => {
  // Orders bot should have order, orders, orderstatus
  assert.ok(registry.getForBot('orders', 'order'), 'Orders bot must have !order');
  assert.ok(registry.getForBot('orders', 'orders'), 'Orders bot must have !orders');
  assert.ok(registry.getForBot('orders', 'orderstatus'), 'Orders bot must have !orderstatus');

  // Orders bot must NOT have manager/logging commands
  assert.strictEqual(
    registry.getForBot('orders', 'log'),
    undefined,
    'Orders bot must NOT have !log'
  );
  assert.strictEqual(
    registry.getForBot('orders', 'listlog'),
    undefined,
    'Orders bot must NOT have !listlog'
  );
  assert.strictEqual(
    registry.getForBot('orders', 'channellog'),
    undefined,
    'Orders bot must NOT have !channellog'
  );
});

test('3. Slash Command Scoping: Segregation per bot application', () => {
  const managerSlash = getSlashCommandsForBot('manager') as any[];
  const ordersSlash = getSlashCommandsForBot('orders') as any[];

  const managerNames = managerSlash.map((c) => c.name);
  const ordersNames = ordersSlash.map((c) => c.name);

  assert.deepStrictEqual(managerNames.sort(), ['channellog', 'listlog', 'log']);
  assert.deepStrictEqual(ordersNames.sort(), ['order', 'orders', 'orderstatus']);

  // Verify zero overlap
  const intersection = managerNames.filter((name) => ordersNames.includes(name));
  assert.strictEqual(intersection.length, 0, 'No slash command overlap between bots');
});

test('4. Token Resolution & Backward Compatibility', () => {
  const originalEnv = { ...process.env };

  try {
    // Scenario A: Legacy Render environment with only DISCORD_TOKEN
    delete process.env.BOT_MANAGER_TOKEN;
    process.env.DISCORD_TOKEN = 'mock-legacy-token';
    const legacyRes = resolveBotToken('BOT_MANAGER_TOKEN', 'DISCORD_TOKEN');
    assert.strictEqual(legacyRes.token, 'mock-legacy-token');
    assert.strictEqual(legacyRes.sourceVar, 'DISCORD_TOKEN');

    // Scenario B: Explicit BOT_MANAGER_TOKEN
    process.env.BOT_MANAGER_TOKEN = 'mock-manager-token';
    const explicitRes = resolveBotToken('BOT_MANAGER_TOKEN', 'DISCORD_TOKEN');
    assert.strictEqual(explicitRes.token, 'mock-manager-token');
    assert.strictEqual(explicitRes.sourceVar, 'BOT_MANAGER_TOKEN');

    // Scenario C: Missing token
    delete process.env.BOT_ORDERS_TOKEN;
    const missingRes = resolveBotToken('BOT_ORDERS_TOKEN');
    assert.strictEqual(missingRes.token, undefined);
    assert.strictEqual(missingRes.sourceVar, undefined);
  } finally {
    process.env = originalEnv;
  }
});

test('5. Branding Watermark & Formatting across all embeds', () => {
  assert.strictEqual(DEFAULT_BRAND_WATERMARK, 'Hosting on Ongrywolf');

  const mockWorkLog = {
    id: '1',
    guildId: '123',
    channelId: '456',
    userId: '789',
    username: 'testuser',
    description: 'Tested checkout',
    createdAt: new Date(),
  };

  const workEmbed = createWorkLogSavedEmbed(mockWorkLog);
  assert.ok(
    workEmbed.data.footer?.text.includes('Hosting on Ongrywolf'),
    'Work log embed must contain Ongrywolf branding watermark'
  );

  const mockOrder = {
    id: '1',
    guildId: '123',
    channelId: '456',
    userId: '789',
    username: 'buyer',
    itemDetails: 'Hosting setup',
    quantity: 1,
    status: 'PENDING' as const,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const orderEmbed = createOrderSavedEmbed(mockOrder);
  assert.ok(
    orderEmbed.data.footer?.text.includes('Hosting on Ongrywolf'),
    'Order embed must contain Ongrywolf branding watermark'
  );

  const orderListEmbed = createOrderListEmbed([mockOrder], 1);
  assert.ok(
    orderListEmbed.data.footer?.text.includes('Hosting on Ongrywolf'),
    'Order list embed must contain Ongrywolf branding watermark'
  );

  const statusEmbed = createOrderStatusUpdatedEmbed(mockOrder);
  assert.ok(
    statusEmbed.data.footer?.text.includes('Hosting on Ongrywolf'),
    'Order status update embed must contain Ongrywolf branding watermark'
  );

  assert.strictEqual(formatLogId(1), '#0001');
  assert.strictEqual(formatOrderId(1), '#ORD-0001');
});

test('6. Bot Instances are Isolated and Independent', () => {
  const managerBot = botManager.getBot('manager');
  const ordersBot = botManager.getBot('orders');

  assert.ok(managerBot, 'Manager bot must exist in BotManager');
  assert.ok(ordersBot, 'Orders bot must exist in BotManager');
  assert.notStrictEqual(managerBot, ordersBot, 'Bot instances must be separate objects');
  assert.notStrictEqual(managerBot.client, ordersBot.client, 'Bot clients must be completely isolated');
});

test('7. Missing Token Safety: Unconfigured bots produce safe offline status without crashing', async () => {
  const ordersBot = botManager.getBot('orders')!;
  // When token is absent, start() safely sets state to offline and logs without crashing
  await ordersBot.start();
  const status = ordersBot.getRuntimeStatus();
  assert.strictEqual(status.observedState, 'offline');
});

test('8. Security: Zero token leakage in telemetry or API responses', async () => {
  const bots = await dashboardService.listBots();
  for (const bot of bots) {
    const serialized = JSON.stringify(bot);
    assert.strictEqual(serialized.includes('token'), false, 'Token string must not appear in telemetry JSON');
    assert.strictEqual(serialized.includes('gho_'), false);
    assert.strictEqual(serialized.includes('postgres://'), false);
  }
});

test('9. Extensibility: Dynamic bot registration for future web dashboard', async () => {
  await dashboardService.registerNewBot({
    id: 'support',
    displayName: 'Ongrywolf Support',
    tokenEnvVar: 'BOT_SUPPORT_TOKEN',
    defaultPrefix: '!',
    defaultStatusText: 'Hosting on Ongrywolf',
    defaultStatusType: ActivityType.Custom,
    brandWatermark: 'Hosting on Ongrywolf',
    defaultCommands: [],
  });

  const supportBot = botManager.getBot('support');
  assert.ok(supportBot, 'Dynamically registered bot must exist in BotManager');
  assert.strictEqual(supportBot.displayName, 'Ongrywolf Support');
});
