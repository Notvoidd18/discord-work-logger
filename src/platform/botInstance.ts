import {
  Client,
  GatewayIntentBits,
  ActivityType,
  Events,
} from 'discord.js';
import {
  BotDefinition,
  PersistentBotConfig,
  BotRuntimeStatus,
  BotObservedState,
  SanitizedLogEntry,
} from './types';
import { botConfigRepository } from '../database/repositories/botConfigRepository';
import { resolveBotToken, resolveBotClientId } from '../config/env';
import { handleReady } from '../events/ready';
import { handleMessageCreate } from '../events/messageCreate';
import { handleInteractionCreate } from '../events/interactionCreate';
import { Logger, logger } from '../utils/logger';

export class BotInstance {
  public readonly id: string;
  public displayName: string;
  public readonly brandWatermark: string;
  public prefix: string;
  public client: Client;
  public readonly botLogger: Logger;

  private definition: BotDefinition;
  private persistentConfig: PersistentBotConfig | null = null;
  private token: string | null = null;
  private clientId?: string;
  private startTime: Date | null = null;
  private isExplicitlyStopped: boolean = false;
  private hasMessageContentIntent: boolean = true;
  private logsBuffer: SanitizedLogEntry[] = [];
  private static readonly MAX_LOGS = 100;

  constructor(def: BotDefinition) {
    this.definition = def;
    this.id = def.id;
    this.displayName = def.displayName;
    this.brandWatermark = def.brandWatermark || 'Hosting on Ongrywolf';
    this.prefix = def.defaultPrefix || '!';
    this.botLogger = logger.forBot(def.id);

    // Independent Discord Client for this bot instance
    this.client = this.buildClient(true);
  }

  private pushLog(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', rawMessage: string) {
    // Redact tokens or secrets
    let sanitized = rawMessage;
    if (this.token) {
      sanitized = sanitized.split(this.token).join('[REDACTED_TOKEN]');
    }
    // Redact Discord tokens pattern (base64.signature)
    sanitized = sanitized.replace(/[MNO][a-zA-Z0-9_-]{23,25}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27}/g, '[REDACTED_TOKEN]');

    this.logsBuffer.unshift({
      timestamp: new Date().toISOString(),
      level,
      message: sanitized,
    });

