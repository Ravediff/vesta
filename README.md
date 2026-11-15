# Vesta

A Discord bot for levels, leaderboards, welcome cards and moderation, with a pixel-art look.

## Features

- **Levels and XP**: members earn XP for chatting (10–20 XP, at most once every 30 seconds). Each server has its own levels.
- **Rank cards**: `/rank` draws a pixel-style card with the member's level, rank and a progress bar.
- **Leaderboards**: all-time, weekly and monthly, with page buttons. Weekly totals reset every Sunday and monthly totals on the 1st. A reset still happens if the bot was offline at midnight.
- **Level roles**: roles given out automatically when members reach a level.
- **Welcome and goodbye cards**: pixel-style image cards in the channels you choose.
- **Auto-role**: a role every new member gets. If the server has rules screening, it's given after they accept the rules.
- **Moderation**: warn, timeout, kick, ban, unban and purge. Vesta checks role order, DMs the member when it can, and logs each action to a mod-log channel.
- **Safe by default**: the bot never pings anyone except a new member in their welcome message.

## Commands

| Command | Who can use it | What it does |
|---|---|---|
| `/help` | Everyone | Lists the commands you're allowed to use |
| `/rank [user]` | Everyone | Shows a level card |
| `/leaderboard [period]` | Everyone | Top members: all time, this week or this month |
| `/userinfo [user]` | Everyone | Account age, join date, level, warnings and roles |
| `/serverinfo` | Everyone | Server stats |
| `/ping` | Everyone | Shows how fast the bot responds |
| `/warn user reason` | Moderate Members | Warns a member and records it |
| `/warnings list/remove/clear` | Moderate Members | Manages a member's warnings |
| `/timeout user duration [reason]` | Moderate Members | Times a member out, e.g. `10m`, `2h`, `1d` (max 28 days) |
| `/untimeout user` | Moderate Members | Ends a timeout early |
| `/kick user [reason]` | Kick Members | Kicks a member |
| `/ban user [reason] [delete_messages]` | Ban Members | Bans a user, even one who isn't in the server |
| `/unban user_id` | Ban Members | Unbans a user, with autocomplete for banned users |
| `/purge amount [user]` | Manage Messages | Bulk-deletes up to 100 recent messages |
| `/config ...` | Manage Server | Sets channels, auto-role and level roles |
| `/xp add/remove/reset` | Manage Server | Adjusts a member's XP |

Server admins can change who can use each command under **Server Settings → Integrations → Vesta**.

## Setting up a server

Run these once in your server:

```
/config welcome channel:#welcome
/config goodbye channel:#goodbye
/config modlog channel:#mod-log
/config levelup enabled:true channel:#level-ups
/config autorole role:@Member
/config levelrole add level:5 role:@Regular
/config view
```

**Vesta's role must be above any role it gives out or moderates.** You can change role order under Server Settings → Roles.

## Running the bot

You need Node.js 18.17 or newer.

```bash
npm install
cp .env.example .env   # then put your bot token in .env
npm start
```

`npm run check` checks every command and event file without logging in.

### Discord Developer Portal settings

Under **Bot → Privileged Gateway Intents**, turn on **Server Members Intent**. Vesta needs it for welcome and goodbye cards and the auto-role. It doesn't need Message Content Intent.

The bot's role needs these permissions: View Channels, Send Messages, Embed Links, Attach Files, Read Message History, Manage Messages, Manage Roles, Moderate Members, Kick Members and Ban Members.

## Data

Data is saved as JSON in `data/`: one file per server, plus `meta.json` for leaderboard resets. The folder is git-ignored. Saves are batched and atomic, so a crash can't leave a half-written file.

If an old `xp.json` from before v2 is in the project folder, Vesta imports it into your server on first start and leaves the original file untouched.

## Project layout

```
src/
  index.js         starts the bot
  config.js        settings and colours
  commands/        one file per slash command
  events/          Discord event handlers
  lib/             storage, levels, image cards, mod log and helpers
scripts/check.js   checks commands and events without logging in
```
