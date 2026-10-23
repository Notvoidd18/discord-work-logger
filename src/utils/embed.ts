import { EmbedBuilder, User } from 'discord.js';
import { WorkLog, formatLogId } from '../types/workLog';
import { Order, formatOrderId } from '../types/order';

export const BrandColors = {
  SUCCESS: 0x2ecc71, // Emerald Green
  ERROR: 0xed4245,   // Discord Red
  WARNING: 0xfee75c, // Amber Yellow
  INFO: 0x5865f2,    // Blurple
  PURPLE: 0x9b59b6,  // Ongrywolf Purple
} as const;

export const DEFAULT_BRAND_WATERMARK = 'Hosting on Ongrywolf';

/**
 * Creates the success embed when a work log is saved (Manager Bot)
 */
export function createWorkLogSavedEmbed(
  log: WorkLog,
  authorUser?: User,
  watermark: string = DEFAULT_BRAND_WATERMARK
): EmbedBuilder {
  const utcDateString = log.createdAt.toUTCString();
  const unixSeconds = Math.floor(log.createdAt.getTime() / 1000);

  const embed = new EmbedBuilder()
    .setColor(BrandColors.SUCCESS)
    .setTitle('📋 WORK LOG SAVED')
    .setDescription('Your work entry has been successfully recorded in the database.')
    .addFields(
      {
        name: 'Log ID',
        value: `\`${formatLogId(log.id)}\``,
        inline: true,
      },
      {
        name: 'Created By',
        value: `<@${log.userId}> (\`${log.username}\`)`,
        inline: true,
      },
      {
        name: 'Timestamp (UTC)',
        value: `${utcDateString}\n(<t:${unixSeconds}:R>)`,
        inline: false,
      },
      {
        name: 'Description',
        value: log.description,
        inline: false,
      }
    )
    .setFooter({
      text: `${watermark} • Work Logging System`,
    })
    .setTimestamp(log.createdAt);

  if (authorUser) {
    embed.setThumbnail(authorUser.displayAvatarURL());
  }

  return embed;
}

/**
 * Creates an embed displaying all work logs in the one-click format (Manager Bot)
 */
export function createLogListEmbed(
  logs: WorkLog[],
  totalCount: number,
  watermark: string = DEFAULT_BRAND_WATERMARK
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.INFO)
    .setTitle('📋 Staff Work Logs')
    .setTimestamp();

  if (logs.length === 0) {
    embed.setDescription(
      'No work logs recorded in this server yet.\nUse `!log <description>` or `/log` to add one.'
    );
    embed.setFooter({ text: `${watermark} • Work Logging System` });
    return embed;
  }

  const lines = logs.map((log) => {
    const formattedId = log.id.padStart(4, '0');
    return `Log#${formattedId} "${log.description}" by (${log.username})`;
  });

  let content = lines.join('\n');
  if (content.length > 4000) {
    content = content.slice(0, 3950) + '\n... (truncated)';
  }

  embed.setDescription(content);
  embed.setFooter({
    text: `${watermark} • Total logs: ${totalCount} • Showing ${logs.length}`,
  });

  return embed;
}

/**
 * Creates an embed for a newly placed order (Orders Bot)
 */
export function createOrderSavedEmbed(
  order: Order,
  authorUser?: User,
  watermark: string = DEFAULT_BRAND_WATERMARK
): EmbedBuilder {
  const utcDateString = order.createdAt.toUTCString();
  const unixSeconds = Math.floor(order.createdAt.getTime() / 1000);

  const embed = new EmbedBuilder()
    .setColor(BrandColors.PURPLE)
    .setTitle('📦 ORDER CREATED')
    .setDescription('Order has been registered in the system.')
    .addFields(
      {
        name: 'Order ID',
        value: `\`${formatOrderId(order.id)}\``,
        inline: true,
      },
      {
        name: 'Customer',
        value: `<@${order.userId}> (\`${order.username}\`)`,
        inline: true,
      },
      {
        name: 'Status',
        value: `\`${order.status}\``,
        inline: true,
      },
      {
        name: 'Item / Service',
        value: order.itemDetails,
        inline: false,
      },
      {
        name: 'Quantity',
        value: `${order.quantity}`,
        inline: true,
      },
      {
        name: 'Timestamp (UTC)',
        value: `${utcDateString} (<t:${unixSeconds}:R>)`,
        inline: true,
      }
    )
    .setFooter({
      text: `${watermark} • Orders Platform`,
    })
    .setTimestamp(order.createdAt);

  if (order.notes) {
    embed.addFields({ name: 'Notes', value: order.notes, inline: false });
  }

  if (authorUser) {
    embed.setThumbnail(authorUser.displayAvatarURL());
  }

  return embed;
}

/**
 * Creates an embed listing recent orders (Orders Bot)
 */
export function createOrderListEmbed(
  orders: Order[],
  totalCount: number,
  watermark: string = DEFAULT_BRAND_WATERMARK
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.PURPLE)
    .setTitle('📦 Orders List')
    .setTimestamp();

  if (orders.length === 0) {
    embed.setDescription('No orders recorded yet. Use `/order` or `!order` to submit an order.');
    embed.setFooter({ text: `${watermark} • Orders Platform` });
    return embed;
  }

  const lines = orders.map((ord) => {
    return `• **${formatOrderId(ord.id)}** [${ord.status}] "${ord.itemDetails}" (Qty: ${ord.quantity}) by (${ord.username})`;
  });

  let content = lines.join('\n');
  if (content.length > 4000) {
    content = content.slice(0, 3950) + '\n... (truncated)';
  }

  embed.setDescription(content);
  embed.setFooter({
    text: `${watermark} • Total orders: ${totalCount} • Showing ${orders.length}`,
  });

  return embed;
}

/**
 * Creates an embed confirming an order status update (Orders Bot)
 */
export function createOrderStatusUpdatedEmbed(
  order: Order,
  watermark: string = DEFAULT_BRAND_WATERMARK
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BrandColors.SUCCESS)
    .setTitle('🔄 ORDER STATUS UPDATED')
    .setDescription(`Order \`${formatOrderId(order.id)}\` status has been updated.`)
    .addFields(
      { name: 'Order ID', value: `\`${formatOrderId(order.id)}\``, inline: true },
      { name: 'Customer', value: `<@${order.userId}>`, inline: true },
      { name: 'New Status', value: `\`${order.status}\``, inline: true },
      { name: 'Item', value: order.itemDetails, inline: false }
    )
    .setFooter({ text: `${watermark} • Orders Platform` })
    .setTimestamp(order.updatedAt);
}

/**
 * Creates a generic success embed
 */
export function createSuccessEmbed(
  title: string,
  message: string,
  watermark: string = DEFAULT_BRAND_WATERMARK
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BrandColors.SUCCESS)
    .setTitle(`✅ ${title}`)
    .setDescription(message)
    .setFooter({ text: watermark })
    .setTimestamp();
}

/**
 * Creates an error embed for validation or permission failures
 */
export function createErrorEmbed(
  title: string,
  message: string,
  watermark: string = DEFAULT_BRAND_WATERMARK
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BrandColors.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(message)
    .setFooter({ text: watermark })
    .setTimestamp();
}
