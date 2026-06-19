const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const CLIENT_ID = process.env.CLIENT_ID;

const ALLOWED_USERS = [
  "1464219894785507369"
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// load data
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

/* =========================
   SLASH COMMANDS
========================= */

const commands = [
  new SlashCommandBuilder()
    .setName("test")
    .setDescription("Sets next number to 100"),

  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Resets count to 1"),

  new SlashCommandBuilder()
    .setName("count")
    .setDescription("Shows current counting number")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("Slash commands registered.");
  } catch (err) {
    console.error(err);
  }
})();

/* =========================
   COUNTING LOGIC
========================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CHANNEL_ID) return;

  const content = message.content.trim();
  if (!/^\d+$/.test(content)) return;

  const num = parseInt(content);
  const expected = data.count + 1;

  if (message.author.id === data.lastUser) {
    await message.delete().catch(() => {});
    return;
  }

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

  if (data.count < 100) {
    data.count = 0;
    data.lastUser = null;
    data.warning = false;
    save();

    await message.react("❌");
    message.channel.send("❌ Reset! Start again from **1**.");
    return;
  }

  if (!data.warning) {
    data.warning = true;
    save();

    await message.react("⚠️");
    message.channel.send(
      `⚠️ Wrong! Next number should be **${expected}**.`
    );
    return;
  }

  data.count = 0;
  data.lastUser = null;
  data.warning = false;
  save();

  await message.react("❌");
  message.channel.send("❌ Count reset! Start again from **1**.");
});

/* =========================
   SLASH HANDLER
========================= */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (!ALLOWED_USERS.includes(interaction.user.id)) {
    return interaction.reply({
      content: "❌ You are not allowed to use this command.",
      ephemeral: true
    });
  }

  if (interaction.commandName === "test") {
    data.count = 99;
    data.lastUser = null;
    data.warning = false;
    save();

    return interaction.reply("🧪 Test mode: next number is **100**.");
  }

  if (interaction.commandName === "reset") {
    data.count = 0;
    data.lastUser = null;
    data.warning = false;
    save();

    return interaction.reply("🔄 Reset done: next number is **1**.");
  }

  if (interaction.commandName === "count") {
    return interaction.reply(
      `📊 Current count: **${data.count}**\n➡️ Next number: **${data.count + 1}**`
    );
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
