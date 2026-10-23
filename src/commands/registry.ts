import { Collection } from 'discord.js';
import { Command } from './types';
import { logCommand } from './log';
import { listLogCommand } from './listlog';
import { channelLogCommand } from './channellog';
import { orderCommand } from './orders/order';
import { ordersListCommand } from './orders/ordersList';
import { orderStatusCommand } from './orders/orderStatus';
import { logger } from '../utils/logger';

export class CentralCommandRegistry {
  private commands = new Collection<string, Command>();
  private aliases = new Collection<string, string>();

  /**
   * Register a command into the central platform registry
   */
  public register(command: Command): void {
    if (this.commands.has(command.name)) {
      logger.warn(`Command "${command.name}" is already registered. Overwriting.`);
    }

    this.commands.set(command.name, command);

    if (command.aliases && command.aliases.length > 0) {
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }

    const targetDesc = command.targetBotIds ? `[bots: ${command.targetBotIds.join(', ')}]` : '[all bots]';
    logger.debug(`Registered command: ${command.name} ${targetDesc}`);
  }

  /**
   * Get a command strictly if it is assigned to the specified botId
   */
  public getForBot(botId: string, nameOrAlias: string): Command | undefined {
    let command = this.commands.get(nameOrAlias);
    if (!command) {
      const canonical = this.aliases.get(nameOrAlias);
      if (canonical) {
        command = this.commands.get(canonical);
      }
    }

    if (!command) {
      return undefined;
    }

    // Check bot restriction
    if (command.targetBotIds && command.targetBotIds.length > 0) {
      if (!command.targetBotIds.includes(botId)) {
        // Command does not belong to this bot
        return undefined;
      }
    }

    return command;
  }

  /**
   * Get all commands assigned to a specific bot
   */
  public getAllForBot(botId: string): Command[] {
    return Array.from(this.commands.values()).filter((cmd) => {
      if (!cmd.targetBotIds || cmd.targetBotIds.length === 0) return true;
      return cmd.targetBotIds.includes(botId);
    });
  }

  public getAll(): Command[] {
    return Array.from(this.commands.values());
  }
}

export const registry = new CentralCommandRegistry();

// 1. Manager Bot Commands
registry.register(logCommand);
registry.register(listLogCommand);
registry.register(channelLogCommand);

// 2. Orders Bot Commands
registry.register(orderCommand);
registry.register(ordersListCommand);
registry.register(orderStatusCommand);
