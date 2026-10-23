import {
  ApplicationCommandDataResolvable,
  ApplicationCommandOptionType,
  ApplicationIntegrationType,
  InteractionContextType,
  ChannelType,
} from 'discord.js';

/**
 * Official Ongrywolf Slash Commands: /log, /listlog, /channellog
 */
export const officialSlashCommands: ApplicationCommandDataResolvable[] = [
  {
    name: 'log',
    description: 'Record a staff work log entry',
    integrationTypes: [ApplicationIntegrationType.GuildInstall],
    contexts: [InteractionContextType.Guild],
    options: [
      {
        name: 'description',
        description: 'The work description',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
  {
    name: 'listlog',
    description: 'View all staff work logs in one-click format',
    integrationTypes: [ApplicationIntegrationType.GuildInstall],
    contexts: [InteractionContextType.Guild],
  },
  {
    name: 'channellog',
    description: 'Manage the dedicated channel for work logs',
    integrationTypes: [ApplicationIntegrationType.GuildInstall],
    contexts: [InteractionContextType.Guild],
    options: [
      {
        name: 'set',
        description: 'Set the dedicated channel where work logs will be posted',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'channel',
            description: 'Select the text channel',
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
            required: true,
          },
        ],
      },
      {
        name: 'view',
        description: 'View the currently configured dedicated work log channel',
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: 'reset',
        description: 'Reset back to posting logs in the channel where command is used',
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
  },
];

/**
 * Returns the slash command list assigned to a specific bot ID
 */
export function getSlashCommandsForBot(botId: string): ApplicationCommandDataResolvable[] {
  if (botId === 'main' || botId === 'bot_a') {
    return officialSlashCommands;
  }
  return [];
}
