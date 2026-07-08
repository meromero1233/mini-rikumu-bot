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

  // 直近のチャンネルの流れ（前後の会話）を文脈として集める
  let channelContext = '';
  try {
    const recent = await message.channel.messages.fetch({ limit: 8, before: message.id });
    const lines = [...recent.values()]
      .reverse()
      .map((m) => {
        const who = m.author.id === client.user.id
          ? 'ぼく(みにりく)'
          : (m.member?.displayName ?? m.author.username);
        const text = m.content.replace(/<@!?\d+>/g, '').trim();
        return text ? `${who}: ${text}` : null;
      })
      .filter(Boolean);
    channelContext = lines.join('\n');
  } catch { /* 取得失敗は無視 */ }

  try {
    const reply = await miniChat(message.author.id, name, userText || 'よんだ？', channelContext);
    await message.reply(reply);
  } catch (e) {
    console.error('mini-ai error:', e);
    await message.reply('あかん、今ちょっと調子悪いわ…また呼んでや🥲');
  }
});

const token = process.env.DISCORD_TOKEN?.trim();
console.log(`[boot] Web検索(TAVILY): ${process.env.TAVILY_API_KEY ? '有効' : '無効'}`);
if (!token) {
  console.error('[boot] DISCORD_TOKEN is missing! Railwayの環境変数を確認してください。');
}
client.login(token);
