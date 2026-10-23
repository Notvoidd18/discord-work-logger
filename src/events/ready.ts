import { BotInstance } from '../platform/botInstance';
import { getSlashCommandsForBot } from '../commands/slashDefinitions';

export async function handleReady(bot: BotInstance): Promise<void> {
  const { client, botLogger, displayName, id } = bot;

  botLogger.info(`${displayName} successfully logged in as ${client.user?.tag} (ID: ${client.user?.id})`);

  // 1. Mark observed state as online in persistent database
  await bot.setObservedState('online');

  // 2. Set bot presence with configured status text & type
  const statusText = bot.getStatusText();
  const statusType = bot.getStatusType();

  client.user?.setPresence({
    status: 'online',
    activities: [
      {
        name: statusText,
        type: statusType,
        state: statusText,
      },
    ],
  });

  // 3. Clear all guild-level commands to prevent duplicates
  const guilds = await client.guilds.fetch();
  for (const [guildId, oauthGuild] of guilds) {
    try {
      const fullGuild = await oauthGuild.fetch();
      const existing = await fullGuild.commands.fetch();
      if (existing.size > 0) {
        await fullGuild.commands.set([]);
        botLogger.debug(`Cleared ${existing.size} duplicate guild command(s) for "${fullGuild.name}" (${guildId})`);
      }
    } catch (guildErr) {
      botLogger.debug(`Could not check guild commands for "${oauthGuild.name}":`, guildErr);
    }
  }

  // 4. Register slash commands strictly assigned to THIS bot application
  const slashCommands = getSlashCommandsForBot(id);
  try {
    if (client.application && slashCommands.length > 0) {
      await client.application.commands.set(slashCommands);
      botLogger.info(`Registered ${slashCommands.length} official slash command(s) globally for ${displayName}.`);
    }
  } catch (err) {
    botLogger.error(`Failed to register slash commands for ${displayName}:`, err);
  }

  botLogger.info(`Serving ${guilds.size} guild(s). Command prefix: "${bot.prefix}"`);
}
