import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

export interface EnvironmentConfig {
  databaseUrl: string;
  commandPrefix: string;
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
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/discord_bot';

  const commandPrefix = process.env.COMMAND_PREFIX || '!';
  const authorizedRoleIds = parseRoleIds(process.env.AUTHORIZED_ROLE_IDS);
  const maxLogLength = parseInt(process.env.MAX_LOG_LENGTH || '1000', 10);
  const port = parseInt(process.env.PORT || '3000', 10);

  return {
    databaseUrl,
    commandPrefix,
    authorizedRoleIds,
    maxLogLength: isNaN(maxLogLength) ? 1000 : maxLogLength,
    port: isNaN(port) ? 3000 : port,
  };
}

/**
 * Resolves a token for a given bot definition using primary and fallback environment variable names.
 * Never prints the token itself.
 */
export function resolveBotToken(primaryVar: string, fallbackVar?: string): { token?: string; sourceVar?: string } {
  if (process.env[primaryVar]?.trim()) {
    return { token: process.env[primaryVar]!.trim(), sourceVar: primaryVar };
  }
  if (fallbackVar && process.env[fallbackVar]?.trim()) {
    return { token: process.env[fallbackVar]!.trim(), sourceVar: fallbackVar };
  }
  return {};
}

/**
 * Resolves an optional client ID for a bot.
 */
export function resolveBotClientId(primaryVar?: string, fallbackVar?: string): string | undefined {
  if (primaryVar && process.env[primaryVar]?.trim()) {
    return process.env[primaryVar]!.trim();
  }
  if (fallbackVar && process.env[fallbackVar]?.trim()) {
    return process.env[fallbackVar]!.trim();
  }
  return undefined;
}

export const config = loadConfig();
