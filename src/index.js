import 'dotenv/config';
import { Client, GatewayIntentBits, Events, ChannelType } from 'discord.js';
import { miniChat } from './mini-ai.js';
import { initMemory } from './memory.js';
import { startXMonitor } from './x-monitor.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`ログイン完了: ${c.user.tag}`);
  initMemory();
  startXMonitor(client);
});

// ─── メンションで会話 ─────────────────────────────────────────────────────────
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  console.log(`[msg] #${message.channel?.name} ${message.author.tag}: "${message.content}"`);

  // ボット本人のメンション、またはボットが持つロールへのメンションに反応
  const botMember = message.guild?.members?.me;
  const mentionedByRole = botMember
    ? message.mentions.roles.some((r) => botMember.roles.cache.has(r.id))
    : false;
  const isMentioned = message.mentions.users.has(client.user.id)
    || message.content.includes(`<@${client.user.id}>`)
    || mentionedByRole;
  if (!isMentioned) return;

  const userText = message.content.replace(/<@!?\d+>/g, '').trim();
  const name = message.member?.displayName ?? message.author.username;
  console.log(`[AI] mention from ${message.author.tag}: "${userText}"`);
  await message.channel.sendTyping();
  try {
    const reply = await miniChat(message.author.id, name, userText || 'よんだ？');
    await message.reply(reply);
  } catch (e) {
    console.error('mini-ai error:', e);
    await message.reply('あかん、今ちょっと調子悪いわ…また呼んでや🥲');
  }
});

client.login(process.env.DISCORD_TOKEN?.trim());
