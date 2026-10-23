import { Message, Client } from 'discord.js';

export interface CommandContext {
  message: Message;
  args: string[];
  client: Client;
  commandName: string;
  botId: string;
  watermark: string;
}

export interface Command {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  adminOrStaffOnly?: boolean;
  targetBotIds?: string[]; // e.g. ['manager'] or ['orders']. If omitted, can be attached to any bot
  execute(ctx: CommandContext): Promise<void>;
}
