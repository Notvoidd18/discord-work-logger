/**
 * WorkLog interface representing a persisted database record
 */
export interface WorkLog {
  id: string; // Database ID (stringified for safe large BIGINT handling)
  guildId: string;
  channelId: string;
  userId: string;
  username: string;
  description: string;
  createdAt: Date;
}

/**
 * Data Transfer Object for creating a new work log entry
 */
export interface CreateWorkLogDTO {
  guildId: string;
  channelId: string;
  userId: string;
  username: string;
  description: string;
}

/**
 * Format raw database ID into user-friendly display format (e.g. #0001)
 */
export function formatLogId(id: string | number): string {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(numericId)) {
    return `#${id}`;
  }
  return `#${numericId.toString().padStart(4, '0')}`;
}
