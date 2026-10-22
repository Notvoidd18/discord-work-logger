import { GuildMember, PermissionFlagsBits } from 'discord.js';

/**
 * Checks if a member is authorized to use staff/admin logging commands.
 * Authorization criteria:
 * 1. Server Owner, OR
 * 2. Has Discord 'Administrator' permission, OR
 * 3. Possesses at least one role specified in AUTHORIZED_ROLE_IDS
 */
export function isAuthorizedUser(member: GuildMember | null, authorizedRoleIds: string[]): boolean {
  if (!member) {
    return false;
  }

  // 1. Server owner check
  if (member.guild.ownerId === member.id) {
    return true;
  }

  // 2. Administrator permission check
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // 3. Authorized role check
  if (authorizedRoleIds.length > 0) {
    const hasAuthorizedRole = member.roles.cache.some((role) =>
      authorizedRoleIds.includes(role.id)
    );
    if (hasAuthorizedRole) {
      return true;
    }
  }

  return false;
}
