import { Client, ActivityType } from 'discord.js';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export function handleReady(client: Client): void {
  logger.info(`Bot logged in successfully as ${client.user?.tag} (ID: ${client.user?.id})`);

  // Set initial bot activity
  client.user?.setPresence({
    status: 'online',
    activities: [
      {
        name: `${config.commandPrefix}log <work description>`,
        type: ActivityType.Watching,
      },
    ],
  });

  logger.info(`Serving ${client.guilds.cache.size} guild(s). Command prefix: "${config.commandPrefix}"`);
}
