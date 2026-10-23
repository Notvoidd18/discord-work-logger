import { Command, CommandContext } from '../types';
import { orderRepository } from '../../database/repositories/orderRepository';
import { createOrderListEmbed, createErrorEmbed } from '../../utils/embed';
import { logger } from '../../utils/logger';

export const ordersListCommand: Command = {
  name: 'orders',
  description: 'View recent orders registered in this server',
  usage: '!orders',
  aliases: ['listorders', 'orderlist'],
  targetBotIds: ['orders'],
  execute: async ({ message, watermark }: CommandContext): Promise<void> => {
    if (!message.guild) {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Server Only',
            'Orders can only be viewed within a server channel.',
            watermark
          ),
        ],
      });
      return;
    }

    try {
      const [orders, totalCount] = await Promise.all([
        orderRepository.getRecentOrders(message.guild.id, 25),
        orderRepository.getTotalOrderCount(message.guild.id),
      ]);

      const embed = createOrderListEmbed(orders, totalCount, watermark);
      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.forBot('orders').error('Failed to retrieve orders list:', error);
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Database Error',
            'Failed to retrieve orders from database. Please try again.',
            watermark
          ),
        ],
      });
    }
  },
};
