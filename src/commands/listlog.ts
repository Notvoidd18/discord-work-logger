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
  execute: async ({ message }: CommandContext): Promise<void> => {
    if (!message.guild) {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Server Only',
            'Work logs can only be viewed within a Discord server channel.'
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

      const embed = createLogListEmbed(logs, totalCount);
      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to retrieve work logs:', error);
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Database Error',
            'Failed to retrieve work logs from the database. Please try again later.'
          ),
        ],
      });
    }
  },
};
