import { Collection } from 'discord.js';
import { Command } from './types';
import { logCommand } from './log';
import { logger } from '../utils/logger';

export class CommandRegistry {
  private commands = new Collection<string, Command>();
  private aliases = new Collection<string, string>();

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

    logger.debug(`Registered command: !${command.name}`);
  }

  public get(nameOrAlias: string): Command | undefined {
    const directMatch = this.commands.get(nameOrAlias);
    if (directMatch) return directMatch;

    const aliasedName = this.aliases.get(nameOrAlias);
    if (aliasedName) {
      return this.commands.get(aliasedName);
    }

    return undefined;
  }

  public getAll(): Command[] {
    return Array.from(this.commands.values());
  }
}

export const registry = new CommandRegistry();

// Initialize all enabled commands
registry.register(logCommand);
