import {
  ApplicationCommandDataResolvable,
  ApplicationCommandOptionType,
  ApplicationIntegrationType,
  InteractionContextType,
  ChannelType,
} from 'discord.js';

/**
 * Slash commands assigned to Bot 1: Manager (Work Logger & Channel Settings)
 */
export const managerSlashCommands: ApplicationCommandDataResolvable[] = [
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
 * Slash commands assigned to Bot 2: Orders (Order Creation, Listing, Status)
 */
export const ordersSlashCommands: ApplicationCommandDataResolvable[] = [
  {
    name: 'order',
    description: 'Place a new service or item order',
    integrationTypes: [ApplicationIntegrationType.GuildInstall],
    contexts: [InteractionContextType.Guild],
    options: [
      {
        name: 'item',
        description: 'Description of item or service to order',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'quantity',
        description: 'Quantity required (default: 1)',
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: 'notes',
        description: 'Additional notes or instructions',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
  {
    name: 'orders',
    description: 'View recent orders in this server',
    integrationTypes: [ApplicationIntegrationType.GuildInstall],
    contexts: [InteractionContextType.Guild],
  },
  {
    name: 'orderstatus',
    description: 'Update the status of an order (Staff only)',
    integrationTypes: [ApplicationIntegrationType.GuildInstall],
    contexts: [InteractionContextType.Guild],
    options: [
      {
        name: 'id',
        description: 'The Order ID to update',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'status',
        description: 'The new order status',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: 'Pending', value: 'PENDING' },
          { name: 'Processing', value: 'PROCESSING' },
          { name: 'Completed', value: 'COMPLETED' },
          { name: 'Cancelled', value: 'CANCELLED' },
        ],
      },
    ],
  },
];

/**
 * Returns the slash command list assigned to a specific bot ID
 */
export function getSlashCommandsForBot(botId: string): ApplicationCommandDataResolvable[] {
  if (botId === 'manager') {
    return managerSlashCommands;
  }
  if (botId === 'orders') {
    return ordersSlashCommands;
  }
  return [];
}
