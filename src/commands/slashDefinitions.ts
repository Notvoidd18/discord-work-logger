import {
  ApplicationCommandDataResolvable,
  ApplicationCommandOptionType,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';

export const slashCommands: ApplicationCommandDataResolvable[] = [
  {
    name: 'listlog',
    description: 'View all staff work logs in one-click format',
    integrationTypes: [ApplicationIntegrationType.GuildInstall],
    contexts: [InteractionContextType.Guild],
  },
  {
    name: 'log',
    description: 'Record a staff work log entry',
    integrationTypes: [ApplicationIntegrationType.GuildInstall],
    contexts: [InteractionContextType.Guild],
    options: [
      {
        name: 'description',
        description: 'The work log description',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
];
