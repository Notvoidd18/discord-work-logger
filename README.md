# Ongrywolf Multi-Bot Platform

A modular, enterprise-grade multi-bot Discord architecture built with **Node.js**, **TypeScript**, **discord.js v14**, and **PostgreSQL**. Ready for continuous deployment on **Render**.

---

## 📌 1. Architecture Overview

The **Ongrywolf Multi-Bot Platform** runs multiple independent Discord bots concurrently within a single lightweight Node.js service without code duplication:

- **Bot 1: Ongrywolf Manager (`manager`)**: Handles staff work logging, audit trail tracking, and dedicated log channel configuration. Preserves existing bot behavior and permissions.
- **Bot 2: Ongrywolf Orders (`orders`)**: Dedicated customer and staff order processing, order status transitions, and order listing.
- **Brand Watermark**: Subtly brands public-facing embeds and activity presence with `Hosting on Ongrywolf`.
- **Command Segregation**: Commands are assigned to specific bot IDs in a centralized registry. Bot 1 processes only manager commands, and Bot 2 processes only order commands.
- **State Persistence**: PostgreSQL stores desired states, observed gateway states, status texts, assigned commands, error logs, and timestamps.
- **Dashboard Ready**: Features `IBotManagementDashboardService` and a JSON status endpoint ready for future web dashboard integration.

---

## 📁 2. Project Structure

```text
.
├── .env.example                               # Multi-bot environment template
├── .gitignore                                 # Git ignore rules
├── package.json                               # Dependencies & scripts
├── tsconfig.json                              # TypeScript configuration
├── sql/
│   └── schema.sql                             # Full PostgreSQL database schema
├── tests/
│   └── platform.test.ts                       # Automated multi-bot verification test suite
└── src/
    ├── index.ts                               # Platform bootstrapper & Render HTTP health server
    ├── config/
    │   └── env.ts                             # Token resolver & environment variable loader
    ├── platform/
    │   ├── types.ts                           # Multi-bot domain types & interfaces
    │   ├── botInstance.ts                     # Independent Discord Client container & lifecycle
    │   ├── botManager.ts                      # Central coordinator managing all active bots
    │   └── dashboardService.ts                # Management service interface for future web dashboard
    ├── database/
    │   ├── pool.ts                            # PostgreSQL connection pool with SSL handling
    │   ├── schema.ts                          # Automatic database migration runner on startup
    │   ├── migrate.ts                         # Standalone migration script (`npm run db:migrate`)
    │   └── repositories/
    │       ├── botConfigRepository.ts         # Persistent bot state & configuration queries
    │       ├── workLogRepository.ts           # Staff work logs persistence
    │       ├── guildSettingsRepository.ts     # Dedicated log channel settings
    │       └── orderRepository.ts             # Orders system persistence
    ├── commands/
    │   ├── types.ts                           # Command interface & CommandContext
    │   ├── registry.ts                        # Central command registry with bot scoping
    │   ├── slashDefinitions.ts                # Slash command definitions per bot
    │   ├── deploy.ts                          # Slash deployment CLI (`npm run deploy:commands`)
    │   ├── log.ts                             # Bot 1: !log command
    │   ├── listlog.ts                         # Bot 1: !listlog command
    │   ├── channellog.ts                      # Bot 1: !channellog command
    │   └── orders/
    │       ├── order.ts                       # Bot 2: !order command
    │       ├── ordersList.ts                  # Bot 2: !orders command
    │       └── orderStatus.ts                 # Bot 2: !orderstatus command
    ├── events/
    │   ├── ready.ts                           # Bot-specific ready handler & slash sync
    │   ├── messageCreate.ts                   # Prefix command dispatcher scoped per bot
    │   └── interactionCreate.ts               # Slash command dispatcher scoped per bot
    ├── utils/
    │   ├── embed.ts                           # Embed builders with 'Hosting on Ongrywolf' watermark
    │   ├── logger.ts                          # Contextual logger with per-bot prefixes
    │   └── permissions.ts                     # Administrator & Role permission validator
    └── types/
        ├── workLog.ts                         # WorkLog entity and ID formatter
        └── order.ts                           # Order entity and ID formatter
```

---

## 🗄️ 3. Database Schema

The database tables are automatically verified and created on startup:

1. **`work_logs`**: Permanent record of staff work activities.
2. **`guild_settings`**: Guild-specific settings (e.g. dedicated log channel ID).
3. **`bot_configurations`**: Persistent bot configurations, desired states, observed states, status texts, and error summaries.
4. **`orders`**: Customer and staff orders, status tracking (`PENDING`, `PROCESSING`, `COMPLETED`, `CANCELLED`).

---

## 🤖 4. Bot Command Assignments

