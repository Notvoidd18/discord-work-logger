# Discord Work Logging System

A robust, production-ready Discord Work Logging bot built with **Node.js**, **TypeScript**, **discord.js v14**, and **PostgreSQL**. Ready for one-click deployment on **Render**.

---

## 📌 Features

- **Staff Work Logging (`!log <description>`)**: Allows authorized team members to record timestamped work reports directly into a PostgreSQL database.
- **Detailed Audit Trail**: Stores unique Log ID, Discord User ID, username tag, work description, UTC timestamp, Guild ID, and Channel ID.
- **Strict Role & Administrator Authorization**: Restricts command execution to server Administrators or roles specified in `AUTHORIZED_ROLE_IDS`. Unauthorized users are securely rejected.
- **Input Validation & Error Handling**: Validates empty input and length limits. Never claims an entry was saved if the database operation fails.
- **Professional Embed Responses**: Confirms logged work with rich Discord embeds detailing log ID, author, UTC timestamp, and description.
- **Modular Architecture**: Built with repository patterns and a clean command registry, ready for future expansion (`!logs`, `!logview`, CSV export) without rewrites.
- **Render Ready**: Includes automatic database migrations, environment variable validation, and an optional HTTP health check server for zero-downtime hosting on Render.

---

## 📁 Project Structure

```text
.
├── .env.example                     # Sample environment variable configuration
├── .gitignore                       # Git ignore list (node_modules, dist, .env)
├── package.json                     # Node.js dependencies and scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── sql/
│   └── schema.sql                   # Raw SQL table and index schema
└── src/
    ├── index.ts                     # Bot bootstrap, Discord client & graceful shutdown
    ├── config/
    │   └── env.ts                   # Environment variable loader and validator
    ├── database/
    │   ├── pool.ts                  # PostgreSQL connection pool with SSL support
    │   ├── schema.ts                # Auto-migration runner on startup
    │   ├── migrate.ts               # Standalone migration script (`npm run db:migrate`)
    │   └── repositories/
    │       └── workLogRepository.ts # Work log database query methods
    ├── commands/
    │   ├── types.ts                 # Command interface and execution context
    │   ├── registry.ts              # Command loader and dispatcher
    │   └── log.ts                   # !log command implementation
    ├── events/
    │   ├── ready.ts                 # Client ready event handler & activity status
    │   └── messageCreate.ts         # Message dispatcher with authorization checks
    ├── utils/
    │   ├── embed.ts                 # Embed builders for confirmations and errors
    │   ├── logger.ts                # Timestamped application logger
    │   └── permissions.ts           # Permission & role validation logic
    └── types/
        └── workLog.ts               # WorkLog domain types and ID formatting helper
```

---

## 🗄️ Database Schema

The database table `work_logs` is created automatically on bot startup, or manually via `npm run db:migrate`:

```sql
CREATE TABLE IF NOT EXISTS work_logs (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(32) NOT NULL,
    channel_id VARCHAR(32) NOT NULL,
    user_id VARCHAR(32) NOT NULL,
    username VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_logs_guild_id ON work_logs (guild_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_user_id ON work_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_created_at ON work_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_logs_guild_user ON work_logs (guild_id, user_id);
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Discord Bot Token (from Discord Developer Portal)
DISCORD_TOKEN=your_bot_token_here

# Discord Client / Application ID (optional)
DISCORD_CLIENT_ID=your_client_id_here

# Command Prefix (default: !)
COMMAND_PREFIX=!

# PostgreSQL Connection String
DATABASE_URL=postgresql://postgres:password@localhost:5432/discord_bot?sslmode=require

# Comma-separated list of authorized Discord Role IDs allowed to log work
# (Server Administrators always have permission)
AUTHORIZED_ROLE_IDS=123456789012345678,987654321098765432

# Maximum character length for a work log description (default: 1000)
MAX_LOG_LENGTH=1000

# HTTP Port for Render Web Service health-check
PORT=3000
```

---

