import { Interaction, GuildMember } from 'discord.js';
import { workLogRepository } from '../database/repositories/workLogRepository';
import {
  createLogListEmbed,
  createWorkLogSavedEmbed,
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

  // Authorization check (same permissions for both commands)
  const member = interaction.member as GuildMember | null;
  const authorized = isAuthorizedUser(member, config.authorizedRoleIds);
  if (!authorized) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Access Denied',
          'You do not have permission to use this command.\n\nOnly server **Administrators** or members with configured **Authorized Staff Roles** can view or record work logs.'
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const { commandName } = interaction;

  // Handle /listlog
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

  // Handle /log
  if (commandName === 'log') {
    const description = interaction.options.getString('description', true).trim();

    if (!description) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            'Missing Description',
            'You must provide a description of the work performed.'
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
            `Your description is **${description.length}** characters, exceeding the limit of **${config.maxLogLength}**.`
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

      const embed = createWorkLogSavedEmbed(savedLog, interaction.user);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to handle /log interaction:', error);
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            'Database Error',
            'An error occurred while saving your work log. The entry was not saved.'
          ),
        ],
        ephemeral: true,
      });
    }
  }
}