### Bot 1: Ongrywolf Manager (`manager`)
| Slash Command | Prefix Alternative | Purpose | Permissions |
| :--- | :--- | :--- | :--- |
| `/log <description>` | `!log <description>` | Record staff work log into PostgreSQL | Admin / Authorized Staff Roles |
| `/listlog` | `!listlog` | View all work logs in one-click format | Admin / Authorized Staff Roles |
| `/channellog set` | `!channellog set #channel` | Designate channel for automated logs | Admin / Authorized Staff Roles |
| `/channellog view` | `!channellog view` | View currently configured log channel | Admin / Authorized Staff Roles |
| `/channellog reset` | `!channellog reset` | Reset back to current channel | Admin / Authorized Staff Roles |

### Bot 2: Ongrywolf Orders (`orders`)
| Slash Command | Prefix Alternative | Purpose | Permissions |
| :--- | :--- | :--- | :--- |
| `/order <item> [qty] [notes]` | `!order <item details>` | Create a new persistent order | Everyone |
| `/orders` | `!orders` | View recent server orders in clean list | Everyone |
| `/orderstatus <id> <status>` | `!orderstatus <id> <status>` | Update order status (Completed, etc.) | Admin / Authorized Staff Roles |

---

## ⚙️ 5. Environment Variables

Configure these variables in Render or your `.env` file:

```env
# ========================================================
# 1. Bot 1: Ongrywolf Manager (Work Logging & Channel Admin)
# ========================================================
BOT_MANAGER_TOKEN=your_manager_bot_token_here
BOT_MANAGER_CLIENT_ID=your_manager_application_id_here
# Backward-compatibility fallback:
# If BOT_MANAGER_TOKEN is not set, DISCORD_TOKEN is used automatically.
DISCORD_TOKEN=
DISCORD_CLIENT_ID=

# ========================================================
# 2. Bot 2: Ongrywolf Orders (Customer & Staff Orders)
# ========================================================
BOT_ORDERS_TOKEN=your_orders_bot_token_here
BOT_ORDERS_CLIENT_ID=your_orders_application_id_here

# ========================================================
# General Platform Settings
# ========================================================
COMMAND_PREFIX=!
DATABASE_URL=postgresql://username:password@hostname:5432/dbname?sslmode=require
AUTHORIZED_ROLE_IDS=123456789012345678,987654321098765432
MAX_LOG_LENGTH=1000
PORT=3000
```

---

## 🌐 6. Deploying on Render

### Deploying the Existing Service (Backward Compatible)
- Your existing deployment will continue running **Bot 1 (Manager)** without breaking, because `BOT_MANAGER_TOKEN` automatically falls back to your existing `DISCORD_TOKEN`.

### Adding Bot 2 (Orders) without Interrupting Bot 1:
1. Create a second bot in the [Discord Developer Portal](https://discord.com/developers/applications) named **Ongrywolf Orders**.
2. Under **Bot > Privileged Gateway Intents**, enable **Message Content Intent**.
3. Invite the bot to your Discord server using OAuth2 URL Generator (`bot` + `applications.commands` scopes).
4. In your **Render Dashboard** under **Environment Variables**, add:
   - `BOT_ORDERS_TOKEN` = *(Your new orders bot token)*
   - `BOT_ORDERS_CLIENT_ID` = *(Your new orders bot application ID)*
5. Trigger **Manual Deploy > Deploy latest commit**.
6. The platform starts both bots concurrently inside the same Render web service!

---

## ➕ 7. Adding a 3rd Bot in the Future

To add another bot (e.g. `support` or `moderation`):
1. In `src/platform/botManager.ts`, call `this.registerBot({ ... })`:
   ```ts
   this.registerBot({
     id: 'support',
     displayName: 'Ongrywolf Support',
     tokenEnvVar: 'BOT_SUPPORT_TOKEN',
     clientIdEnvVar: 'BOT_SUPPORT_CLIENT_ID',
     defaultPrefix: '!',
     defaultStatusText: 'Hosting on Ongrywolf',
     defaultStatusType: ActivityType.Custom,
     brandWatermark: 'Hosting on Ongrywolf',
     defaultCommands: ['ticket', 'close'],
   });
   ```
2. Assign your new commands with `targetBotIds: ['support']` in `src/commands/registry.ts`.
3. Add `BOT_SUPPORT_TOKEN` in Render. That's it!

---

## 🧪 8. Automated Verification Tests

Run the platform test suite:
```bash
npm test
```

Verifies:
- Command segregation between `manager` and `orders`.
- Slash command scoping and zero overlap.
- Backward compatibility and token resolution.
- Branding watermark footer and exact spelling (`Ongrywolf`).
- Client isolation and missing token safety.
- Zero secret leakage in runtime telemetry.
