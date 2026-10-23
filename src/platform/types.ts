import { ActivityType } from 'discord.js';

export type BotObservedState = 'offline' | 'connecting' | 'online' | 'error' | 'stopped';

/**
 * Definition of a bot in the platform
 */
export interface BotDefinition {
  id: string; // e.g. 'manager', 'orders'
  displayName: string; // e.g. 'Ongrywolf Manager', 'Ongrywolf Orders'
  tokenEnvVar: string; // e.g. 'BOT_MANAGER_TOKEN', 'BOT_ORDERS_TOKEN'
  clientIdEnvVar?: string; // e.g. 'BOT_MANAGER_CLIENT_ID', 'BOT_ORDERS_CLIENT_ID'
  fallbackTokenEnvVar?: string; // e.g. 'DISCORD_TOKEN' for backward compatibility
  fallbackClientIdEnvVar?: string; // e.g. 'DISCORD_CLIENT_ID'
  defaultPrefix: string;
  defaultStatusText: string;
  defaultStatusType: ActivityType;
  brandWatermark: string;
  defaultCommands: string[];
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
 * Live runtime state of a bot in the manager
 */
export interface BotRuntimeStatus {
  id: string;
  displayName: string;
  desiredEnabled: boolean;
  observedState: BotObservedState;
  statusText: string;
  assignedCommands: string[];
  uptimeSeconds: number | null;
  pingMs: number | null;
  guildCount: number;
  lastStartedAt: string | null;
  lastStatusUpdateAt: string;
  lastError: string | null;
  configuredInEnv: boolean;
}

/**
 * DTO for updating bot configuration (e.g. from future dashboard)
 */
export interface UpdateBotConfigDTO {
  displayName?: string;
  desiredEnabled?: boolean;
  statusText?: string;
  statusType?: string;
  assignedCommands?: string[];
}
