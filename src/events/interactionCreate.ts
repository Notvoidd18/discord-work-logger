import { Interaction, GuildMember, ChannelType } from 'discord.js';
import { BotInstance } from '../platform/botInstance';
import { workLogRepository } from '../database/repositories/workLogRepository';
import { guildSettingsRepository } from '../database/repositories/guildSettingsRepository';
import {
  createLogListEmbed,
  createWorkLogSavedEmbed,
  createSuccessEmbed,
  createErrorEmbed,
} from '../utils/embed';
import { formatLogId } from '../types/workLog';
import { isAuthorizedUser } from '../utils/permissions';
import { config } from '../config/env';

export async function handleInteractionCreate(bot: BotInstance, interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  // Guild restriction
  if (!interaction.guild || !interaction.guildId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Server Only',
          'Commands can only be used within a Discord server.',
          bot.brandWatermark
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const { commandName } = interaction;
  const member = interaction.member as GuildMember | null;

  // Authorization check for official logging commands
  const authorized = isAuthorizedUser(member, config.authorizedRoleIds);
  if (!authorized) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Access Denied',
          'You do not have permission to use this command.\n\nOnly server **Administrators** or members with configured **Authorized Staff Roles** can manage work logs.',
          bot.brandWatermark
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  // 1. /listlog
  if (commandName === 'listlog') {
    try {
      const [logs, totalCount] = await Promise.all([
        workLogRepository.getRecentLogs(interaction.guildId, 50),
        workLogRepository.getTotalLogCount(interaction.guildId),
      ]);

      const embed = createLogListEmbed(logs, totalCount, bot.brandWatermark);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      bot.botLogger.error('Failed to handle /listlog interaction:', error);
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            'Database Error',
            'Failed to retrieve work logs from the database.',
            bot.brandWatermark
          ),
        ],
        ephemeral: true,
      });
    }
    return;
  }

  // 2. /channellog
  if (commandName === 'channellog') {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set') {
      const targetChannel = interaction.options.getChannel('channel', true);

      if (
        targetChannel.type !== ChannelType.GuildText &&
        targetChannel.type !== ChannelType.GuildAnnouncement
      ) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              'Invalid Channel',
              'Please select a text-based channel.',
              bot.brandWatermark
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      try {
        await guildSettingsRepository.setLogChannel(interaction.guildId, targetChannel.id);
        bot.botLogger.info(
          `Dedicated log channel set to ${targetChannel.id} in guild ${interaction.guildId} by ${interaction.user.tag}`
        );

        await interaction.reply({
          embeds: [
            createSuccessEmbed(
              'Dedicated Log Channel Set',
              `All future staff work logs will now be posted in <#${targetChannel.id}>!`,
              bot.brandWatermark
            ),
          ],
          ephemeral: true,
        });
      } catch (error) {
        bot.botLogger.error('Failed to set dedicated log channel:', error);
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              'Database Error',
              'Failed to save dedicated log channel settings.',
              bot.brandWatermark
            ),
          ],
          ephemeral: true,
        });
      }
      return;
    }

    if (subcommand === 'view') {
      try {
        const channelId = await guildSettingsRepository.getLogChannel(interaction.guildId);
        await interaction.reply({
          embeds: [
            channelId
              ? createSuccessEmbed(
                  'Dedicated Log Channel',
                  `Work logs are currently sent to <#${channelId}>.`,
                  bot.brandWatermark
                )
              : createSuccessEmbed(
                  'Dedicated Log Channel',
                  `No dedicated channel is currently set. Logs are sent in the channel where \`${config.commandPrefix}log\` is typed.`,
                  bot.brandWatermark
                ),
          ],
          ephemeral: true,
        });
      } catch (error) {
        bot.botLogger.error('Failed to get dedicated log channel:', error);
        await interaction.reply({
          embeds: [createErrorEmbed('Database Error', 'Failed to retrieve settings.', bot.brandWatermark)],
          ephemeral: true,
        });
      }
      return;
    }

    if (subcommand === 'reset') {
      try {
        await guildSettingsRepository.removeLogChannel(interaction.guildId);
        await interaction.reply({
          embeds: [
            createSuccessEmbed(
              'Channel Setting Cleared',
              `Dedicated log channel removed. Logs will now post where \`${config.commandPrefix}log\` is entered.`,
              bot.brandWatermark
            ),
          ],
          ephemeral: true,
        });
      } catch (error) {
        bot.botLogger.error('Failed to reset dedicated log channel:', error);
        await interaction.reply({
          embeds: [createErrorEmbed('Database Error', 'Failed to reset settings.', bot.brandWatermark)],
          ephemeral: true,
        });
      }
      return;
    }
  }

  // 3. /log
  if (commandName === 'log') {
    const description = interaction.options.getString('description', true).trim();

    if (!description) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            'Missing Description',
            'You must provide a description of the work performed.',
            bot.brandWatermark
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (description.length > config.maxLogLength) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            'Description Too Long',
            `Your description is **${description.length}** characters, exceeding the limit of **${config.maxLogLength}**.`,
            bot.brandWatermark
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    try {
      const savedLog = await workLogRepository.createLog({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        userId: interaction.user.id,
        username: interaction.user.tag || interaction.user.username,
        description,
      });

      const logEmbed = createWorkLogSavedEmbed(savedLog, interaction.user, bot.brandWatermark);
      const dedicatedChannelId = await guildSettingsRepository.getLogChannel(interaction.guildId);

      if (dedicatedChannelId) {
        const dedicatedChannel = await interaction.guild.channels.fetch(dedicatedChannelId).catch(() => null);
        if (dedicatedChannel && dedicatedChannel.isTextBased()) {
          await dedicatedChannel.send({ embeds: [logEmbed] });

          await interaction.reply({
            embeds: [
              createSuccessEmbed(
                'Work Log Saved',
                `Your log \`${formatLogId(savedLog.id)}\` has been recorded and posted to <#${dedicatedChannelId}>.`,
                bot.brandWatermark
              ),
            ],
            ephemeral: true,
          });
          return;
        }
      }

      await interaction.reply({ embeds: [logEmbed] });
    } catch (error) {
      bot.botLogger.error('Failed to handle /log interaction:', error);
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            'Database Error',
            'An error occurred while saving your work log.',
            bot.brandWatermark
          ),
        ],
        ephemeral: true,
      });
    }
    return;
  }
}
