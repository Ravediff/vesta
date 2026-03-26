require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const cooldowns = {};
const fs = require('fs');
const PREFIX = '!';


// XP save system


// channels
const WELCOME_CHANNEL = process.env.WELCOME_CHANNEL_ID;
const LEAVE_CHANNEL = process.env.LEAVE_CHANNEL_ID;

// XP storage
let xp = {};

if (fs.existsSync('./xp.json')) {
  xp = JSON.parse(fs.readFileSync('./xp.json'));
}

function saveData() {
  fs.writeFileSync('./xp.json', JSON.stringify(xp, null, 2));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.on('error', console.error);

// ---------------- READY ----------------
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});


// Reset 

let lastReset = {
  weekly: null,
  monthly: null
};

function resetWeekly() {
  for (let user in xp) {
    xp[user].weekly = 0;
  }
  saveData();
  console.log('✅ Weekly XP reset');
}

function resetMonthly() {
  for (let user in xp) {
    xp[user].monthly = 0;
  }
  saveData();
  console.log('✅ Monthly XP reset');
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  setInterval(() => {
    const now = new Date();

    // Weekly reset (Sunday midnight)
    if (now.getDay() === 0 && now.getHours() === 0 && now.getMinutes() === 0) {
      resetWeekly();
    }

    // Monthly reset (1st day midnight)
    if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
      resetMonthly();
    }

  }, 60000); // check every minute
});

// ---------------- WELCOME (PIXEL CARD) ----------------
client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL);
  if (!channel) return console.log('❌ Welcome channel not found');

  const canvas = createCanvas(500, 250);
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 500, 250);

  // border
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, 0, 500, 10);
  ctx.fillRect(0, 240, 500, 10);
  ctx.fillRect(0, 0, 10, 250);
  ctx.fillRect(490, 0, 10, 250);

  // title
  ctx.fillStyle = '#ffffff';
  ctx.font = '28px monospace';
  ctx.fillText('WELCOME', 170, 50);

  // username
  ctx.font = '20px monospace';
  ctx.fillText(member.user.username, 170, 110);

  // avatar
  const avatar = await loadImage(
    member.user.displayAvatarURL({ extension: 'png', size: 128 })
  );
  ctx.drawImage(avatar, 40, 70, 100, 100);

  // send
  const buffer = canvas.toBuffer();

  channel.send({
    files: [{ attachment: buffer, name: 'welcome.png' }]
  });
});

// ---------------- LEAVE (PIXEL CARD) ----------------
client.on('guildMemberRemove', async member => {
  const channel = member.guild.channels.cache.get(LEAVE_CHANNEL);
  if (!channel) return console.log('❌ Leave channel not found');

  const canvas = createCanvas(500, 250);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 500, 250);

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0, 0, 500, 10);
  ctx.fillRect(0, 240, 500, 10);
  ctx.fillRect(0, 0, 10, 250);
  ctx.fillRect(490, 0, 10, 250);

  ctx.fillStyle = '#ffffff';
  ctx.font = '28px monospace';
  ctx.fillText('GOODBYE', 160, 50);

  ctx.font = '20px monospace';
  ctx.fillText(member.user.username, 170, 110);

  const avatar = await loadImage(
    member.user.displayAvatarURL({ extension: 'png', size: 128 })
  );
  ctx.drawImage(avatar, 40, 70, 100, 100);

  const buffer = canvas.toBuffer();

  channel.send({
    files: [{ attachment: buffer, name: 'bye.png' }]
  });
});

// ---------------- MESSAGE ----------------
client.on('messageCreate', message => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const username = message.author.username;

  // -------- INIT USER --------
  if (!xp[userId]) {
    xp[userId] = {
      xp: 0,
      level: 1,
      weekly: 0,
      monthly: 0
    };
  }

  // -------- GIVE XP --------
const now = Date.now();
const cooldown = 5000; // 5 seconds

  if (!cooldowns[userId]) {
    cooldowns[userId] = 0;
    }

  if (now - cooldowns[userId] < cooldown) return;

cooldowns[userId] = now;

// give XP
const gained = Math.floor(Math.random() * 10) + 5;

xp[userId].xp += gained;
xp[userId].weekly += gained;
xp[userId].monthly += gained;

saveData();
  // -------- LEVEL UP --------
  const needed = xp[userId].level * 100;

  if (xp[userId].xp >= needed) {
    xp[userId].level++;
    xp[userId].xp = 0;

    message.channel.send(
      `🔥 ${username} just leveled up to level ${xp[userId].level}!`
    );
    saveData();
  }

  // -------- COMMANDS --------
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // -------- LEVEL --------
  if (command === 'level') {
    const data = xp[userId];

    return message.reply(
      `📊 Level: ${data.level}\n⚡ XP: ${data.xp}/${data.level * 100}`
    );
  }

  // -------- LEADERBOARD --------
  if (command === 'top') {
    let type = 'xp';

    if (args[0] === 'weekly') type = 'weekly';
    if (args[0] === 'monthly') type = 'monthly';

    const sorted = Object.entries(xp)
      .sort((a, b) => b[1][type] - a[1][type])
      .slice(0, 5);

    let text = `🏆 Top (${type}):\n`;

    sorted.forEach((user, i) => {
      text += `${i + 1}. <@${user[0]}> - ${user[1][type]} XP\n`;
    });

    message.channel.send(text);
  }

});

// ---------------- LOGIN ----------------
client.login(process.env.TOKEN);