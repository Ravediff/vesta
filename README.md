# Vesta

A Discord bot for levels, leaderboards, welcome cards, self-roles, announcements and moderation, with a retro pixel-art look.

## Features

- **Levels and XP**: members earn XP for chatting (10–20 XP, at most once every 30 seconds) and for hanging out in voice (5–10 XP a minute). Each server has its own levels.
- **Voice XP**: only counts when at least 2 people in the channel aren't deafened, and never in the AFK channel, so it can't be farmed by idling. Turn it off with `/config voicexp`.
- **Pixel-art cards**: welcome, goodbye, rank and level-up cards drawn with a built-in pixel font, so they look the same on any host.
- **Rank cards**: `/rank` shows level, rank, an XP bar, messages sent, voice time, total XP and the next level reward.
- **Level-up cards**: posted when someone levels up, showing any role they unlocked.
- **Leaderboards**: all-time, weekly and monthly, with page buttons. Weekly totals reset every Sunday and monthly totals on the 1st. A reset still happens if the bot was offline at midnight.
- **Level roles**: roles given out automatically when members reach a level.
- **Welcome and goodbye cards**: pixel-style image cards in the channels you choose.
- **Auto-role**: a role every new member gets. If the server has rules screening, it's given after they accept the rules.
- **Moderation**: warn, timeout, kick, ban, unban and purge. Vesta checks role order, DMs the member when it can, and logs each action to a mod-log channel.
- **Join and leave log**: every join and leave goes to the mod log with account age. Accounts under 7 days old are flagged, since they're often alts or spam.
- **Self-role panels**: `/selfroles` posts buttons that members click to add or remove roles. Panels can be "pick one" (for example age groups), keep working after restarts, and refuse roles with mod or admin permissions.
- **Announcements**: `/announce` opens a popup to write a formatted announcement, with an optional role ping, colour and image.
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
| `/config ...` | Manage Server | Sets channels, auto-role, level roles and voice XP |
| `/selfroles title role1 [role2…role10] [pick_one]` | Manage Roles | Posts a self-role button panel |
| `/announce [channel] [ping] [color] [image]` | Manage Server | Writes and posts an announcement |
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

Under **Bot → Privileged Gateway Intents**, turn on **Server Members Intent**. Vesta needs it for welcome and goodbye cards and the auto-role. It doesn't need Message Content Intent. Voice XP uses the voice-states intent, which isn't privileged and needs no setting.

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
