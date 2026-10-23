# Ongrywolf Multi-Bot Platform

A modular, enterprise-grade multi-bot Discord architecture built with **Node.js**, **TypeScript**, **discord.js v14**, and **PostgreSQL**. Ready for continuous deployment on **Render**.

---

## 📌 1. Platform Overview & Bots

The platform runs two independent Discord bots concurrently inside a single Render web service:

| Bot Name | Bot ID | Environment Variable on Render | Custom Status Text | Assigned Commands |
| :--- | :--- | :--- | :--- | :--- |
| **Ongrywolf Main (Official)** | `main` | `BOT_TOKEN_MAIN` *(fallback: `DISCORD_TOKEN`)* | `Hosting on Ongrywolf` | `/log`, `/listlog`, `/channellog` *(+ prefix `!` alternatives)* |
| **Ongrywolf Bot A** | `bot_a` | `BOT_TOKEN_A` | `Hosting on Ongrywolf PRV` | `/log`, `/listlog`, `/channellog` *(+ prefix `!` alternatives)* |

- **Official Commands Only**: Contains exclusively the official requested logging commands (`log`, `listlog`, `channellog`). No extra or unrequested commands are added.
- **Brand Watermark**: Subtly brands public-facing embeds with `Hosting on Ongrywolf`.
- **Fault-Tolerant Isolation**: Each bot runs its own Discord `Client` instance. If one bot disconnects or encounters an error, the other continues running uninterrupted.
- **Render Backward-Compatibility**: `BOT_TOKEN_MAIN` automatically falls back to your existing `DISCORD_TOKEN`, meaning your existing bot will continue operating with zero downtime or breaking changes.

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
    │       └── guildSettingsRepository.ts     # Dedicated log channel settings
    ├── commands/
    │   ├── types.ts                           # Command interface & CommandContext
    │   ├── registry.ts                        # Central command registry
    │   ├── slashDefinitions.ts                # Official slash command schemas
    │   ├── deploy.ts                          # Slash deployment CLI (`npm run deploy:commands`)
    │   ├── log.ts                             # !log command
    │   ├── listlog.ts                         # !listlog command
    │   └── channellog.ts                      # !channellog command
    ├── events/
    │   ├── ready.ts                           # Bot-specific ready handler & slash sync
    │   ├── messageCreate.ts                   # Prefix command dispatcher scoped per bot
    │   └── interactionCreate.ts               # Slash command dispatcher scoped per bot
    ├── utils/
    │   ├── embed.ts                           # Embed builders with 'Hosting on Ongrywolf' watermark
    │   ├── logger.ts                          # Contextual logger with per-bot prefixes
    │   └── permissions.ts                     # Administrator & Role permission validator
    └── types/
        └── workLog.ts                         # WorkLog entity and ID formatter
```

---

## 🤖 3. Official Commands

| Slash Command | Prefix Alternative | Purpose | Permissions |
| :--- | :--- | :--- | :--- |
| `/log <description>` | `!log <description>` | Record staff work log into PostgreSQL | Admin / Authorized Staff Roles |
| `/listlog` | `!listlog` | View all work logs in one-click format | Admin / Authorized Staff Roles |
| `/channellog set` | `!channellog set #channel` | Designate channel for automated logs | Admin / Authorized Staff Roles |
| `/channellog view` | `!channellog view` | View currently configured log channel | Admin / Authorized Staff Roles |
| `/channellog reset` | `!channellog reset` | Reset back to current channel | Admin / Authorized Staff Roles |

---

## ⚙️ 4. Render Environment Variables

Configure these variables in Render:

```env
# ----------------------------------------------------
# 1. Main Official Bot (Status: "Hosting on Ongrywolf")
# ----------------------------------------------------
BOT_TOKEN_MAIN=your_main_bot_token_here
BOT_CLIENT_ID_MAIN=your_main_bot_client_id_here
# Backward Compatibility: If BOT_TOKEN_MAIN is empty,
# the platform automatically reads your existing DISCORD_TOKEN!
DISCORD_TOKEN=
DISCORD_CLIENT_ID=

# ----------------------------------------------------
# 2. Bot A (Status: "Hosting on Ongrywolf PRV")
# ----------------------------------------------------
BOT_TOKEN_A=your_bot_a_token_here
BOT_CLIENT_ID_A=your_bot_a_client_id_here

# ----------------------------------------------------
# Platform Configuration
# ----------------------------------------------------
COMMAND_PREFIX=!
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
AUTHORIZED_ROLE_IDS=123456789012345678
MAX_LOG_LENGTH=1000
PORT=3000
```

---

## 🌐 5. Deploying on Render

1. **Deploying the Main Bot**:
   - In Render Dashboard under **Environment Variables**, set:
     - `BOT_TOKEN_MAIN` = *(Your main bot token)*
     - `BOT_CLIENT_ID_MAIN` = *(Your main bot application ID)*
   *(Or keep existing `DISCORD_TOKEN` — it will automatically be used by the main bot).*
   - Status will appear as: **`Hosting on Ongrywolf`**.

2. **Deploying Bot A**:
   - In Render Dashboard under **Environment Variables**, set:
     - `BOT_TOKEN_A` = *(Your Bot A token)*
     - `BOT_CLIENT_ID_A` = *(Your Bot A application ID)*
   - Status will appear as: **`Hosting on Ongrywolf PRV`**.

3. **Running in Parallel**:
   - Trigger a deploy on Render. Both bots will start and run concurrently inside the same Render web service!

---

## 🧪 6. Automated Verification Tests

Run the test suite locally:
```bash
npm test
```

Verifies:
- Both bots have only the official requested commands (`log`, `listlog`, `channellog`).
- Zero extra commands exist.
- Main bot presence is `"Hosting on Ongrywolf"`.
- Bot A presence is `"Hosting on Ongrywolf PRV"`.
- Token resolution and backward compatibility with `DISCORD_TOKEN`.
- Branding watermark footer (`Hosting on Ongrywolf`).
- Client isolation and missing token safety.
- Zero secret leakage in telemetry.
