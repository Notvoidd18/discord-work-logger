import { pool } from '../pool';

interface GuildSettingsRow {
  guild_id: string;
  log_channel_id: string | null;
  updated_at: Date;
}

export class GuildSettingsRepository {
  /**
   * Get the configured log channel ID for a guild
   */
  public async getLogChannel(guildId: string): Promise<string | null> {
    const query = `
      SELECT log_channel_id
      FROM guild_settings
      WHERE guild_id = $1;
    `;

    const result = await pool.query<GuildSettingsRow>(query, [guildId]);
    if (result.rows.length === 0 || !result.rows[0].log_channel_id) {
      return null;
    }

    return result.rows[0].log_channel_id;
  }

  /**
   * Set or update the configured log channel ID for a guild
   */
  public async setLogChannel(guildId: string, channelId: string): Promise<void> {
    const query = `
      INSERT INTO guild_settings (guild_id, log_channel_id, updated_at)
      VALUES ($1, $2, NOW() AT TIME ZONE 'UTC')
      ON CONFLICT (guild_id)
      DO UPDATE SET
        log_channel_id = EXCLUDED.log_channel_id,
        updated_at = NOW() AT TIME ZONE 'UTC';
    `;

    await pool.query(query, [guildId, channelId]);
  }

  /**
   * Reset / remove the configured log channel for a guild
   */
  public async removeLogChannel(guildId: string): Promise<void> {
    const query = `
      UPDATE guild_settings
      SET log_channel_id = NULL,
          updated_at = NOW() AT TIME ZONE 'UTC'
      WHERE guild_id = $1;
    `;

    await pool.query(query, [guildId]);
  }
}

export const guildSettingsRepository = new GuildSettingsRepository();
