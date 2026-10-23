import { ActivityType } from 'discord.js';
import { BotDefinition, BotRuntimeStatus } from './types';
import { BotInstance } from './botInstance';
import { botConfigRepository } from '../database/repositories/botConfigRepository';
import { logger } from '../utils/logger';

export class BotManager {
  private bots = new Map<string, BotInstance>();
  private definitions = new Map<string, BotDefinition>();

  constructor() {
    this.registerDefaultBots();
  }

  /**
   * Registers baseline bots configured in the platform
   */
  private registerDefaultBots(): void {
    // Bot 1: Manager (Existing Staff Work Logger & Settings)
    this.registerBot({
      id: 'manager',
      displayName: 'Ongrywolf Manager',
      tokenEnvVar: 'BOT_MANAGER_TOKEN',
      fallbackTokenEnvVar: 'DISCORD_TOKEN', // Full backward compatibility with existing Render deploy
      clientIdEnvVar: 'BOT_MANAGER_CLIENT_ID',
      fallbackClientIdEnvVar: 'DISCORD_CLIENT_ID',
      defaultPrefix: '!',
      defaultStatusText: 'Hosting on Ongrywolf PRV',
      defaultStatusType: ActivityType.Custom,
      brandWatermark: 'Hosting on Ongrywolf',
      defaultCommands: ['log', 'listlog', 'channellog'],
    });

    // Bot 2: Orders (Customer & Staff Orders Platform)
    this.registerBot({
      id: 'orders',
      displayName: 'Ongrywolf Orders',
      tokenEnvVar: 'BOT_ORDERS_TOKEN',
      clientIdEnvVar: 'BOT_ORDERS_CLIENT_ID',
      defaultPrefix: '!',
      defaultStatusText: 'Hosting on Ongrywolf',
      defaultStatusType: ActivityType.Custom,
      brandWatermark: 'Hosting on Ongrywolf',
      defaultCommands: ['order', 'orders', 'orderstatus'],
    });
  }

  /**
   * Register a new bot into the manager
   */
  public registerBot(def: BotDefinition): void {
    if (this.definitions.has(def.id)) {
      logger.warn(`Bot definition "${def.id}" already exists. Overwriting.`);
    }
    this.definitions.set(def.id, def);
    this.bots.set(def.id, new BotInstance(def));
    logger.debug(`Registered bot definition: ${def.id} (${def.displayName})`);
  }

  /**
   * Initialize all bot configurations against the database and environment variables
   */
  public async initAll(): Promise<void> {
    logger.info('Initializing multi-bot platform configurations...');
    // Mark prior states offline to prevent stale state across restarts
    await botConfigRepository.markAllOfflineOnStartup();

    for (const [id, bot] of this.bots) {
      await bot.initConfig();
    }
  }

  /**
   * Start all bots that have tokens and are enabled
   */
  public async startAll(): Promise<void> {
    logger.info('Starting configured Discord bots...');

    const startPromises = Array.from(this.bots.values()).map(async (bot) => {
      try {
        await bot.start();
      } catch (err) {
        logger.error(`Error starting bot "${bot.id}":`, err);
      }
    });

    await Promise.allSettled(startPromises);
  }

  /**
   * Start a single bot by ID
   */
  public async startBot(id: string): Promise<boolean> {
    const bot = this.bots.get(id);
    if (!bot) {
      logger.error(`Cannot start bot "${id}": bot not registered.`);
      return false;
    }
    await bot.start();
    return true;
  }

  /**
   * Stop a single bot by ID
   */
  public async stopBot(id: string): Promise<boolean> {
    const bot = this.bots.get(id);
    if (!bot) {
      logger.error(`Cannot stop bot "${id}": bot not registered.`);
      return false;
    }
    await bot.stop();
    return true;
  }

  /**
   * Graceful shutdown of all bots
   */
  public async stopAll(): Promise<void> {
    logger.info('Shutting down all bot instances...');
    const stopPromises = Array.from(this.bots.values()).map((bot) => bot.stop());
    await Promise.allSettled(stopPromises);
    logger.info('All bot instances have been stopped.');
  }

  public getBot(id: string): BotInstance | undefined {
    return this.bots.get(id);
  }

  public getAllBots(): BotInstance[] {
    return Array.from(this.bots.values());
  }

  public getAllRuntimeStatuses(): BotRuntimeStatus[] {
    return Array.from(this.bots.values()).map((bot) => bot.getRuntimeStatus());
  }

  public getSummary() {
    const statuses = this.getAllRuntimeStatuses();
    return {
      platform: 'Ongrywolf Multi-Bot Platform',
      totalBots: statuses.length,
      onlineBots: statuses.filter((s) => s.observedState === 'online').length,
      configuredBots: statuses.filter((s) => s.configuredInEnv).length,
      bots: statuses,
    };
  }
}

export const botManager = new BotManager();
