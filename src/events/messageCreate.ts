import { Message } from 'discord.js';
import { BotInstance } from '../platform/botInstance';
import { registry } from '../commands/registry';
import { isAuthorizedUser } from '../utils/permissions';
import { createErrorEmbed } from '../utils/embed';
import { config } from '../config/env';

export async function handleMessageCreate(bot: BotInstance, message: Message): Promise<void> {
  // Ignore messages from bots to prevent loops
  if (message.author.bot) {
    return;
  }

  // Check prefix
  if (!message.content.startsWith(bot.prefix)) {
    return;
  }

  // Extract arguments
  const rawContent = message.content.slice(bot.prefix.length).trim();
  if (rawContent.length === 0) {
    return;
  }

  const [commandName, ...args] = rawContent.split(/\s+/);

  // Command lookup strictly restricted to this bot's assigned commands
  const command = registry.getForBot(bot.id, commandName.toLowerCase());
  if (!command) {
    // Unassigned or unknown command for this bot - silently ignore
    return;
  }

  // Permission Verification
  if (command.adminOrStaffOnly) {
    const member = message.member;
    const authorized = isAuthorizedUser(member, config.authorizedRoleIds);

    if (!authorized) {
      bot.botLogger.warn(
        `Unauthorized execution attempt: User ${message.author.tag} (${message.author.id}) attempted to run !${command.name} in guild ${message.guild?.id || 'DM'}`
      );

      await message.reply({
        embeds: [
          createErrorEmbed(
            'Access Denied',
            'You do not have permission to use this command.\n\nOnly server **Administrators** or members with configured **Authorized Staff Roles** can execute this action.',
            bot.brandWatermark
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
      client: bot.client,
      commandName,
      botId: bot.id,
      watermark: bot.brandWatermark,
    });
  } catch (error) {
    bot.botLogger.error(`Unhandled error executing command "${command.name}":`, error);

    try {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Command Error',
            'An unexpected error occurred while executing this command. Please contact a server administrator.',
            bot.brandWatermark
          ),
        ],
      });
    } catch (replyError) {
      bot.botLogger.error('Failed to send error reply message:', replyError);
    }
  }
}
