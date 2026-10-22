import { REST, Routes } from 'discord.js';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { slashCommands } from './slashDefinitions';

async function deploy() {
  if (!config.discordClientId) {
    logger.error('DISCORD_CLIENT_ID must be set in your environment (.env) to run standalone deployment.');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(config.discordToken);

  try {
    logger.info(`Started refreshing ${slashCommands.length} official application (/) commands...`);

    const data = (await rest.put(
      Routes.applicationCommands(config.discordClientId),
      { body: slashCommands }
    )) as unknown[];

    logger.info(`Successfully reloaded ${data.length} official application (/) commands globally.`);
  } catch (error) {
    logger.error('Failed to deploy application commands via REST:', error);
    process.exit(1);
  }
}

deploy();
