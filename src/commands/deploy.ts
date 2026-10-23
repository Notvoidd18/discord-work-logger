import { REST, Routes } from 'discord.js';
import { resolveBotToken, resolveBotClientId } from '../config/env';
import { logger } from '../utils/logger';
import { getSlashCommandsForBot } from './slashDefinitions';

async function deployForBot(botId: string, tokenVar: string, fallbackTokenVar?: string, clientVar?: string, fallbackClientVar?: string) {
  const { token, sourceVar } = resolveBotToken(tokenVar, fallbackTokenVar);
  const clientId = resolveBotClientId(clientVar, fallbackClientVar);

  if (!token) {
    logger.warn(`Skipping slash deployment for "${botId}": token not found in ${tokenVar}`);
    return;
  }

  if (!clientId) {
    logger.warn(`Skipping slash deployment for "${botId}": client ID not found in ${clientVar || 'environment'}`);
    return;
  }

  const commands = getSlashCommandsForBot(botId);
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    logger.info(`Deploying ${commands.length} slash commands for bot "${botId}" (using ${sourceVar})...`);
    const data = (await rest.put(Routes.applicationCommands(clientId), { body: commands })) as unknown[];
    logger.info(`Successfully deployed ${data.length} slash commands for bot "${botId}".`);
  } catch (error) {
    logger.error(`Failed to deploy commands for bot "${botId}":`, error);
  }
}

async function main() {
  const targetBot = process.argv[2]?.toLowerCase();

  // 1. Bot Main (Official Bot)
  if (!targetBot || targetBot === 'main') {
    await deployForBot('main', 'BOT_TOKEN_MAIN', 'DISCORD_TOKEN', 'BOT_CLIENT_ID_MAIN', 'DISCORD_CLIENT_ID');
  }

  // 2. Bot A
  if (!targetBot || targetBot === 'bot_a' || targetBot === 'a') {
    await deployForBot('bot_a', 'BOT_TOKEN_A', undefined, 'BOT_CLIENT_ID_A', undefined);
  }
}

main().catch((err) => {
  logger.error('Deployment error:', err);
  process.exit(1);
});
