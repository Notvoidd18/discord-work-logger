import {
  Client,
  GatewayIntentBits,
  ActivityType,
} from 'discord.js';
import {
  BotDefinition,
  PersistentBotConfig,
  BotRuntimeStatus,
  BotObservedState,
} from './types';
import { botConfigRepository } from '../database/repositories/botConfigRepository';
import { resolveBotToken, resolveBotClientId } from '../config/env';
import { getSlashCommandsForBot } from '../commands/slashDefinitions';
import { handleReady } from '../events/ready';
import { handleMessageCreate } from '../events/messageCreate';
import { handleInteractionCreate } from '../events/interactionCreate';
import { Logger, logger } from '../utils/logger';

export class BotInstance {
  public readonly id: string;
  public readonly displayName: string;
  public readonly brandWatermark: string;
  public readonly prefix: string;
  public readonly client: Client;
  public readonly botLogger: Logger;

  private definition: BotDefinition;
  private persistentConfig: PersistentBotConfig | null = null;
  private token: string | null = null;
  private clientId?: string;
  private startTime: Date | null = null;
  private isExplicitlyStopped: boolean = false;

  constructor(def: BotDefinition) {
    this.definition = def;
    this.id = def.id;
    this.displayName = def.displayName;
    this.brandWatermark = def.brandWatermark;
    this.prefix = def.defaultPrefix;
    this.botLogger = logger.forBot(def.id);

    // Independent Discord Client for this bot instance
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.bindEvents();
  }

