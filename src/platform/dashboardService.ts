import { BotRuntimeStatus, PersistentBotConfig, UpdateBotConfigDTO, BotDefinition } from './types';
import { botManager } from './botManager';
import { botConfigRepository } from '../database/repositories/botConfigRepository';

/**
 * Interface defining the contract for future website dashboard integration
 */
export interface IBotManagementDashboardService {
  /**
   * Lists all bots with live runtime telemetry (safe for dashboard, no tokens exposed)
   */
  listBots(): Promise<BotRuntimeStatus[]>;

  /**
   * Retrieves single bot runtime telemetry
   */
  getBot(botId: string): Promise<BotRuntimeStatus | null>;

  /**
   * Enables or disables a bot's desired state
   */
  setBotEnabled(botId: string, enabled: boolean): Promise<boolean>;

  /**
   * Starts an enabled bot
   */
  startBot(botId: string): Promise<boolean>;

  /**
   * Stops a running bot
   */
  stopBot(botId: string): Promise<boolean>;

  /**
   * Updates presence text or assigned commands
   */
  updateBotConfiguration(botId: string, updates: UpdateBotConfigDTO): Promise<boolean>;

  /**
   * Registers a new bot definition dynamically
   */
  registerNewBot(def: BotDefinition): Promise<void>;

  /**
   * Retrieves persistent configuration records from the database
   */
  getPersistentConfigs(): Promise<PersistentBotConfig[]>;
}

export class BotManagementDashboardService implements IBotManagementDashboardService {
  public async listBots(): Promise<BotRuntimeStatus[]> {
    return botManager.getAllRuntimeStatuses();
  }

  public async getBot(botId: string): Promise<BotRuntimeStatus | null> {
    const bot = botManager.getBot(botId);
    if (!bot) return null;
    return bot.getRuntimeStatus();
  }

  public async setBotEnabled(botId: string, enabled: boolean): Promise<boolean> {
    const bot = botManager.getBot(botId);
    if (!bot) return false;

    await bot.updateConfig({ desiredEnabled: enabled });
    if (!enabled && bot.getRuntimeStatus().observedState === 'online') {
      await bot.stop();
    } else if (enabled && bot.hasToken() && bot.getRuntimeStatus().observedState !== 'online') {
      await bot.start();
    }
    return true;
  }

  public async startBot(botId: string): Promise<boolean> {
    return botManager.startBot(botId);
  }

  public async stopBot(botId: string): Promise<boolean> {
    return botManager.stopBot(botId);
  }

  public async updateBotConfiguration(botId: string, updates: UpdateBotConfigDTO): Promise<boolean> {
    const bot = botManager.getBot(botId);
    if (!bot) return false;

    await bot.updateConfig(updates);
    return true;
  }

  public async registerNewBot(def: BotDefinition): Promise<void> {
    botManager.registerBot(def);
    const newBot = botManager.getBot(def.id);
    if (newBot) {
      await newBot.initConfig();
    }
  }

  public async getPersistentConfigs(): Promise<PersistentBotConfig[]> {
    return botConfigRepository.getAllConfigs();
  }
}

export const dashboardService = new BotManagementDashboardService();
