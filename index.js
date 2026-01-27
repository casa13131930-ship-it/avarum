require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { Pool } = require("pg");

/* =========================
   CLIENTE DISCORD
========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/* =========================
   BANCO SUPABASE
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool
  .connect()
  .then(() => console.log("🟢 Conectado ao Supabase"))
  .catch((err) => console.error("🔴 Erro no banco:", err));

/* =========================
   BOT ONLINE
========================= */
client.once("ready", () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
});

/* =========================
   FUNÇÃO DE DROP
========================= */
async function gerarDrop(monstroNome) {
  // Busca todos os drops do monstro
  const { rows } = await pool.query(
    `
    SELECT i.name, i.rarity, md.chance
    FROM monster_drops md
    JOIN monsters m ON md.monster_id = m.id
    JOIN items i ON md.item_id = i.id
    WHERE LOWER(m.name) = LOWER($1)
    `,
    [monstroNome]
  );

  let loot = [];
  let itensBase = [];
  let caiuRaro = false;

  // Cristal sempre cai
  loot.push("🔹 **Cristal de Monstro**");

  for (const drop of rows) {
    const roll = Math.random() * 100;
    const rarity = drop.rarity.toLowerCase();

    // Define itens base do próprio monstro
    if (
      rarity === "muito fácil" ||
      rarity === "fácil"
    ) {
      itensBase.push(drop);
    }

    // Rolagem normal
    if (roll <= drop.chance) {
      loot.push(`🎁 **${drop.name}** (${drop.rarity})`);

      if (
        rarity === "difícil" ||
        rarity === "muito difícil" ||
        rarity.includes("lendário")
      ) {
        caiuRaro = true;
      }
    }
  }

  /* =========================
     REGRAS DE GARANTIA
  ========================= */

  // Se NENHUM item caiu além do cristal
  if (loot.length === 1 && itensBase.length > 0) {
    const garantido =
      itensBase[Math.floor(Math.random() * itensBase.length)];

    loot.push(
      `🎁 **${garantido.name}** (${garantido.rarity}) — *garantido*`
    );
  }

  // Se caiu item raro, garante também 1 item base
  if (caiuRaro && itensBase.length > 0) {
    const extra =
      itensBase[Math.floor(Math.random() * itensBase.length)];

    loot.push(
      `➕ **${extra.name}** (${extra.rarity}) — *bônus por drop raro*`
    );
  }

  return loot;
}

/* =========================
   COMANDOS DE DROP
========================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // EXEMPLOS DE MONSTROS
  if (message.content === "!drop_slime") {
    const loot = await gerarDrop("Slime de Força");
    message.reply(`⚔️ **Slime de Força derrotado!**\n\n📦 Drops:\n${loot.join("\n")}`);
  }

  if (message.content === "!drop_lesma") {
    const loot = await gerarDrop("Lesma de Cristal");
    message.reply(`⚔️ **Lesma de Cristal derrotada!**\n\n📦 Drops:\n${loot.join("\n")}`);
  }

  if (message.content === "!drop_aranha") {
    const loot = await gerarDrop("Aranha Escarlate");
    message.reply(`⚔️ **Aranha Escarlate derrotada!**\n\n📦 Drops:\n${loot.join("\n")}`);
  }

  if (message.content === "!drop_escorpiao") {
    const loot = await gerarDrop("Escorpião Branco");
    message.reply(`⚔️ **Escorpião Branco derrotado!**\n\n📦 Drops:\n${loot.join("\n")}`);
  }

  if (message.content === "!drop_executor") {
    const loot = await gerarDrop("Louva-Deus Executor");
    message.reply(`👑 **Louva-Deus Executor foi derrotado!**\n\n📦 Drops:\n${loot.join("\n")}`);
  }
});

/* =========================
   LOGIN
========================= */
client.login(process.env.DISCORD_TOKEN);