  private bindEvents(): void {
    this.client.once('ready', async () => {
      this.startTime = new Date();
      await handleReady(this);
    });

    this.client.on('messageCreate', async (message) => {
      await handleMessageCreate(this, message);
    });

    this.client.on('interactionCreate', async (interaction) => {
      await handleInteractionCreate(this, interaction);
    });

    this.client.on('shardError', async (error) => {
      this.botLogger.error('Discord gateway shard error:', error);
      await this.setObservedState('error', error.message);
    });

    this.client.on('shardDisconnect', async (event, shardId) => {
      this.botLogger.warn(`Shard ${shardId} disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
      if (!this.isExplicitlyStopped) {
        await this.setObservedState('offline', `Disconnected (code ${event.code})`);
      }
    });
  }

  /**
   * Initializes persistent config and checks token availability
   */
  public async initConfig(): Promise<boolean> {
    try {
      this.persistentConfig = await botConfigRepository.getOrCreateBotConfig(this.definition);
    } catch (dbErr) {
      this.botLogger.error('Failed to load persistent config from database:', dbErr);
      return false;
    }

    const { token, sourceVar } = resolveBotToken(
      this.definition.tokenEnvVar,
      this.definition.fallbackTokenEnvVar
    );

    this.token = token || null;
    this.clientId = resolveBotClientId(
      this.definition.clientIdEnvVar,
      this.definition.fallbackClientIdEnvVar
    );

    if (this.token) {
      this.botLogger.debug(`Token loaded from environment variable: ${sourceVar}`);
    } else {
      this.botLogger.info(
        `Token environment variable "${this.definition.tokenEnvVar}" is not set. Bot is available but idle.`
      );
    }

    return Boolean(this.token);
  }

  public getStatusText(): string {
    return this.persistentConfig?.statusText || this.definition.defaultStatusText;
  }

  public getStatusType(): ActivityType {
    if (!this.persistentConfig?.statusType) return this.definition.defaultStatusType;
    const t = this.persistentConfig.statusType.toLowerCase();
    if (t === 'playing' || t === '0') return ActivityType.Playing;
    if (t === 'watching' || t === '3') return ActivityType.Watching;
    if (t === 'listening' || t === '2') return ActivityType.Listening;
    return ActivityType.Custom;
  }

  public isDesiredEnabled(): boolean {
    return this.persistentConfig?.desiredEnabled ?? true;
  }

  public hasToken(): boolean {
    return Boolean(this.token);
  }

  public async setObservedState(state: BotObservedState, errorSummary: string | null = null): Promise<void> {
    try {
      await botConfigRepository.updateObservedState(this.id, state, errorSummary);
      if (this.persistentConfig) {
        this.persistentConfig.observedState = state;
        this.persistentConfig.lastError = errorSummary;
        this.persistentConfig.lastStatusUpdateAt = new Date();
      }
    } catch (err) {
      this.botLogger.error(`Failed to update observed state to ${state}:`, err);
    }
  }

  /**
   * Start this bot instance safely
   */
  public async start(): Promise<void> {
    this.isExplicitlyStopped = false;

    if (!this.token) {
      this.botLogger.warn(`Cannot start bot "${this.id}": missing token (${this.definition.tokenEnvVar}).`);
      await this.setObservedState('offline', `Missing environment variable ${this.definition.tokenEnvVar}`);
      return;
    }

    if (!this.isDesiredEnabled()) {
      this.botLogger.info(`Bot "${this.id}" is marked disabled in configuration. Skipping login.`);
      await this.setObservedState('stopped');
      return;
    }

    try {
      this.botLogger.info(`Connecting ${this.displayName} to Discord gateway...`);
      await this.setObservedState('connecting');
      await this.client.login(this.token);
    } catch (loginError: any) {
      const errMsg = loginError?.message || String(loginError);
      this.botLogger.error(`Failed to login to Discord for ${this.displayName}:`, errMsg);
      await this.setObservedState('error', errMsg);
      // We do not rethrow so one bot failing does not crash other running bots!
    }
  }

  /**
   * Stop this bot instance safely
   */
  public async stop(): Promise<void> {
    this.isExplicitlyStopped = true;
    this.botLogger.info(`Stopping bot "${this.id}"...`);

    try {
      this.client.destroy();
      await this.setObservedState('offline');
      this.botLogger.info(`Bot "${this.id}" successfully stopped.`);
    } catch (err) {
      this.botLogger.error(`Error destroying client for "${this.id}":`, err);
    }
  }

  /**
   * Returns runtime telemetry
   */
  public getRuntimeStatus(): BotRuntimeStatus {
    const isReady = this.client.isReady();
    const uptimeSeconds = this.startTime && isReady ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : null;

    return {
      id: this.id,
      displayName: this.displayName,
      desiredEnabled: this.isDesiredEnabled(),
      observedState: isReady ? 'online' : (this.persistentConfig?.observedState || 'offline'),
      statusText: this.getStatusText(),
      assignedCommands: this.persistentConfig?.assignedCommands || this.definition.defaultCommands,
      uptimeSeconds,
      pingMs: isReady ? Math.round(this.client.ws.ping) : null,
      guildCount: isReady ? this.client.guilds.cache.size : 0,
      lastStartedAt: this.startTime ? this.startTime.toISOString() : null,
      lastStatusUpdateAt: this.persistentConfig?.lastStatusUpdateAt?.toISOString() || new Date().toISOString(),
      lastError: this.persistentConfig?.lastError || null,
      configuredInEnv: Boolean(this.token),
    };
  }

  /**
   * Updates bot configuration (for future dashboard)
   */
  public async updateConfig(updates: {
    desiredEnabled?: boolean;
    statusText?: string;
    statusType?: string;
    assignedCommands?: string[];
  }): Promise<void> {
    if (updates.desiredEnabled !== undefined) {
      await botConfigRepository.updateDesiredState(this.id, updates.desiredEnabled);
      if (this.persistentConfig) this.persistentConfig.desiredEnabled = updates.desiredEnabled;
    }
    if (updates.statusText !== undefined) {
      const type = updates.statusType || this.persistentConfig?.statusType || 'Custom';
      await botConfigRepository.updateStatusConfig(this.id, updates.statusText, type);
      if (this.persistentConfig) {
        this.persistentConfig.statusText = updates.statusText;
        this.persistentConfig.statusType = type;
      }
      // Apply presence dynamically if online
      if (this.client.isReady()) {
        this.client.user?.setPresence({
          status: 'online',
          activities: [{ name: updates.statusText, type: this.getStatusType(), state: updates.statusText }],
        });
      }
    }
    if (updates.assignedCommands !== undefined) {
      await botConfigRepository.updateAssignedCommands(this.id, updates.assignedCommands);
      if (this.persistentConfig) this.persistentConfig.assignedCommands = updates.assignedCommands;
    }
  }
}
