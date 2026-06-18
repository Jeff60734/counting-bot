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

// load count data
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

  const content = message.content.trim();

  // only pure numbers allowed
  if (!/^\d+$/.test(content)) return;

  const num = parseInt(content);

  // same user twice in a row -> delete
  if (message.author.id === data.lastUser) {
    await message.delete().catch(() => {});
    return;
  }

  const expected = data.count + 1;

  // correct number
  if (num === expected) {
    data.count = num;
    data.lastUser = message.author.id;
    data.warning = false;
    save();

    await message.react("✅");

    // milestone check
    if (MILESTONES[num]) {
      await message.react(MILESTONES[num]);
    }

    return;
  }

  // wrong number
  if (!data.warning) {
    data.warning = true;
    save();

    await message.react("⚠️");
    message.channel.send(
      `⚠️ Warning! The next number should be **${expected}**. Continue from ${expected}.`
    );
  } else {
    // second mistake -> reset
    data.count = 0;
    data.lastUser = null;
    data.warning = false;
    save();

    await message.react("❌");
    message.channel.send(
      `❌ Count ruined! The next number is **1**.`
    );
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
