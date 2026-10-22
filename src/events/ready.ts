import { Client, ActivityType } from 'discord.js';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { slashCommands } from '../commands/slashDefinitions';

export async function handleReady(client: Client): Promise<void> {
  logger.info(`Bot logged in successfully as ${client.user?.tag} (ID: ${client.user?.id})`);

  // 1. Set presence: Playing Workin (clean online status, no custom status)
  client.user?.setPresence({
    status: 'online',
    activities: [
      {
        name: 'Workin ',
        type: ActivityType.Playing,
      },
    ],
  });

  // 2. Register Slash Commands
  // Register per-guild FIRST so they appear INSTANTLY in the Discord client (0 delay)
  const guilds = await client.guilds.fetch();
  for (const [guildId, oauthGuild] of guilds) {
    try {
      const fullGuild = await oauthGuild.fetch();
      await fullGuild.commands.set(slashCommands);
      logger.info(`Instant slash command registration succeeded for guild "${fullGuild.name}" (${guildId})`);
    } catch (guildErr) {
      logger.warn(`Could not set guild slash commands for "${oauthGuild.name}" (${guildId}):`, guildErr);
    }
  }

  // Also register globally for long-term sync
  try {
    if (client.application) {
      await client.application.commands.set(slashCommands);
      logger.info('Global slash commands registered successfully.');
    }
  } catch (err) {
    logger.error('Failed to register global slash commands:', err);
  }

  logger.info(`Serving ${guilds.size} guild(s). Command prefix: "${config.commandPrefix}"`);
}