    if (this.logsBuffer.length > BotInstance.MAX_LOGS) {
      this.logsBuffer.pop();
    }
  }

  public getSanitizedLogs(): SanitizedLogEntry[] {
    return [...this.logsBuffer];
  }

  private buildClient(withMessageContent: boolean): Client {
    const intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ];

    if (withMessageContent) {
      intents.push(GatewayIntentBits.MessageContent);
    }

    const client = new Client({ intents });
    this.bindEvents(client);
    return client;
  }

  private bindEvents(client: Client): void {
    client.once(Events.ClientReady, async () => {
      if (this.isExplicitlyStopped) {
        try {
          client.destroy();
        } catch (_) {}
        return;
      }
      this.startTime = new Date();
      this.pushLog('INFO', `Client connected as ${client.user?.tag} (ID: ${client.user?.id})`);
      try {
        await handleReady(this);
      } catch (err: any) {
        this.botLogger.error(`Error in handleReady:`, err);
      }
    });

    client.on(Events.MessageCreate, async (message) => {
      await handleMessageCreate(this, message);
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      await handleInteractionCreate(this, interaction);
    });

    client.on(Events.ShardError, async (error) => {
      this.botLogger.error('Discord gateway shard error:', error);
      this.pushLog('ERROR', `Gateway shard error: ${error.message}`);
      await this.setObservedState('error', error.message);
    });

    client.on(Events.ShardDisconnect, async (event, shardId) => {
      this.botLogger.warn(`Shard ${shardId} disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
      this.pushLog('WARN', `Gateway disconnected (code ${event.code})`);
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
      this.botLogger.error('Failed to load persistent config from database (using in-memory fallback):', dbErr);
    }

    if (!this.persistentConfig) {
      this.persistentConfig = {
        botId: this.id,
        displayName: this.displayName,
        desiredEnabled: true,
        observedState: 'offline',
        statusText: this.definition.defaultStatusText,
        statusType: 'Custom',
        assignedCommands: this.definition.defaultCommands,
        lastStartedAt: null,
        lastStatusUpdateAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      };
    }

    // Explicit token takes priority (e.g. provisioned dynamically via Render 2 management API)
    if (this.definition.explicitToken?.trim()) {
      this.token = this.definition.explicitToken.trim();
      this.clientId = this.definition.applicationId;
      this.pushLog('INFO', 'Loaded credentials provisioned via Management API.');
      return true;
    }

    if (this.definition.tokenEnvVar) {
      const { token, sourceVar } = resolveBotToken(
        this.definition.tokenEnvVar,
        this.definition.fallbackTokenEnvVar
      );

      this.token = token || null;
      this.clientId = resolveBotClientId(
        this.definition.clientIdEnvVar,
        this.definition.fallbackClientIdEnvVar
      ) || this.definition.applicationId;

      if (this.token) {
        this.botLogger.debug(`Token loaded from environment variable: ${sourceVar}`);
        this.pushLog('INFO', `Token loaded from environment variable: ${sourceVar}`);
      } else {
        this.pushLog('WARN', `Token environment variable "${this.definition.tokenEnvVar}" is not set.`);
      }
    }

    return Boolean(this.token);
  }

  public setToken(newToken: string): void {
    this.token = newToken.trim();
    this.definition.explicitToken = this.token;
    this.pushLog('INFO', 'Bot token rotated successfully.');
  }

  public getStatusText(): string {
    return this.persistentConfig?.statusText || this.definition.defaultStatusText;
  }

  public resolveActivityType(type?: string | ActivityType): ActivityType {
    if (typeof type === 'number') return type;
    if (!type) return ActivityType.Custom;
    const t = String(type).toLowerCase();
    if (t === 'playing' || t === '0') return ActivityType.Playing;
    if (t === 'streaming' || t === '1') return ActivityType.Streaming;
    if (t === 'listening' || t === '2') return ActivityType.Listening;
    if (t === 'watching' || t === '3') return ActivityType.Watching;
    if (t === 'competing' || t === '5') return ActivityType.Competing;
    return ActivityType.Custom;
  }

  public getStatusType(): ActivityType {
    if (!this.persistentConfig?.statusType) return this.definition.defaultStatusType;
    return this.resolveActivityType(this.persistentConfig.statusType);
  }

  /**
   * Applies presence and watermark to Discord client immediately
   */
  public applyPresence(override?: {
    statusMode?: 'online' | 'idle' | 'dnd' | 'invisible';
    statusType?: string | ActivityType;
    statusText?: string;
    streamingUrl?: string;
  }): void {
    if (!this.client || !this.client.isReady() || !this.client.user) return;

    const mode =
      override?.statusMode ||
      this.persistentConfig?.onlineMode ||
      this.definition.defaultOnlineMode ||
      'online';
    const text = override?.statusText !== undefined ? override.statusText : this.getStatusText();
    const rawType = override?.statusType || this.persistentConfig?.statusType || this.getStatusType();
    const resolvedType = this.resolveActivityType(rawType);
    const streamUrl = override?.streamingUrl || this.persistentConfig?.streamingUrl;

    const activity: any = {
      name: text,
      type: resolvedType,
      state: text,
    };

    if (resolvedType === ActivityType.Streaming && streamUrl) {
      activity.url = streamUrl;
    }

    try {
      this.client.user.setPresence({
        status: mode as any,
        activities: [activity],
      });
      this.pushLog(
        'INFO',
        `Presence broadcasted: mode=${mode}, type=${ActivityType[resolvedType] || resolvedType}, status="${text}"`
      );
    } catch (presenceErr: any) {
      this.botLogger.error('Failed to set presence:', presenceErr);
    }
  }

  public isDesiredEnabled(): boolean {
    if (this.isExplicitlyStopped) return false;
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
    if (this.persistentConfig) {
      this.persistentConfig.desiredEnabled = true;
    }

    if (!this.token) {
      this.botLogger.warn(`Cannot start bot "${this.id}": missing token.`);
      this.pushLog('WARN', 'Cannot start: token is missing.');
      await this.setObservedState('offline', 'Token missing from configuration');
      return;
    }

    if (!this.isDesiredEnabled()) {
      this.botLogger.info(`Bot "${this.id}" is marked disabled in configuration. Skipping login.`);
      this.pushLog('INFO', 'Bot is marked disabled in configuration.');
      await this.setObservedState('stopped');
      return;
    }

    // Always rebuild fresh Discord Client upon start/restart to guarantee fresh gateway event bindings
    try {
      if (this.client) {
        try {
          this.client.destroy();
        } catch (_) {}
      }
      this.client = this.buildClient(this.hasMessageContentIntent);
    } catch (buildErr: any) {
      this.botLogger.error(`Failed to build fresh client for ${this.displayName}:`, buildErr);
    }

    try {
      this.botLogger.info(`Connecting ${this.displayName} to Discord gateway...`);
      this.pushLog('INFO', `Connecting ${this.displayName} to Discord Gateway...`);
      await this.setObservedState('connecting');
      await this.client.login(this.token);
    } catch (loginError: any) {
      const errMsg = loginError?.message || String(loginError);

      if (
        this.hasMessageContentIntent &&
        (errMsg.toLowerCase().includes('disallowed intents') || errMsg.includes('4014'))
      ) {
        this.pushLog('WARN', 'Privileged MessageContent intent disallowed; reconnecting with basic intents...');
        try {
          this.client.destroy();
        } catch (_) {}

        this.hasMessageContentIntent = false;
        this.client = this.buildClient(false);

        try {
          await this.client.login(this.token);
          return;
        } catch (fallbackError: any) {
          const fallbackMsg = fallbackError?.message || String(fallbackError);
          this.pushLog('ERROR', `Fallback login failed: ${fallbackMsg}`);
          await this.setObservedState('error', fallbackMsg);
          return;
        }
      }

      this.botLogger.error(`Failed to login to Discord for ${this.displayName}:`, errMsg);
      this.pushLog('ERROR', `Login failed: ${errMsg}`);
      await this.setObservedState('error', errMsg);
    }
  }

  /**
   * Stop this bot instance safely
   */
  public async stop(): Promise<void> {
    this.isExplicitlyStopped = true;
    if (this.persistentConfig) {
      this.persistentConfig.desiredEnabled = false;
    }
    this.botLogger.info(`Stopping bot "${this.id}"...`);
    this.pushLog('INFO', `Stopping bot "${this.id}"...`);

    try {
      this.client.destroy();
      this.startTime = null;
      await this.setObservedState('offline');
      this.pushLog('INFO', 'Bot disconnected and stopped.');
    } catch (err: any) {
      this.botLogger.error(`Error destroying client for "${this.id}":`, err);
      this.pushLog('ERROR', `Error stopping: ${err.message}`);
    }
  }

  /**
   * Restart bot safely
   */
  public async restart(): Promise<void> {
    this.pushLog('INFO', 'Initiating restart sequence...');
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.start();
  }

  /**
   * Returns runtime telemetry
   */
  public getRuntimeStatus(): BotRuntimeStatus {
    const isReady = this.client.isReady();
    const uptimeSeconds = this.startTime && isReady ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : null;

    let gatewayStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
    if (isReady) gatewayStatus = 'connected';
    else if (this.persistentConfig?.observedState === 'connecting') gatewayStatus = 'connecting';

    return {
      id: this.id,
      displayName: this.displayName,
      applicationId: this.clientId || this.definition.applicationId,
      botId: this.client.user?.id,
      username: this.client.user ? `${this.client.user.username}#${this.client.user.discriminator === '0' ? '' : this.client.user.discriminator}`.replace(/#$/, '') : undefined,
      avatarUrl: this.client.user?.displayAvatarURL() || undefined,
      ownerAccount: this.definition.ownerAccount || 'notvoid18',
      desiredEnabled: this.isDesiredEnabled(),
      observedState: isReady ? 'online' : (this.persistentConfig?.observedState || 'offline'),
      statusText: this.getStatusText(),
      statusType: this.persistentConfig?.statusType || 'Custom',
      onlineMode: this.persistentConfig?.onlineMode || this.definition.defaultOnlineMode || 'online',
      streamingUrl: this.persistentConfig?.streamingUrl,
      prefix: this.prefix,
      assignedCommands: this.persistentConfig?.assignedCommands || this.definition.defaultCommands,
      enabledModules: this.definition.enabledModules || ['work_logs'],
      version: this.definition.version || '1.0.0',
      gatewayStatus,
      uptimeSeconds,
      pingMs: isReady ? Math.round(this.client.ws.ping) : null,
      guildCount: isReady ? this.client.guilds.cache.size : 0,
      lastStartedAt: this.startTime ? this.startTime.toISOString() : null,
      lastStatusUpdateAt: this.persistentConfig?.lastStatusUpdateAt?.toISOString() || new Date().toISOString(),
      lastError: this.persistentConfig?.lastError || null,
      configuredInEnv: Boolean(this.token),
      resourceUsage: {
        memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };
  }

  /**
   * Updates bot configuration
   */
  public async updateConfig(updates: {
    displayName?: string;
    desiredEnabled?: boolean;
    statusText?: string;
    statusType?: string;
    onlineMode?: 'online' | 'idle' | 'dnd' | 'invisible';
    streamingUrl?: string;
    prefix?: string;
    assignedCommands?: string[];
    enabledModules?: string[];
    token?: string;
  }): Promise<void> {
    if (updates.displayName) {
      this.displayName = updates.displayName;
      this.definition.displayName = updates.displayName;
    }
    if (updates.prefix) {
      this.prefix = updates.prefix;
      this.definition.defaultPrefix = updates.prefix;
    }
    if (updates.token) {
      this.setToken(updates.token);
    }
    if (updates.enabledModules) {
      this.definition.enabledModules = updates.enabledModules;
    }
    if (updates.desiredEnabled !== undefined) {
      try {
        await botConfigRepository.updateDesiredState(this.id, updates.desiredEnabled);
      } catch (err) {
        this.botLogger.error('DB updateDesiredState notice (using memory):', err);
      }
      if (this.persistentConfig) this.persistentConfig.desiredEnabled = updates.desiredEnabled;
    }

    if (updates.onlineMode !== undefined && this.persistentConfig) {
      this.persistentConfig.onlineMode = updates.onlineMode;
    }
    if (updates.streamingUrl !== undefined && this.persistentConfig) {
      this.persistentConfig.streamingUrl = updates.streamingUrl;
    }
    if (updates.statusType !== undefined && this.persistentConfig) {
      this.persistentConfig.statusType = updates.statusType;
    }
    if (updates.statusText !== undefined) {
      this.definition.defaultStatusText = updates.statusText;
      const type = updates.statusType || this.persistentConfig?.statusType || 'Custom';
      try {
        await botConfigRepository.updateStatusConfig(this.id, updates.statusText, type);
      } catch (err) {
        this.botLogger.error('DB updateStatusConfig notice (using memory):', err);
      }
      if (this.persistentConfig) {
        this.persistentConfig.statusText = updates.statusText;
        this.persistentConfig.statusType = type;
      }
    }

    if (updates.assignedCommands !== undefined) {
      try {
        await botConfigRepository.updateAssignedCommands(this.id, updates.assignedCommands);
      } catch (err) {
        this.botLogger.error('DB updateAssignedCommands notice (using memory):', err);
      }
      if (this.persistentConfig) this.persistentConfig.assignedCommands = updates.assignedCommands;
    }

    // Apply live presence to Discord immediately!
    if (this.client && this.client.isReady()) {
      this.applyPresence({
        statusMode: updates.onlineMode,
        statusType: updates.statusType,
        statusText: updates.statusText,
        streamingUrl: updates.streamingUrl,
      });
    }

    this.pushLog('INFO', 'Configuration updated and applied live to Discord.');
  }
}
