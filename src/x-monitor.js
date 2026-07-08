import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { ChannelType } from 'discord.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });

const X_API_KEY = process.env.X_API_KEY?.trim();
const TARGET = (process.env.X_TARGET?.trim() || 'palmu_jp').replace(/^@/, '');
const NEWS_CHANNEL_NAME = process.env.NEWS_CHANNEL_NAME?.trim() || 'お知らせ';
const DATA_DIR = process.env.DATA_DIR?.trim() || './data';
const STATE_FILE = path.join(DATA_DIR, 'x-state.json');

const POLL_MS = 18 * 60 * 1000; // 18分ごと

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastId: null };
  }
}

function saveState(state) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('[x] state save failed:', e.message);
  }
}

// twitterapi.io からユーザーの最新ツイートを取得
async function fetchLatestTweets() {
  const url = `https://api.twitterapi.io/twitter/user/last_tweets?userName=${encodeURIComponent(TARGET)}`;
  const res = await fetch(url, { headers: { 'X-API-Key': X_API_KEY } });
  if (!res.ok) throw new Error(`twitterapi.io ${res.status}: ${await res.text()}`);
  const data = await res.json();

  // レスポンス構造の揺れに強くする
  const tweets =
    data?.data?.tweets ||
    data?.tweets ||
    data?.data ||
    [];
  return Array.isArray(tweets) ? tweets : [];
}

// ツイート内容をミニリクムー風のお知らせにまとめる
async function summarizeTweet(text) {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `以下はライブ配信アプリ「Palmu（パルム）」公式X（Twitter）の新しい投稿です。
コミュニティのみんなに向けて、内容が一目で分かるように日本語でわかりやすくまとめてください。
最後にひとことだけ、関西弁のゆるいマスコット「ミニリクムー」のコメントを添えてください（1文だけ、絵文字1個）。

投稿内容：
${text}`,
        },
      ],
    });
    return msg.content[0].text.trim();
  } catch (e) {
    console.error('[x] summarize failed:', e.message);
    return text; // 失敗時は原文をそのまま
  }
}

function getTweetId(t) {
  return t.id || t.id_str || t.tweet_id || t.rest_id || null;
}

function getTweetText(t) {
  return t.text || t.full_text || t.content || '';
}

function getTweetUrl(t, id) {
  return t.url || t.twitter_url || `https://x.com/${TARGET}/status/${id}`;
}

async function checkOnce(client) {
  if (!X_API_KEY) return;
  try {
    const tweets = await fetchLatestTweets();
    if (tweets.length === 0) return;

    // 新しい順に並んでいる想定。IDで新規判定
    const state = loadState();

    // 初回はお知らせを出さず、最新IDだけ記録（過去分を大量投稿しないため）
    if (!state.lastId) {
      const newestId = getTweetId(tweets[0]);
      saveState({ lastId: newestId });
      console.log(`[x] initialized, latest tweet id = ${newestId}`);
      return;
    }

    // 未通知の新規ツイートを集める（古い→新しい順で投稿するため反転）
    const fresh = [];
    for (const t of tweets) {
      const id = getTweetId(t);
      if (!id) continue;
      if (id === state.lastId) break;
      fresh.push(t);
    }
    if (fresh.length === 0) return;
    fresh.reverse();

    for (const t of fresh) {
      if (t.isReply) continue; // リプライはお知らせに流さない
      const id = getTweetId(t);
      const text = getTweetText(t);
      if (!text) continue;
      const summary = await summarizeTweet(text);
      const link = getTweetUrl(t, id);
      const body = `📢 **パルムから新しいお知らせやで！**\n\n${summary}\n\n🔗 ${link}`;

      for (const guild of client.guilds.cache.values()) {
        const ch = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === NEWS_CHANNEL_NAME,
        );
        if (ch) await ch.send(body).catch(() => {});
      }
    }

    saveState({ lastId: getTweetId(tweets[0]) });
    console.log(`[x] posted ${fresh.length} new tweet(s)`);
  } catch (e) {
    console.error('[x] check failed:', e.message);
  }
}

export function startXMonitor(client) {
  if (!X_API_KEY) {
    console.log('[x] X_API_KEY not set, X monitor disabled');
    return;
  }
  console.log(`[x] monitor started for @${TARGET} -> #${NEWS_CHANNEL_NAME}`);
  // 起動20秒後に初回、以降18分ごと
  setTimeout(() => checkOnce(client), 20_000);
  setInterval(() => checkOnce(client), POLL_MS);
}
