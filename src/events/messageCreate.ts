import { Message, Client } from 'discord.js';
import { config } from '../config/env';
import { registry } from '../commands/registry';
import { isAuthorizedUser } from '../utils/permissions';
import { createErrorEmbed } from '../utils/embed';
import { logger } from '../utils/logger';

export async function handleMessageCreate(client: Client, message: Message): Promise<void> {
  // Ignore messages from bots to prevent feedback loops
  if (message.author.bot) {
    return;
  }

  // Check prefix
  if (!message.content.startsWith(config.commandPrefix)) {
    return;
  }

  // Slice prefix and extract arguments
  const rawContent = message.content.slice(config.commandPrefix.length).trim();
  if (rawContent.length === 0) {
    return;
  }

  const [commandName, ...args] = rawContent.split(/\s+/);
  const command = registry.get(commandName.toLowerCase());

  if (!command) {
    // Unrecognized command - silently ignore or handle according to preference
    return;
  }

  // Permission Verification
  if (command.adminOrStaffOnly) {
    const member = message.member;
    const authorized = isAuthorizedUser(member, config.authorizedRoleIds);

    if (!authorized) {
      logger.warn(
        `Unauthorized execution attempt: User ${message.author.tag} (${message.author.id}) attempted to run !${command.name} in guild ${message.guild?.id || 'DM'}`
      );

      await message.reply({
        embeds: [
          createErrorEmbed(
            'Access Denied',
            'You do not have permission to use this command.\n\nOnly server **Administrators** or members with configured **Authorized Staff Roles** can record work logs.'
          ),
        ],
      });
      return;
    }
  }

  // Command Execution
  try {
    await command.execute({
      message,
      args,
      client,
      commandName,
    });
  } catch (error) {
    logger.error(`Unhandled error during execution of command "${command.name}":`, error);

    try {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Command Error',
            'An unexpected error occurred while executing this command. Please contact a server administrator.'
          ),
        ],
      });
    } catch (replyError) {
      logger.error('Failed to send error reply message:', replyError);
    }
  }
}
