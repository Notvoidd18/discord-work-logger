import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

export interface EnvironmentConfig {
  discordToken: string;
  discordClientId?: string;
  commandPrefix: string;
  databaseUrl: string;
  authorizedRoleIds: string[];
  maxLogLength: number;
  port: number;
}

function parseRoleIds(rawRoles?: string): string[] {
  if (!rawRoles) return [];
  return rawRoles
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
}

export function loadConfig(): EnvironmentConfig {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error('Missing environment variable: DISCORD_TOKEN is required.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing environment variable: DATABASE_URL is required.');
  }

  const commandPrefix = process.env.COMMAND_PREFIX || '!';
  const authorizedRoleIds = parseRoleIds(process.env.AUTHORIZED_ROLE_IDS);
  const maxLogLength = parseInt(process.env.MAX_LOG_LENGTH || '1000', 10);
  const port = parseInt(process.env.PORT || '3000', 10);

  return {
    discordToken: token,
    discordClientId: process.env.DISCORD_CLIENT_ID,
    commandPrefix,
    databaseUrl,
    authorizedRoleIds,
    maxLogLength: isNaN(maxLogLength) ? 1000 : maxLogLength,
    port: isNaN(port) ? 3000 : port,
  };
}

export const config = loadConfig();
