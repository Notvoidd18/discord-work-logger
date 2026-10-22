import { EmbedBuilder, User } from 'discord.js';
import { WorkLog, formatLogId } from '../types/workLog';

export const BrandColors = {
  SUCCESS: 0x2ecc71, // Emerald Green
  ERROR: 0xed4245,   // Discord Red
  WARNING: 0xfee75c, // Amber Yellow
  INFO: 0x5865f2,    // Blurple
} as const;

/**
 * Creates the success embed when a work log is saved
 */
export function createWorkLogSavedEmbed(log: WorkLog, authorUser?: User): EmbedBuilder {
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
      text: `Work Logging System • User ID: ${log.userId}`,
    })
    .setTimestamp(log.createdAt);

  if (authorUser) {
    embed.setThumbnail(authorUser.displayAvatarURL());
  }

  return embed;
}

/**
 * Creates an embed displaying all work logs in the requested one-click format:
 * Log#0001 "context" by (username)
 */
export function createLogListEmbed(logs: WorkLog[], totalCount: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.INFO)
    .setTitle('📋 Staff Work Logs')
    .setTimestamp();

  if (logs.length === 0) {
    embed.setDescription(
      'No work logs recorded in this server yet.\nUse `!log <description>` to add one.'
    );
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
    text: `Total logs: ${totalCount} • Showing ${logs.length}`,
  });

  return embed;
}

/**
 * Creates a generic success embed
 */
export function createSuccessEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BrandColors.SUCCESS)
    .setTitle(`✅ ${title}`)
    .setDescription(message)
    .setTimestamp();
}

/**
 * Creates an error embed for validation or permission failures
 */
export function createErrorEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BrandColors.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(message)
    .setTimestamp();
}
