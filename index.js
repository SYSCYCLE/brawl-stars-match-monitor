const axios = require('axios');
const http = require('http');

const BS_TOKEN = process.env.BRAWL_STARS_TOKEN;
const PLAYER_TAG = process.env.PLAYER_TAG; 
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ENCODED_TAG = PLAYER_TAG ? PLAYER_TAG.replace('#', '%23') : '';
const API_URL = `https://api.brawlstars.com/v1/players/${ENCODED_TAG}/battlelog`;

let lastBattleTime = null;

axios.get('https://api.ipify.org?format=json')
    .then(r => console.log("!!! RAILWAY IP ADRESIN: " + r.data.ip + " !!!"))
    .catch(() => console.log("IP su an alinamadi..."));

http.createServer((req, res) => { res.end('OK'); }).listen(process.env.PORT || 3000);

async function sendTelegram(message) {
    if (!TG_TOKEN || !TG_CHAT_ID) return;
    try {
        await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            chat_id: TG_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    } catch (err) { console.error("TG Hatası"); }
}

async function checkBattles() {
    if (!BS_TOKEN || !PLAYER_TAG || BS_TOKEN === 'gecici') return;

    try {
        const response = await axios.get(API_URL, {
            headers: { 'Authorization': `Bearer ${BS_TOKEN}` }
        });

        const battles = response.data.items;
        if (!battles || battles.length === 0) return;

        const latestBattle = battles[0];
        const battleTime = latestBattle.battleTime;

        if (lastBattleTime === null) {
            lastBattleTime = battleTime;
            console.log("Sistem baslatildi. Maclar bekleniyor...");
            return;
        }

        if (battleTime === lastBattleTime) return;

        const b = latestBattle.battle;
        const e = latestBattle.event;
        let resultEmoji = b.result === 'victory' ? "🏆" : "❌";
        let resultText = b.result === 'victory' ? "ZAFER" : "YENILGI";
        if (b.rank) { resultEmoji = "🏅"; resultText = b.rank + ". Oldun"; }
        
        const msg = `<b>${resultEmoji} SONUÇ: ${resultText}</b> (${b.trophyChange || 0} Kupa)\n\n🗺️ <b>Harita:</b> ${e.map}\n🎮 <b>Mod:</b> ${e.mode.toUpperCase()}`;

        await sendTelegram(msg);
        lastBattleTime = battleTime;
        console.log("Yeni mac Telegram'a gonderildi!");

    } catch (error) {
        if (error.response && error.response.status === 403) {
            console.log("403 HATASI: IP Yetkisi yok.");
        }
    }
}

setInterval(checkBattles, 5000);