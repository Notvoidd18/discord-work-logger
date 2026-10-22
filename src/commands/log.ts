import { Command, CommandContext } from './types';
import { workLogRepository } from '../database/repositories/workLogRepository';
import { guildSettingsRepository } from '../database/repositories/guildSettingsRepository';
import {
  createWorkLogSavedEmbed,
  createSuccessEmbed,
  createErrorEmbed,
} from '../utils/embed';
import { formatLogId } from '../types/workLog';
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
      const logEmbed = createWorkLogSavedEmbed(savedLog, message.author);

      // Check if guild has a dedicated logging channel configured
      const dedicatedChannelId = await guildSettingsRepository.getLogChannel(message.guild.id);

      if (dedicatedChannelId) {
        try {
          const dedicatedChannel = await message.guild.channels.fetch(dedicatedChannelId);
          if (dedicatedChannel && dedicatedChannel.isTextBased()) {
            // Post the permanent log embed in the dedicated channel
            await dedicatedChannel.send({ embeds: [logEmbed] });

            // Delete the user's !log message to keep current chat completely clean
            await message.delete().catch(() => null);

            // If the command was sent in a different channel, send a temporary notice that auto-deletes after 5 seconds
            if (message.channel.id !== dedicatedChannelId && 'send' in message.channel) {
              const notice = await message.channel.send({
                embeds: [
                  createSuccessEmbed(
                    'Work Log Recorded',
                    `Your log \`${formatLogId(savedLog.id)}\` has been recorded and posted to <#${dedicatedChannelId}>.`
                  ),
                ],
              });
              setTimeout(() => {
                notice.delete().catch(() => null);
              }, 5000);
              return;
            } else {
              return;
            }
          }
        } catch (channelErr) {
          logger.warn(`Could not send log to dedicated channel ${dedicatedChannelId}:`, channelErr);
          // Fall back to sending in the current channel below
        }
      }

      // Default: reply in the same channel
      await message.reply({ embeds: [logEmbed] });
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
