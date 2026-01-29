require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { Pool } = require("pg");

// ===== DISCORD =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===== DATABASE (SUPABASE) =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ===== READY =====
client.once("clientReady", async () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);

  try {
    await pool.query("select 1");
    console.log("🟢 Conectado ao Supabase");
  } catch (err) {
    console.error("🔴 Erro ao conectar no banco:", err);
  }
});

// ===== UTIL: CLASSIFICAR RARIDADE =====
function rarityTier(rarity) {
  const r = rarity.toLowerCase();

  if (r.includes("muito fácil")) return 1;
  if (r.includes("fácil")) return 2;
  if (r.includes("normal")) return 3;
  if (r.includes("difícil")) return 4;
  if (r.includes("muito difícil")) return 5;
  if (r.includes("raro")) return 6;
  if (r.includes("épico")) return 7;
  if (r.includes("lendário")) return 8;

  return 3; // padrão
}

// ===== COMANDO DROP =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!drop_")) return;

  const monsterName = message.content.replace("!drop_", "").trim();

  if (!monsterName) {
    return message.reply("❌ Use: `!drop_nomeDoMonstro`");
  }

  try {
    // Buscar monstro
    const monsterRes = await pool.query(
      "select * from monsters where lower(name) = lower($1)",
      [monsterName]
    );

    if (monsterRes.rowCount === 0) {
      return message.reply("❌ Monstro não encontrado.");
    }

    const monster = monsterRes.rows[0];

    // Buscar drops
    const dropsRes = await pool.query(
      `
      select i.name, i.rarity, md.chance
      from monster_drops md
      join items i on i.id = md.item_id
      where md.monster_id = $1
      `,
      [monster.id]
    );

    let loot = [];
    let commons = [];
    let rareDrops = [];

    // Cristal SEMPRE cai
    loot.push("🔹 **Cristal de Monstro**");

    for (const drop of dropsRes.rows) {
      const roll = Math.random() * 100;
      const tier = rarityTier(drop.rarity);

      if (tier <= 2) commons.push(drop);
      if (tier >= 4) rareDrops.push(drop);

      if (roll <= drop.chance) {
        loot.push(`🎁 **${drop.name}** (${drop.rarity})`);
      }
    }

    // 🔒 GARANTIA DE ITEM
    const onlyCrystal = loot.length === 1;

    if (onlyCrystal) {
      if (commons.length > 0) {
        const guaranteed =
          commons[Math.floor(Math.random() * commons.length)];
        loot.push(
          `🎁 **${guaranteed.name}** (${guaranteed.rarity}) — *garantido*`
        );
      }
    }

    // 🎯 RARO PUXA COMUM
    const hasRare = loot.some(
      (l) =>
        l.toLowerCase().includes("difícil") ||
        l.toLowerCase().includes("raro") ||
        l.toLowerCase().includes("épico") ||
        l.toLowerCase().includes("lendário")
    );

    if (hasRare && commons.length > 0) {
      const extra =
        commons[Math.floor(Math.random() * commons.length)];
      loot.push(
        `🎁 **${extra.name}** (${extra.rarity}) — *extra*`
      );
    }

    // ===== RESPOSTA =====
    message.channel.send(
      `⚔️ **${monster.name} foi derrotado!**\n\n📦 **Drops:**\n${loot.join(
        "\n"
      )}`
    );
  } catch (err) {
    console.error(err);
    message.reply("❌ Erro ao gerar drops.");
  }
});

// ===== LOGIN =====
client.login(process.env.DISCORD_TOKEN);
