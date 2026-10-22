import { ApplicationCommandDataResolvable, ApplicationCommandOptionType } from 'discord.js';

export const slashCommands: ApplicationCommandDataResolvable[] = [
  {
    name: 'listlog',
    description: 'View all staff work logs in one-click format',
  },
  {
    name: 'log',
    description: 'Record a staff work log entry',
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
