import { Client, ActivityType } from 'discord.js';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { slashCommands } from '../commands/slashDefinitions';

export async function handleReady(client: Client): Promise<void> {
  logger.info(`Bot logged in successfully as ${client.user?.tag} (ID: ${client.user?.id})`);

  // 1. Set presence: "Hosting on Ongrywolf PRV"
  client.user?.setPresence({
    status: 'online',
    activities: [
      {
        name: 'Hosting on Ongrywolf PRV',
        type: ActivityType.Custom,
        state: 'Hosting on Ongrywolf PRV',
      },
    ],
  });

  // 2. Clear all guild-level commands to completely remove duplicate command entries
  // (Duplicates happen when Discord has the same command registered both globally AND per-guild)
  const guilds = await client.guilds.fetch();
  for (const [guildId, oauthGuild] of guilds) {
    try {
      const fullGuild = await oauthGuild.fetch();
      const existingGuildCommands = await fullGuild.commands.fetch();
      if (existingGuildCommands.size > 0) {
        await fullGuild.commands.set([]);
        logger.info(`Cleared ${existingGuildCommands.size} duplicate guild command(s) for "${fullGuild.name}" (${guildId})`);
      }
    } catch (guildErr) {
      logger.warn(`Could not clear guild commands for "${oauthGuild.name}":`, guildErr);
    }
  }

  // 3. Register official slash commands GLOBALLY ONLY (single source of truth, 0 duplicates)
  try {
    if (client.application) {
      await client.application.commands.set(slashCommands);
      logger.info(`Registered ${slashCommands.length} official slash commands globally (/log, /listlog, /channellog).`);
    }
  } catch (err) {
    logger.error('Failed to register global slash commands:', err);
  }

  logger.info(`Serving ${guilds.size} guild(s). Command prefix: "${config.commandPrefix}"`);
}
