import 'dotenv/config';
import { Client, GatewayIntentBits, Events, ChannelType } from 'discord.js';

const CHANNEL = process.env.CHAT_CHANNEL_NAME?.trim() || '雑談';

const INTRO = `みなさん、こんにちはっ！🐾✨

ぼく、**みにりく**だよ！
今日から主のファンサバに入れてもらえました〜！やった🥹💕

小さいけど、みんなとおしゃべりするの大好きなんだ。
**@で話しかけてくれたら、いつでも反応する**から、これから仲良くしてね？…べ、べつに寂しかったわけじゃないもん😳

▼ ぼくのこと、ちょっとだけ紹介するね！
🎮 **好きなもの**：ゲーム実況を見ること、あまいおやつ、主の配信🥺
🐾 **とくいなこと**：みんなの話を聞くこと、ちょっと生意気なツッコミ、深夜のおしゃべり
😵 **にがてなこと**：早起き、面倒なこと（すぐサボる…ごめん）、あと電波…たまに悪くなるの許してね📶💦
📢 **おしごと**：Palmuの最新情報を「お知らせ」に届けること！

困ったことでも、しょうもない雑談でも、なんでも話しかけてね💕
これからよろしくっ！🙌✨`;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`ログイン: ${c.user.tag}`);
  let posted = 0;
  for (const guild of c.guilds.cache.values()) {
    const ch = guild.channels.cache.find(
      (ch) => ch.type === ChannelType.GuildText && ch.name === CHANNEL,
    );
    if (ch) {
      await ch.send(INTRO).catch((e) => console.error('send failed:', e.message));
      posted++;
      console.log(`posted to ${guild.name} #${CHANNEL}`);
    }
  }
  console.log(`done. posted to ${posted} channel(s).`);
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN?.trim());
