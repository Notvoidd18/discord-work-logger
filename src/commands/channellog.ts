import { Command, CommandContext } from './types';
import { guildSettingsRepository } from '../database/repositories/guildSettingsRepository';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embed';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export const channelLogCommand: Command = {
  name: 'channellog',
  description: 'Configure the dedicated channel where all work logs will be sent',
  usage: `${config.commandPrefix}channellog set <#channel> | view | reset`,
  aliases: ['logchannel', 'setlogchannel'],
  adminOrStaffOnly: true,
  execute: async ({ message, args }: CommandContext): Promise<void> => {
    if (!message.guild) {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Server Only',
            'This command can only be used within a server.'
          ),
        ],
      });
      return;
    }

    const subAction = (args[0] || 'view').toLowerCase();

    // 1. View current log channel
    if (subAction === 'view') {
      const currentChannelId = await guildSettingsRepository.getLogChannel(message.guild.id);
      const replyMsg = await message.reply({
        embeds: [
          currentChannelId
            ? createSuccessEmbed(
                'Dedicated Log Channel',
                `Work logs are currently configured to be posted in <#${currentChannelId}>.`
              )
            : createSuccessEmbed(
                'Dedicated Log Channel',
                `No dedicated log channel is configured. Work logs are posted in whichever channel the \`${config.commandPrefix}log\` command is run.\n\nUse \`${config.commandPrefix}channellog set #channel\` or \`/channellog set\` to assign one.`
              ),
        ],
      });
      setTimeout(() => replyMsg.delete().catch(() => null), 10000);
      return;
    }

    // 2. Reset log channel
    if (subAction === 'reset' || subAction === 'remove' || subAction === 'clear') {
      await guildSettingsRepository.removeLogChannel(message.guild.id);
      logger.info(`Dedicated log channel reset for guild ${message.guild.id}`);
      await message.delete().catch(() => null);

      if ('send' in message.channel) {
        const replyMsg = await message.channel.send({
          embeds: [
            createSuccessEmbed(
              'Channel Reset',
              `Dedicated log channel has been removed. Work logs will now appear in the channel where \`${config.commandPrefix}log\` is typed.`
            ),
          ],
        });
        setTimeout(() => replyMsg.delete().catch(() => null), 5000);
      }
      return;
    }

    // 3. Set log channel: !channellog set #channel
    if (subAction === 'set') {
      const mentionedChannel = message.mentions.channels.first();
      const targetChannelId = mentionedChannel ? mentionedChannel.id : args[1]?.replace(/[<#>]/g, '');

      if (!targetChannelId) {
        await message.reply({
          embeds: [
            createErrorEmbed(
              'Missing Channel',
              `Please mention a text channel to set as the dedicated log channel.\n\n**Usage:**\n\`${config.commandPrefix}channellog set #channel-name\` or use slash command \`/channellog set\``
            ),
          ],
        });
        return;
      }

      const targetChannel = await message.guild.channels.fetch(targetChannelId).catch(() => null);
      if (!targetChannel || !targetChannel.isTextBased()) {
        await message.reply({
          embeds: [
            createErrorEmbed(
              'Invalid Channel',
              'The specified channel does not exist or is not a text channel.'
            ),
          ],
        });
        return;
      }

      await guildSettingsRepository.setLogChannel(message.guild.id, targetChannel.id);
      logger.info(`Dedicated log channel for guild ${message.guild.id} set to ${targetChannel.id}`);

      // Delete the command message to keep channel clean
      await message.delete().catch(() => null);

      if ('send' in message.channel) {
        const replyMsg = await message.channel.send({
          embeds: [
            createSuccessEmbed(
              'Dedicated Log Channel Set',
              `All future staff work logs will now be posted in <#${targetChannel.id}>!`
            ),
          ],
        });
        setTimeout(() => replyMsg.delete().catch(() => null), 5000);
      }
      return;
    }

    // Help fallback
    await message.reply({
      embeds: [
        createErrorEmbed(
          'Invalid Subcommand',
          `Valid subcommands are: \`set\`, \`view\`, \`reset\`.\n\n**Example:**\n\`${config.commandPrefix}channellog set #work-logs\``
        ),
      ],
    });
  },
};
