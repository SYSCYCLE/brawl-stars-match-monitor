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
  if (!BS_TOKEN || BS_TOKEN === 'gecici') {
    console.log("Hata: Değişkenler Railway'e girilmemiş!");
    return;
  }

  try {
    const res = await axios.get(API_URL, {
      headers: {
        'Authorization': `Bearer ${BS_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    console.log("--- BAĞLANTI BAŞARILI! MAÇLAR İZLENİYOR ---");
    
    if (lastBattleTime === null) {
      lastBattleTime = res.data.items[0].battleTime;
      return;
    }

    if (res.data.items[0].battleTime !== lastBattleTime) {
      await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        chat_id: TG_CHAT_ID,
        text: "🏆 Maç Bitti! Sonuçlar Telegram'a yollandı.",
        parse_mode: 'HTML'
      });
      lastBattleTime = res.data.items[0].battleTime;
    }
  } catch (err) {
    if (err.response && err.response.status === 403) {
      const ipCheck = await axios.get('https://api.ipify.org?format=json');
      console.log(`!!! 403 HATASI !!!`);
      console.log(`1. Şu IP'yi Portal'a ekle: ${ipCheck.data.ip}`);
      console.log(`2. Token'ın sonu şununla mı bitiyor: ...${BS_TOKEN.substring(BS_TOKEN.length - 10)}`);
    } else {
      console.log("Hata: " + err.message);
    }
  }
}

setInterval(check, 5000);