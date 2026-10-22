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
 * Creates an error embed for validation or permission failures
 */
export function createErrorEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BrandColors.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(message)
    .setTimestamp();
}
