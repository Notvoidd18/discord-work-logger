import {
  ApplicationCommandDataResolvable,
  ApplicationCommandOptionType,
  ApplicationIntegrationType,
  InteractionContextType,
  ChannelType,
} from 'discord.js';

export const slashCommands: ApplicationCommandDataResolvable[] = [
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
