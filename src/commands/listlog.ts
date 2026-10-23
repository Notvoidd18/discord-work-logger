import { Command, CommandContext } from './types';
import { workLogRepository } from '../database/repositories/workLogRepository';
import { createLogListEmbed, createErrorEmbed } from '../utils/embed';
import { logger } from '../utils/logger';

export const listLogCommand: Command = {
  name: 'listlog',
  description: 'Displays all staff work logs in one-click format',
  usage: '!listlog',
  aliases: ['logs', 'listlogs'],
  adminOrStaffOnly: true,
  targetBotIds: ['manager'],
  execute: async ({ message, watermark }: CommandContext): Promise<void> => {
    if (!message.guild) {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Server Only',
            'Work logs can only be viewed within a Discord server channel.',
            watermark
          ),
        ],
      });
      return;
    }

    try {
      const [logs, totalCount] = await Promise.all([
        workLogRepository.getRecentLogs(message.guild.id, 50),
        workLogRepository.getTotalLogCount(message.guild.id),
      ]);

      const embed = createLogListEmbed(logs, totalCount, watermark);
      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.forBot('manager').error('Failed to retrieve work logs:', error);
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Database Error',
            'Failed to retrieve work logs from the database. Please try again later.',
            watermark
          ),
        ],
      });
    }
  },
};
