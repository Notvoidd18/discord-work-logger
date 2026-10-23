import { pool } from '../pool';
import { PersistentBotConfig, BotDefinition, BotObservedState } from '../../platform/types';
import { logger } from '../../utils/logger';

interface BotConfigRow {
  bot_id: string;
  display_name: string;
  desired_enabled: boolean;
  observed_state: string;
  status_text: string;
  status_type: string;
  assigned_commands: string[];
  last_started_at: Date | null;
  last_status_update_at: Date;
  last_error: string | null;
  updated_at: Date;
}

function mapRow(row: BotConfigRow): PersistentBotConfig {
  return {
    botId: row.bot_id,
    displayName: row.display_name,
    desiredEnabled: row.desired_enabled,
    observedState: row.observed_state as BotObservedState,
    statusText: row.status_text,
    statusType: row.status_type,
    assignedCommands: Array.isArray(row.assigned_commands) ? row.assigned_commands : [],
    lastStartedAt: row.last_started_at ? new Date(row.last_started_at) : null,
    lastStatusUpdateAt: new Date(row.last_status_update_at),
    lastError: row.last_error,
    updatedAt: new Date(row.updated_at),
  };
}

export class BotConfigRepository {
  /**
   * Resets all observed states to 'offline' on process startup to prevent stale 'online' claims
   * after unexpected crashes or server restarts.
   */
  public async markAllOfflineOnStartup(): Promise<void> {
    const query = `
      UPDATE bot_configurations
      SET observed_state = 'offline',
          last_status_update_at = NOW() AT TIME ZONE 'UTC'
      WHERE observed_state != 'offline';
    `;
    await pool.query(query);
    logger.debug('Marked existing bot records offline on startup.');
  }

  /**
   * Retrieves or initializes persistent configuration for a bot definition.
   */
  public async getOrCreateBotConfig(def: BotDefinition): Promise<PersistentBotConfig> {
    const selectQuery = `
      SELECT bot_id, display_name, desired_enabled, observed_state, status_text,
             status_type, assigned_commands, last_started_at, last_status_update_at,
             last_error, updated_at
      FROM bot_configurations
      WHERE bot_id = $1;
    `;

    const existing = await pool.query<BotConfigRow>(selectQuery, [def.id]);
    if (existing.rows.length > 0) {
      return mapRow(existing.rows[0]);
    }

    const insertQuery = `
      INSERT INTO bot_configurations (
        bot_id, display_name, desired_enabled, observed_state, status_text,
        status_type, assigned_commands, last_status_update_at
      ) VALUES ($1, $2, true, 'offline', $3, $4, $5, NOW() AT TIME ZONE 'UTC')
      ON CONFLICT (bot_id) DO UPDATE SET
        display_name = EXCLUDED.display_name
      RETURNING bot_id, display_name, desired_enabled, observed_state, status_text,
                status_type, assigned_commands, last_started_at, last_status_update_at,
                last_error, updated_at;
    `;

    const inserted = await pool.query<BotConfigRow>(insertQuery, [
      def.id,
      def.displayName,
      def.defaultStatusText,
      def.defaultStatusType.toString(),
      def.defaultCommands,
    ]);

    return mapRow(inserted.rows[0]);
  }

  /**
   * Update the live observed state of a bot from actual Discord gateway events
   */
  public async updateObservedState(
    botId: string,
    state: BotObservedState,
    errorSummary: string | null = null
  ): Promise<void> {
    const query = `
      UPDATE bot_configurations
      SET observed_state = $1,
          last_error = $2,
          last_started_at = CASE WHEN $1 = 'online' THEN NOW() AT TIME ZONE 'UTC' ELSE last_started_at END,
          last_status_update_at = NOW() AT TIME ZONE 'UTC',
          updated_at = NOW() AT TIME ZONE 'UTC'
      WHERE bot_id = $3;
    `;
    await pool.query(query, [state, errorSummary, botId]);
  }

  /**
   * Update desired enabled flag (e.g. from future dashboard)
   */
  public async updateDesiredState(botId: string, enabled: boolean): Promise<void> {
    const query = `
      UPDATE bot_configurations
      SET desired_enabled = $1,
          updated_at = NOW() AT TIME ZONE 'UTC'
      WHERE bot_id = $2;
    `;
    await pool.query(query, [enabled, botId]);
  }

  /**
   * Update presence/status text (e.g. from future dashboard)
   */
  public async updateStatusConfig(botId: string, text: string, type: string): Promise<void> {
    const query = `
      UPDATE bot_configurations
      SET status_text = $1,
          status_type = $2,
          updated_at = NOW() AT TIME ZONE 'UTC'
      WHERE bot_id = $3;
    `;
    await pool.query(query, [text, type, botId]);
  }

  /**
   * Update assigned commands
   */
  public async updateAssignedCommands(botId: string, commands: string[]): Promise<void> {
    const query = `
      UPDATE bot_configurations
      SET assigned_commands = $1,
          updated_at = NOW() AT TIME ZONE 'UTC'
      WHERE bot_id = $2;
    `;
    await pool.query(query, [commands, botId]);
  }

  /**
   * Fetch all configurations for future dashboard
   */
  public async getAllConfigs(): Promise<PersistentBotConfig[]> {
    const query = `
      SELECT bot_id, display_name, desired_enabled, observed_state, status_text,
             status_type, assigned_commands, last_started_at, last_status_update_at,
             last_error, updated_at
      FROM bot_configurations
      ORDER BY bot_id ASC;
    `;
    const res = await pool.query<BotConfigRow>(query);
    return res.rows.map(mapRow);
  }
}

export const botConfigRepository = new BotConfigRepository();
