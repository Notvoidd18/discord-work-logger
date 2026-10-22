import { Command, CommandContext } from './types';
import { workLogRepository } from '../database/repositories/workLogRepository';
import { createWorkLogSavedEmbed, createErrorEmbed } from '../utils/embed';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export const logCommand: Command = {
  name: 'log',
  description: 'Records a staff work log entry permanently into the database',
  usage: `${config.commandPrefix}log <description>`,
  adminOrStaffOnly: true,
  execute: async ({ message, args }: CommandContext): Promise<void> => {
    // 1. Guild context verification (logs belong to a server)
    if (!message.guild) {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Server Only',
            'Work logs can only be recorded within a Discord server channel.'
          ),
        ],
      });
      return;
    }

    // 2. Input validation - Empty argument check
    const description = args.join(' ').trim();
    if (!description) {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Missing Description',
            `You must provide a description of the work performed.\n\n**Usage:**\n\`${config.commandPrefix}log <work description>\`\n\n**Example:**\n\`${config.commandPrefix}log Tested the website order system\``
          ),
        ],
      });
      return;
    }

    // 3. Input validation - Length limit check
    if (description.length > config.maxLogLength) {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Description Too Long',
            `Your description is **${description.length}** characters, which exceeds the limit of **${config.maxLogLength}** characters.\n\nPlease shorten your log entry and try again.`
          ),
        ],
      });
      return;
    }

    try {
      // 4. Save to PostgreSQL database
      const savedLog = await workLogRepository.createLog({
        guildId: message.guild.id,
        channelId: message.channel.id,
        userId: message.author.id,
        username: message.author.tag || message.author.username,
        description,
      });

      logger.info(
        `Work log #${savedLog.id} successfully created by ${savedLog.username} (${savedLog.userId}) in guild ${savedLog.guildId}`
      );

      // 5. Send confirmation embed
      const embed = createWorkLogSavedEmbed(savedLog, message.author);
      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to save work log to database:', error);

      // Graceful error notification - Never claim success on error
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Database Error',
            'An unexpected error occurred while saving your work log to the database. The entry was **not** saved. Please notify an administrator or try again shortly.'
          ),
        ],
      });
    }
  },
};