## 🚀 Setup & Local Testing

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [PostgreSQL](https://www.postgresql.org/) database running locally or in the cloud (e.g. Neon, Supabase, Render)
- A Discord Bot created in the [Discord Developer Portal](https://discord.com/developers/applications)

### 2. Discord Developer Portal Settings
1. Go to your application in the **Discord Developer Portal**.
2. Under the **Bot** tab:
   - Reset and copy your **Token**.
   - Under **Privileged Gateway Intents**, enable **Message Content Intent** (required for the bot to read `!log <description>`).
   - Enable **Server Members Intent** (optional, recommended).
3. Under **OAuth2 > URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`, `View Channels`
   - Copy the generated URL and invite the bot to your Discord server.

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure `.env`
Create a `.env` file in the project root:
```bash
cp .env.example .env
```
Fill in your `DISCORD_TOKEN`, `DATABASE_URL`, and optionally `AUTHORIZED_ROLE_IDS`.

### 5. Run Database Migration (Optional)
The bot automatically creates the table on startup, but you can also test the database connection and schema manually:
```bash
npm run db:migrate
```

### 6. Start the Bot in Development Mode
```bash
npm run dev
```

### 7. Compile and Run in Production Mode
```bash
npm run build
npm start
```

---

## 🧪 Testing the Command

1. In your Discord server, make sure you have the **Administrator** permission or one of the roles configured in `AUTHORIZED_ROLE_IDS`.
2. Type in any channel where the bot has access:
   ```text
   !log Tested the website order system
   ```
3. The bot will save the record into PostgreSQL and reply with:

```text
📋 WORK LOG SAVED
Your work entry has been successfully recorded in the database.

Log ID: #0001
Created By: @Username (username#0000)
Timestamp (UTC): Thu, 22 Oct 2026 15:45:00 GMT
Description: Tested the website order system
```

### Validation Error Testing
- Try sending `!log` without arguments:
  - Expected: Error embed explaining missing description and showing command usage.
- Try sending a description exceeding `MAX_LOG_LENGTH`:
  - Expected: Error embed showing character count vs limit.
- Try sending from an unauthorized account:
  - Expected: Access denied message.

---

## 🌐 Deploying to Render via GitHub

### Step 1: Push Code to GitHub
```bash
git init
git add .
git commit -m "feat: initial work logging bot implementation"
git branch -M main
git remote add origin https://github.com/your-username/discord-work-logger.git
git push -u origin main
```

### Step 2: Create PostgreSQL Database on Render
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **PostgreSQL**.
3. Name your database (e.g. `discord-work-logger-db`).
4. Select the Free or Starter tier and click **Create Database**.
5. Once created, copy the **Internal Database URL** (if deploying bot on Render) or **External Database URL**.

### Step 3: Deploy Bot on Render
You can deploy as either a **Web Service** or a **Background Worker**:

#### Option A: Web Service (Recommended for Free Tier)
Render's free tier supports Web Services. The bot includes a built-in lightweight HTTP health check server on `$PORT` to keep Render happy.
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `discord-work-logger`
   - **Environment**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, add:
   - `DISCORD_TOKEN`: *(your Discord bot token)*
   - `DATABASE_URL`: *(your Render PostgreSQL database URL)*
   - `COMMAND_PREFIX`: `!`
   - `AUTHORIZED_ROLE_IDS`: *(comma-separated role IDs, e.g. 123456789012345678)*
   - `MAX_LOG_LENGTH`: `1000`
   - `PORT`: `10000` *(Render sets $PORT automatically)*
   - `NODE_ENV`: `production`
5. Click **Create Web Service**.

#### Option B: Background Worker (Paid Tier)
If using Render's Background Worker type:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- Add the same environment variables as above.

---

## 🔮 Future Extensibility

The system is designed with clean architectural boundaries:
- **`src/database/repositories/workLogRepository.ts`**: Contains pre-built repository methods (`getLogById`, `getRecentLogs`, `getLogsByUser`) ready for:
  - `!logs` (view recent logs with pagination)
  - `!logview <id>` (view details of a specific log entry)
  - `!exportlogs` (stream logs to CSV format)
- **`src/commands/registry.ts`**: Add any new command in `src/commands/<name>.ts` and call `registry.register(newCommand)`. No need to alter core dispatch logic.
