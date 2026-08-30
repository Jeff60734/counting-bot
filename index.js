const fs = require("fs");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
res.send("Counting bot is running!");
});

app.listen(PORT, () => {
console.log("Web server running on port ${PORT}");
});

const {
Client,
GatewayIntentBits,
REST,
Routes,
SlashCommandBuilder,
PermissionFlagsBits
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Your Discord user ID
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

/* =========================
LOAD SERVER DATA
========================= */

// Each Discord server gets its own counting data
let serverData = {};

if (fs.existsSync("./count.json")) {
try {
serverData = JSON.parse(
fs.readFileSync("./count.json", "utf8")
);
} catch (error) {
console.error("Error loading count.json:", error);
serverData = {};
}
}

function save() {
fs.writeFileSync(
"./count.json",
JSON.stringify(serverData, null, 2)
);
}

// Get or create data for a specific server
function getServerData(guildId) {
if (!serverData[guildId]) {
serverData[guildId] = {
count: 0,
lastUser: null,
warning: false,
channelId: null
};

save();

}

return serverData[guildId];
}

/* =========================
MILESTONES
========================= */

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
.setName("setup")
.setDescription("Set this channel as the counting channel"),

new SlashCommandBuilder()
.setName("test")
.setDescription("Sets next number to 100"),

new SlashCommandBuilder()
.setName("reset")
.setDescription("Resets count to 1"),

new SlashCommandBuilder()
.setName("count")
.setDescription("Shows current counting number"),

new SlashCommandBuilder()
.setName("setcount")
.setDescription("Set the next number (admin only)")
.addIntegerOption(option =>
option
.setName("number")
.setDescription("Number to set")
.setRequired(true)
)
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
// Ignore bot messages
if (message.author.bot) return;

// Ignore DMs
if (!message.guild) return;

// Get this server's separate data
const data = getServerData(message.guild.id);

// Only count in this server's configured channel
if (!data.channelId) return;
if (message.channel.id !== data.channelId) return;

const content = message.content.trim();

// Ignore messages that aren't just numbers
if (!/^\d+$/.test(content)) return;

const num = parseInt(content, 10);
const expected = data.count + 1;

// Delete repeat count from the same user
if (message.author.id === data.lastUser) {
await message.delete().catch(() => {});
return;
}

// Correct number
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

// Normal reset before 100
if (data.count < 99) {
data.count = 0;
data.lastUser = null;
data.warning = false;

save();

await message.react("❌");

await message.channel.send(
  "❌ Reset! Start again from **1**."
);

return;

}

// First mistake at 100 or higher = warning
if (!data.warning) {
data.warning = true;

save();

await message.react("⚠️");

await message.channel.send(
  `⚠️ Wrong! Next number should be **${expected}**.`
);

return;

}

// Second mistake = reset
data.count = 0;
data.lastUser = null;
data.warning = false;

save();

await message.react("❌");

await message.channel.send(
"❌ Count reset! Start again from 1."
);
});

/* =========================
SLASH COMMAND HANDLER
========================= */

client.on("interactionCreate", async (interaction) => {
if (!interaction.isChatInputCommand()) return;

// Ignore commands outside servers
if (!interaction.guild) {
return interaction.reply({
content: "❌ This bot can only be used inside a server.",
ephemeral: true
});
}

// Get this server's separate data
const data = getServerData(interaction.guild.id);

/* =========================
PUBLIC COMMAND
========================= */

if (interaction.commandName === "count") {
if (!data.channelId) {
return interaction.reply({
content: '⚠️ No counting channel has been set up yet. An administrator can use "/setup" in a channel.',
ephemeral: true
});
}

return interaction.reply(
"📊 Current count: ** ${data.count} ** 
 ➡️ Next number: **${data.count + 1}**"
);
}

/* =========================
ADMIN CHECK
========================= */

// You can always use admin commands
const isAllowedUser = ALLOWED_USERS.includes(
interaction.user.id
);

// Server administrators can also use admin commands
const isAdmin =
interaction.memberPermissions?.has(
PermissionFlagsBits.Administrator
);

// Only you or server administrators can use admin commands
if (!isAllowedUser && !isAdmin) {
return interaction.reply({
content: "❌ You need Administrator permission to use this command.",
ephemeral: true
});
}

/* =========================
SETUP
========================= */

if (interaction.commandName === "setup") {
data.channelId = interaction.channel.id;

// Reset this server's count when changing channel
data.count = 0;
data.lastUser = null;
data.warning = false;

save();

return interaction.reply(
  "✅ This channel is now this server's counting channel!\n\n" +
  "Start counting by typing **1**."
);

}

/* =========================
TEST
========================= */

if (interaction.commandName === "test") {
data.count = 99;
data.lastUser = null;
data.warning = false;

save();

return interaction.reply(
  "🧪 Test mode: next number is **100**."
);

}

/* =========================
RESET
========================= */

if (interaction.commandName === "reset") {
data.count = 0;
data.lastUser = null;
data.warning = false;

save();

return interaction.reply(
  "🔄 Reset done: next number is **1**."
);

}

/* =========================
SET COUNT
========================= */

if (interaction.commandName === "setcount") {
const value = interaction.options.getInteger("number");

if (value < 1) {
  return interaction.reply({
    content: "❌ The number must be **1 or higher**.",
    ephemeral: true
  });
}

data.count = value - 1;
data.lastUser = null;
data.warning = false;

save();

return interaction.reply(
  `🔧 Next number set to **${value}**.`
);

}
});

/* =========================
BOT READY
========================= */

client.once("ready", () => {
console.log("Logged in as ${client.user.tag}");
console.log(
"Serving ${client.guilds.cache.size} server(s)."
);
});

client.login(TOKEN);
