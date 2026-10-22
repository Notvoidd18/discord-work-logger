import { Client, ActivityType, ApplicationCommandOptionType } from 'discord.js';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export async function handleReady(client: Client): Promise<void> {
  logger.info(`Bot logged in successfully as ${client.user?.tag} (ID: ${client.user?.id})`);

  // Set activity: Playing Workin (no custom status text)
  client.user?.setPresence({
    status: 'online',
    activities: [
      {
        name: 'Workin ',
        type: ActivityType.Playing,
      },
    ],
  });

  // Register Slash Commands globally so /listlog and /log work natively
  try {
    if (client.application) {
      await client.application.commands.set([
        {
          name: 'listlog',
          description: 'View all staff work logs in one-click format',
        },
        {
          name: 'log',
          description: 'Record a staff work log entry',
          options: [
            {
              name: 'description',
              description: 'The work log description',
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
      ]);
      logger.info('Registered slash commands (/listlog, /log) successfully.');
    }
  } catch (err) {
    logger.error('Failed to register slash commands:', err);
  }

  logger.info(`Serving ${client.guilds.cache.size} guild(s). Command prefix: "${config.commandPrefix}"`);
}
