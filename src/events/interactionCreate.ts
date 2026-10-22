import { Interaction, GuildMember, ChannelType } from 'discord.js';
import { workLogRepository } from '../database/repositories/workLogRepository';
import { guildSettingsRepository } from '../database/repositories/guildSettingsRepository';
import {
  createLogListEmbed,
  createWorkLogSavedEmbed,
  createSuccessEmbed,
  createErrorEmbed,
} from '../utils/embed';
import { isAuthorizedUser } from '../utils/permissions';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export async function handleInteractionCreate(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  // Guild restriction
  if (!interaction.guild || !interaction.guildId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Server Only',
          'Work logging commands can only be used within a server.'
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  // Authorization check (same permissions for all staff/admin commands)
  const member = interaction.member as GuildMember | null;
  const authorized = isAuthorizedUser(member, config.authorizedRoleIds);
  if (!authorized) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Access Denied',
          'You do not have permission to use this command.\n\nOnly server **Administrators** or members with configured **Authorized Staff Roles** can manage or view work logs.'
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const { commandName } = interaction;

  // 1. Handle /listlog
  if (commandName === 'listlog') {
    try {
      const [logs, totalCount] = await Promise.all([
        workLogRepository.getRecentLogs(interaction.guildId, 50),
        workLogRepository.getTotalLogCount(interaction.guildId),
      ]);

      const embed = createLogListEmbed(logs, totalCount);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to handle /listlog interaction:', error);
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            'Database Error',
            'Failed to retrieve work logs from the database. Please try again later.'
          ),
        ],
        ephemeral: true,
      });
    }
    return;
  }

  // 2. Handle /channellog
  if (commandName === 'channellog') {
    const subcommand = interaction.options.getSubcommand();

    // /channellog set channel:#channel
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
              'Please select a text-based channel.'
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      try {
        await guildSettingsRepository.setLogChannel(interaction.guildId, targetChannel.id);
        logger.info(
          `Dedicated log channel set to ${targetChannel.id} in guild ${interaction.guildId} by ${interaction.user.tag}`
        );

        await interaction.reply({
          embeds: [
            createSuccessEmbed(
              'Dedicated Log Channel Set',
              `All future staff work logs will now be posted in <#${targetChannel.id}>!`
            ),
          ],
        });
      } catch (error) {
        logger.error('Failed to set dedicated log channel:', error);
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              'Database Error',
              'Failed to save dedicated log channel settings. Please try again.'
            ),
          ],
          ephemeral: true,
        });
      }
      return;
    }

    // /channellog view
    if (subcommand === 'view') {
      try {
        const channelId = await guildSettingsRepository.getLogChannel(interaction.guildId);
        if (channelId) {
          await interaction.reply({
            embeds: [
              createSuccessEmbed(
                'Dedicated Log Channel',
                `Work logs are currently sent to <#${channelId}>.`
              ),
            ],
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            embeds: [
              createSuccessEmbed(
                'Dedicated Log Channel',
                `No dedicated channel is currently set. Logs are sent in the channel where \`${config.commandPrefix}log\` is typed.\n\nUse \`/channellog set\` to select one.`
              ),
            ],
            ephemeral: true,
          });
        }
      } catch (error) {
        logger.error('Failed to get dedicated log channel:', error);
        await interaction.reply({
          embeds: [
            createErrorEmbed('Database Error', 'Failed to retrieve settings.'),
          ],
          ephemeral: true,
        });
      }
      return;
    }

    // /channellog reset
    if (subcommand === 'reset') {
      try {
        await guildSettingsRepository.removeLogChannel(interaction.guildId);
        await interaction.reply({
          embeds: [
            createSuccessEmbed(
              'Channel Setting Cleared',
              `Dedicated log channel removed. Logs will now post where \`${config.commandPrefix}log\` is entered.`
            ),
          ],
          ephemeral: true,
        });
      } catch (error) {
        logger.error('Failed to reset dedicated log channel:', error);
        await interaction.reply({
          embeds: [
            createErrorEmbed('Database Error', 'Failed to reset settings.'),
          ],
          ephemeral: true,
        });
      }
      return;
    }
  }

  // 3. Fallback for old cached /log command
  if (commandName === 'log') {
    const description = interaction.options.getString('description', false)?.trim();
    if (!description) {
      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'Use !log command',
            `Work logs are recorded using:\n\`${config.commandPrefix}log <work description>\`\n\nExample:\n\`${config.commandPrefix}log Tested website order system\``
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

      const logEmbed = createWorkLogSavedEmbed(savedLog, interaction.user);
      const dedicatedChannelId = await guildSettingsRepository.getLogChannel(interaction.guildId);

      if (dedicatedChannelId) {
        const dedicatedChannel = await interaction.guild.channels.fetch(dedicatedChannelId).catch(() => null);
        if (dedicatedChannel && dedicatedChannel.isTextBased()) {
          await dedicatedChannel.send({ embeds: [logEmbed] });
          await interaction.reply({
            embeds: [
              createSuccessEmbed(
                'Work Log Saved',
                `Your log has been recorded and posted to <#${dedicatedChannelId}>.`
              ),
            ],
            ephemeral: true,
          });
          return;
        }
      }

      await interaction.reply({ embeds: [logEmbed] });
    } catch (error) {
      logger.error('Failed to handle /log interaction:', error);
      await interaction.reply({
        embeds: [
          createErrorEmbed('Database Error', 'Could not save work log.'),
        ],
        ephemeral: true,
      });
    }
  }
}
