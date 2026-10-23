import { Command, CommandContext } from '../types';
import { orderRepository } from '../../database/repositories/orderRepository';
import { createOrderStatusUpdatedEmbed, createErrorEmbed } from '../../utils/embed';
import { OrderStatus } from '../../types/order';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

const VALID_STATUSES: OrderStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

export const orderStatusCommand: Command = {
  name: 'orderstatus',
  description: 'Update the status of an existing order (Staff only)',
  usage: `${config.commandPrefix}orderstatus <orderId> <PENDING|PROCESSING|COMPLETED|CANCELLED>`,
  adminOrStaffOnly: true,
  targetBotIds: ['orders'],
  execute: async ({ message, args, watermark }: CommandContext): Promise<void> => {
    if (!message.guild) {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Server Only',
            'Order status can only be updated within a server channel.',
            watermark
          ),
        ],
      });
      return;
    }

    const orderIdRaw = args[0]?.replace(/[#ORD-]/gi, '');
    const newStatusRaw = args[1]?.toUpperCase() as OrderStatus;

    if (!orderIdRaw || !newStatusRaw || !VALID_STATUSES.includes(newStatusRaw)) {
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Invalid Arguments',
            `**Usage:**\n\`${config.commandPrefix}orderstatus <orderId> <status>\`\n\n**Valid Statuses:**\n\`${VALID_STATUSES.join(', ')}\`\n\n**Example:**\n\`${config.commandPrefix}orderstatus 1 COMPLETED\``,
            watermark
          ),
        ],
      });
      return;
    }

    try {
      const updated = await orderRepository.updateOrderStatus(orderIdRaw, message.guild.id, newStatusRaw);
      if (!updated) {
        await message.reply({
          embeds: [
            createErrorEmbed(
              'Order Not Found',
              `No order with ID \`#ORD-${orderIdRaw.padStart(4, '0')}\` was found in this server.`,
              watermark
            ),
          ],
        });
        return;
      }

      logger.forBot('orders').info(
        `Order #${updated.id} status updated to ${updated.status} by ${message.author.tag}`
      );

      const embed = createOrderStatusUpdatedEmbed(updated, watermark);
      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.forBot('orders').error('Failed to update order status:', error);
      await message.reply({
        embeds: [
          createErrorEmbed(
            'Database Error',
            'Failed to update order status in the database.',
            watermark
          ),
        ],
      });
    }
  },
};
