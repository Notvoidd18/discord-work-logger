import { pool } from '../pool';
import { WorkLog, CreateWorkLogDTO } from '../../types/workLog';

interface WorkLogRow {
  id: string;
  guild_id: string;
  channel_id: string;
  user_id: string;
  username: string;
  description: string;
  created_at: Date;
}

function mapRowToWorkLog(row: WorkLogRow): WorkLog {
  return {
    id: row.id.toString(),
    guildId: row.guild_id,
    channelId: row.channel_id,
    userId: row.user_id,
    username: row.username,
    description: row.description,
    createdAt: new Date(row.created_at),
  };
}

export class WorkLogRepository {
  /**
   * Persist a new work log entry
   */
  public async createLog(dto: CreateWorkLogDTO): Promise<WorkLog> {
    const query = `
      INSERT INTO work_logs (guild_id, channel_id, user_id, username, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, guild_id, channel_id, user_id, username, description, created_at;
    `;

    const values = [
      dto.guildId,
      dto.channelId,
      dto.userId,
      dto.username,
      dto.description,
    ];

    const result = await pool.query<WorkLogRow>(query, values);
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Database failed to return inserted work log record.');
    }

    return mapRowToWorkLog(result.rows[0]);
  }

  /**
   * Fetch a single work log by ID and guild ID (for future !logview command)
   */
  public async getLogById(id: string | number, guildId: string): Promise<WorkLog | null> {
    const query = `
      SELECT id, guild_id, channel_id, user_id, username, description, created_at
      FROM work_logs
      WHERE id = $1 AND guild_id = $2;
    `;

    const result = await pool.query<WorkLogRow>(query, [id, guildId]);
    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToWorkLog(result.rows[0]);
  }

  /**
   * Fetch recent work logs for a guild (for !logs / /listlog command)
   */
  public async getRecentLogs(guildId: string, limit: number = 25): Promise<WorkLog[]> {
    const query = `
      SELECT id, guild_id, channel_id, user_id, username, description, created_at
      FROM work_logs
      WHERE guild_id = $1
      ORDER BY id ASC
      LIMIT $2;
    `;

    const result = await pool.query<WorkLogRow>(query, [guildId, limit]);
    return result.rows.map(mapRowToWorkLog);
  }

  /**
   * Get total count of logs for a guild
   */
  public async getTotalLogCount(guildId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) AS total
      FROM work_logs
      WHERE guild_id = $1;
    `;

    const result = await pool.query<{ total: string }>(query, [guildId]);
    return parseInt(result.rows[0]?.total || '0', 10);
  }

  /**
   * Fetch work logs filtered by user (for future !logs @user command)
   */
  public async getLogsByUser(guildId: string, userId: string, limit: number = 10): Promise<WorkLog[]> {
    const query = `
      SELECT id, guild_id, channel_id, user_id, username, description, created_at
      FROM work_logs
      WHERE guild_id = $1 AND user_id = $2
      ORDER BY created_at DESC
      LIMIT $3;
    `;

    const result = await pool.query<WorkLogRow>(query, [guildId, userId, limit]);
    return result.rows.map(mapRowToWorkLog);
  }
}

export const workLogRepository = new WorkLogRepository();
