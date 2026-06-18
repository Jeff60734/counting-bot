const fs = require("fs");
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// load saved data
let data = {
  count: 0,
  lastUser: null,
  warning: false
};

if (fs.existsSync("./count.json")) {
  data = JSON.parse(fs.readFileSync("./count.json"));
}

function save() {
  fs.writeFileSync("./count.json", JSON.stringify(data, null, 2));
}

// milestones
const MILESTONES = {
  100: "💯",
  500: "🔥",
  1000: "🎉",
  5000: "👑",
  10000: "🚀",
  25000: "⭐",
  50000: "🏆",
  100000: "🌟",
  250000: "💎",
  500000: "🥇",
  1000000: "🐐"
};

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // only one channel
  if (message.channel.id !== CHANNEL_ID) return;

  const content = message.content.trim();

  // only pure numbers
  if (!/^\d+$/.test(content)) return;

  const num = parseInt(content);
  const expected = data.count + 1;

  // same user twice -> delete
  if (message.author.id === data.lastUser) {
    await message.delete().catch(() => {});
    return;
  }

  // correct number
  if (num === expected) {
    data.count = num;
    data.lastUser = message.author.id;
    data.warning = false;
    save();

    await message.react("✅");

    if (MILESTONES[num]) {
      await message.react(MILESTONES[num]);
    }

    return;
  }

  // first mistake -> warning
  if (!data.warning) {
    data.warning = true;
    save();

    await message.react("⚠️");
    message.channel.send(
      `⚠️ Wrong! The next number should be **${expected}**. Continue from ${expected}.`
    );

    return;
  }

  // second mistake -> reset
  data.count = 0;
  data.lastUser = null;
  data.warning = false;
  save();

  await message.react("❌");
  message.channel.send(
    `❌ Count reset! Start again from **1**.`
  );
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
