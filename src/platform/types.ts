import { ActivityType } from 'discord.js';

export type BotObservedState = 'offline' | 'connecting' | 'online' | 'error' | 'stopped';

/**
 * Definition of a bot in the platform
 */
export interface BotDefinition {
  id: string; // e.g. 'main', 'bot_a', 'user_bot_1'
  displayName: string;
  tokenEnvVar?: string;
  clientIdEnvVar?: string;
  fallbackTokenEnvVar?: string;
  fallbackClientIdEnvVar?: string;
  explicitToken?: string; // Direct token provisioned securely via Render 2 API
  applicationId?: string;
  ownerAccount?: string; // e.g. 'notvoid18' or discord user id
  defaultPrefix: string;
  defaultStatusText: string;
  defaultStatusType: ActivityType;
  brandWatermark: string;
  defaultCommands: string[];
  enabledModules?: string[];
  version?: string;
}

/**
 * Persistent configuration stored in PostgreSQL
 */
export interface PersistentBotConfig {
  botId: string;
  displayName: string;
  desiredEnabled: boolean;
  observedState: BotObservedState;
  statusText: string;
  statusType: string;
  assignedCommands: string[];
  lastStartedAt: Date | null;
  lastStatusUpdateAt: Date;
  lastError: string | null;
  updatedAt: Date;
}

/**
 * Live runtime state of a bot in the manager (safe for dashboard, tokens never exposed)
 */
export interface BotRuntimeStatus {
  id: string;
  displayName: string;
  applicationId?: string;
  botId?: string; // Discord snowflake user ID
  username?: string;
  avatarUrl?: string;
  ownerAccount?: string;
  desiredEnabled: boolean;
  observedState: BotObservedState;
  statusText: string;
  statusType?: string;
  prefix: string;
  assignedCommands: string[];
  enabledModules: string[];
  version: string;
  gatewayStatus: 'connected' | 'connecting' | 'disconnected';
  uptimeSeconds: number | null;
  pingMs: number | null;
  guildCount: number;
  lastStartedAt: string | null;
  lastStatusUpdateAt: string;
  lastError: string | null;
  configuredInEnv: boolean;
  resourceUsage?: {
    memoryMb: number;
  };
}

/**
 * DTO for updating bot configuration from Render 2 website
 */
export interface UpdateBotConfigDTO {
  displayName?: string;
  desiredEnabled?: boolean;
  statusText?: string;
  statusType?: string;
  prefix?: string;
  assignedCommands?: string[];
  enabledModules?: string[];
  token?: string; // Token rotation
}

/**
 * Single sanitized log entry
 */
export interface SanitizedLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
}
