const axios = require('axios');
const http = require('http');

const BS_TOKEN = process.env.BRAWL_STARS_TOKEN;
const PLAYER_TAG = process.env.PLAYER_TAG;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ENCODED_TAG = PLAYER_TAG ? PLAYER_TAG.replace('#', '%23') : '';
const API_URL = `https://api.brawlstars.com/v1/players/${ENCODED_TAG}/battlelog`;

http.createServer((req, res) => { res.end('OK'); }).listen(process.env.PORT || 3000);

let lastBattleTime = null;

async function check() {
  if (!BS_TOKEN || BS_TOKEN === 'gecici') return;

  try {
    const res = await axios.get(API_URL, {
      headers: {
        'Authorization': `Bearer ${BS_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    const items = res.data.items;
    if (!items || items.length === 0) return;

    if (lastBattleTime === null) {
      lastBattleTime = items[0].battleTime;
      console.log("BAĞLANTI BAŞARILI! Maçlar izleniyor...");
      return;
    }

    if (items[0].battleTime !== lastBattleTime) {
      const b = items[0].battle;
      const emoji = b.result === 'victory' ? "🏆" : "❌";
      const text = `<b>${emoji} MAÇ BİTTİ!</b>\nKupa: ${b.trophyChange || 0}`;
      
      await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        chat_id: TG_CHAT_ID, text: text, parse_mode: 'HTML'
      });
      lastBattleTime = items[0].battleTime;
    }
  } catch (err) {
    if (err.response) {
      console.log(`Hata: ${err.response.status} - Token veya IP reddedildi.`);
    } else {
      console.log("Bağlantı hatası: " + err.message);
    }
  }
}

setInterval(check, 5000);