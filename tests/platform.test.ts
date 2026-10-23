import assert from 'node:assert';
import test from 'node:test';
import { registry } from '../src/commands/registry';
import { getSlashCommandsForBot, officialSlashCommands } from '../src/commands/slashDefinitions';
import { resolveBotToken } from '../src/config/env';
import { botManager } from '../src/platform/botManager';
import { dashboardService } from '../src/platform/dashboardService';
import {
  DEFAULT_BRAND_WATERMARK,
  createWorkLogSavedEmbed,
  createLogListEmbed,
} from '../src/utils/embed';
import { formatLogId } from '../src/types/workLog';

test('1. Official Commands Only: Both bots have log, listlog, channellog and NO extra commands', () => {
  // Main bot must have exactly the 3 official commands
  assert.ok(registry.getForBot('main', 'log'), 'Main bot must have !log');
  assert.ok(registry.getForBot('main', 'listlog'), 'Main bot must have !listlog');
  assert.ok(registry.getForBot('main', 'channellog'), 'Main bot must have !channellog');

  // Bot A must have exactly the 3 official commands
  assert.ok(registry.getForBot('bot_a', 'log'), 'Bot A must have !log');
  assert.ok(registry.getForBot('bot_a', 'listlog'), 'Bot A must have !listlog');
  assert.ok(registry.getForBot('bot_a', 'channellog'), 'Bot A must have !channellog');

  // Verify total registered commands in platform is exactly 3 (no extra unwanted commands)
  const allCommands = registry.getAll();
  const commandNames = allCommands.map((c) => c.name).sort();
  assert.deepStrictEqual(
    commandNames,
    ['channellog', 'listlog', 'log'],
    'Only the 3 requested official commands must exist in the platform'
  );
});

test('2. Slash Command Scoping: Official slash commands assigned to main and bot_a', () => {
  const mainSlash = getSlashCommandsForBot('main') as any[];
  const botASlash = getSlashCommandsForBot('bot_a') as any[];

  const mainNames = mainSlash.map((c) => c.name).sort();
  const botANames = botASlash.map((c) => c.name).sort();

  assert.deepStrictEqual(mainNames, ['channellog', 'listlog', 'log']);
  assert.deepStrictEqual(botANames, ['channellog', 'listlog', 'log']);
});

test('3. Statuses: Main bot is "Hosting on Ongrywolf" and Bot A is "Hosting on Ongrywolf PRV"', () => {
  const mainBot = botManager.getBot('main');
  const botA = botManager.getBot('bot_a');

  assert.ok(mainBot, 'Main bot must be registered in manager');
  assert.ok(botA, 'Bot A must be registered in manager');

  assert.strictEqual(
    mainBot.getStatusText(),
    'Hosting on Ongrywolf',
    'Main bot status must be "Hosting on Ongrywolf"'
  );
  assert.strictEqual(
    botA.getStatusText(),
    'Hosting on Ongrywolf PRV',
    'Bot A status must be "Hosting on Ongrywolf PRV"'
  );
});

test('4. Token Resolution: BOT_TOKEN_MAIN (with DISCORD_TOKEN fallback) and BOT_TOKEN_A', () => {
  const originalEnv = { ...process.env };

  try {
    // Scenario A: Render fallback with DISCORD_TOKEN
    delete process.env.BOT_TOKEN_MAIN;
    process.env.DISCORD_TOKEN = 'mock-legacy-token';
    const legacyRes = resolveBotToken('BOT_TOKEN_MAIN', 'DISCORD_TOKEN');
    assert.strictEqual(legacyRes.token, 'mock-legacy-token');
    assert.strictEqual(legacyRes.sourceVar, 'DISCORD_TOKEN');

    // Scenario B: Explicit BOT_TOKEN_MAIN
    process.env.BOT_TOKEN_MAIN = 'mock-main-token';
    const mainRes = resolveBotToken('BOT_TOKEN_MAIN', 'DISCORD_TOKEN');
    assert.strictEqual(mainRes.token, 'mock-main-token');
    assert.strictEqual(mainRes.sourceVar, 'BOT_TOKEN_MAIN');

    // Scenario C: BOT_TOKEN_A
    process.env.BOT_TOKEN_A = 'mock-bot-a-token';
    const botARes = resolveBotToken('BOT_TOKEN_A');
    assert.strictEqual(botARes.token, 'mock-bot-a-token');
    assert.strictEqual(botARes.sourceVar, 'BOT_TOKEN_A');
  } finally {
    process.env = originalEnv;
  }
});

test('5. Branding Watermark & Formatting across embeds', () => {
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

  const listEmbed = createLogListEmbed([mockWorkLog], 1);
  assert.ok(
    listEmbed.data.footer?.text.includes('Hosting on Ongrywolf'),
    'List embed must contain Ongrywolf branding watermark'
  );

  assert.strictEqual(formatLogId(1), '#0001');
});

test('6. Bot Instances are Isolated and Independent', () => {
  const mainBot = botManager.getBot('main');
  const botA = botManager.getBot('bot_a');

  assert.ok(mainBot, 'Main bot must exist');
  assert.ok(botA, 'Bot A must exist');
  assert.notStrictEqual(mainBot, botA, 'Bot instances must be separate objects');
  assert.notStrictEqual(mainBot.client, botA.client, 'Bot clients must be completely isolated');
});

test('7. Missing Token Safety: Unconfigured bots produce safe offline status without crashing', async () => {
  const botA = botManager.getBot('bot_a')!;
  await botA.start();
  const status = botA.getRuntimeStatus();
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
