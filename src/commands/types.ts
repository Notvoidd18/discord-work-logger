import { Message, Client } from 'discord.js';

export interface CommandContext {
  message: Message;
  args: string[];
  client: Client;
  commandName: string;
}

export interface Command {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  adminOrStaffOnly?: boolean;
  execute(ctx: CommandContext): Promise<void>;
}
