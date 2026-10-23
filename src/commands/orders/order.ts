import { Command, CommandContext } from '../types';
import { orderRepository } from '../../database/repositories/orderRepository';
import { createOrderSavedEmbed, createErrorEmbed } from '../../utils/embed';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

export const orderCommand: Command = {
  name: 'order',
  description: 'Create a new order entry in the system',
  usage: `${config.commandPrefix}order <item or service details>`,
  targetBotIds: ['orders'],
  execute: async ({ message, args, watermark }: CommandContext): Promise<void> => {
    if (!message.guild) {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Server Only',
            'Orders can only be created within a server channel.',
            watermark
          ),
        ],
      });
      return;
    }

    const itemDetails = args.join(' ').trim();
    if (!itemDetails) {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Missing Details',
            `Please describe the item or service you wish to order.\n\n**Usage:**\n\`${config.commandPrefix}order <item details>\`\n\n**Example:**\n\`${config.commandPrefix}order Web development monthly maintenance package\``,
            watermark
          ),
        ],
      });
      return;
    }

    try {
      const order = await orderRepository.createOrder({
        guildId: message.guild.id,
        channelId: message.channel.id,
        userId: message.author.id,
        username: message.author.tag || message.author.username,
        itemDetails,
        quantity: 1,
      });

      logger.forBot('orders').info(
        `Order #${order.id} created by ${order.username} (${order.userId}) in guild ${order.guildId}`
      );

      const embed = createOrderSavedEmbed(order, message.author, watermark);
      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.forBot('orders').error('Failed to create order:', error);
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Database Error',
            'Failed to record your order in the database. Please try again.',
            watermark
          ),
        ],
      });
    }
  },
};
