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
LOAD DATA
========================= */

let data = {
count: 0,
lastUser: null,
warning: false,
channelId: null
};

if (fs.existsSync("./count.json")) {
data = {
...data,
...JSON.parse(fs.readFileSync("./count.json"))
};
}

function save() {
fs.writeFileSync(
"./count.json",
JSON.stringify(data, null, 2)
);
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
if (message.author.bot) return;

// Only allow counting in the setup channel
if (!data.channelId) return;
if (message.channel.id !== data.channelId) return;

const content = message.content.trim();

// Ignore messages that aren't just numbers
if (!/^\d+$/.test(content)) return;

const num = parseInt(content);
const expected = data.count + 1;

// Delete repeat count from same user
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

// Reset normally before 100
if (data.count < 99) {
data.count = 0;
data.lastUser = null;
data.warning = false;
save();

await message.react("❌");

message.channel.send(
  "❌ Reset! Start again from **1**."
);

return;

}

// First mistake at 100+ = warning
if (!data.warning) {
data.warning = true;
save();

await message.react("⚠️");

message.channel.send(
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

message.channel.send(
"❌ Count reset! Start again from 1."
);
});

/* =========================
SLASH COMMAND HANDLER
========================= */

client.on("interactionCreate", async (interaction) => {
if (!interaction.isChatInputCommand()) return;

// Public command
if (interaction.commandName === "count") {
if (!data.channelId) {
return interaction.reply({
content: "⚠️ No counting channel has been set up yet.",
ephemeral: true
});
}

return interaction.reply(
  `📊 Current count: **${data.count}**\n➡️ Next number: **${data.count + 1}**`
);

}

// Check if user is you
const isAllowedUser = ALLOWED_USERS.includes(
interaction.user.id
);

// Check if user has Administrator permission
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

// Optional: reset counting when changing channels
data.count = 0;
data.lastUser = null;
data.warning = false;

save();

return interaction.reply(
  `✅ This channel is now the counting channel!\n\n` +
  `Start counting by typing **1**.`
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
const value =
interaction.options.getInteger("number");

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

if (data.channelId) {
console.log(
"Counting channel: ${data.channelId}"
);
} else {
console.log(
"No counting channel set. Use /setup in a channel."
);
}
});

client.login(TOKEN);
