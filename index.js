const axios = require('axios');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BS_TOKEN = process.env.BRAWL_STARS_TOKEN;
const PLAYER_TAG = process.env.PLAYER_TAG; 
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const LOG_FILE = path.join(__dirname, 'processed_matches.log');
const ENCODED_TAG = PLAYER_TAG ? PLAYER_TAG.replace('#', '%23') : '';
const API_URL = `https://api.brawlstars.com/v1/players/${ENCODED_TAG}/battlelog`;

function getProcessedMatches() {
    if (!fs.existsSync(LOG_FILE)) return [];
    try {
        return fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
    } catch (e) { return []; }
}

function saveMatchToLog(battleTime) {
    let matches = getProcessedMatches();
    matches.push(battleTime);
    if (matches.length > 50) matches = matches.slice(-50);
    fs.writeFileSync(LOG_FILE, matches.join('\n'), 'utf8');
}

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
});
server.listen(process.env.PORT || 3000);

async function sendTelegram(message) {
    if (!TG_TOKEN || !TG_CHAT_ID) return false;
    try {
        await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            chat_id: TG_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        return true;
    } catch (err) {
        console.error("TG Hata:", err.message);
        return false;
    }
}

async function checkBattles() {
    if (!BS_TOKEN || !PLAYER_TAG) return;

    try {
        const response = await axios.get(API_URL, {
            headers: { 'Authorization': `Bearer ${BS_TOKEN}`, 'Accept': 'application/json' }
        });

        const battles = response.data.items;
        if (!battles || battles.length === 0) return;

        const processedMatches = getProcessedMatches();
        if (processedMatches.length === 0) {
            battles.forEach(b => saveMatchToLog(b.battleTime));
            return;
        }
        
        const newBattles = battles.filter(b => !processedMatches.includes(b.battleTime)).reverse();

        for (const battle of newBattles) {
            const eventMode = battle.event.mode || "Bilinmiyor";
            const mapName = battle.event.map || "Harita Yok";
            const result = battle.battle.result;
            let trophyChange = battle.battle.trophyChange || 0;
            const duration = battle.battle.duration ? `${battle.battle.duration} sn` : "Belirsiz";
            const type = battle.battle.type;

            let myHero = "Bilinmiyor", myPower = 0, myTrophies = 0;
            
            let allPlayers = [];
            if (battle.battle.teams) {
                allPlayers = battle.battle.teams.flat();
            } else if (battle.battle.players) {
                allPlayers = battle.battle.players;
            }

            const normalizedTag = PLAYER_TAG.startsWith('#') ? PLAYER_TAG : '#' + PLAYER_TAG;
            const me = allPlayers.find(p => p.tag === normalizedTag);
            
            if (me) {
                if (me.brawler) {
                    myHero = me.brawler.name;
                    myPower = me.brawler.power;
                    myTrophies = me.brawler.trophies;
                } else if (me.brawlers && me.brawlers.length > 0) {
                    const lastBrawler = me.brawlers[me.brawlers.length - 1];
                    myHero = lastBrawler.name;
                    myPower = lastBrawler.power;
                    myTrophies = lastBrawler.trophies;
                    if (trophyChange === 0) {
                        trophyChange = me.brawlers.reduce((sum, b) => sum + (b.trophyChange || 0), 0);
                    }
                }
            }

            let resultEmoji = "❓", resultText = "SONUÇ YOK";
            if (result === 'victory') { resultEmoji = "🏆"; resultText = "ZAFER"; }
            else if (result === 'defeat') { resultEmoji = "❌"; resultText = "YENİLGİ"; }
            else if (result === 'draw') { resultEmoji = "⚖️"; resultText = "BERABERE"; }
            else if (battle.battle.rank) { 
                resultEmoji = battle.battle.rank === 1 ? "🥇" : "#️⃣";
                resultText = `${battle.battle.rank}. Oldun`;
            }

            const trophyStr = trophyChange >= 0 ? `+${trophyChange}` : `${trophyChange}`;
            const isStarPlayer = battle.battle.starPlayer && battle.battle.starPlayer.tag === normalizedTag;
            const starPlayerText = isStarPlayer ? "\n🌟 <b>YILDIZ OYUNCU!</b> 🌟" : "";

            const msg = `<b>${resultEmoji} SONUÇ: ${resultText}</b> (${trophyStr} Kupa)

👾 <b>Karakter:</b> ${myHero} (Sv. ${myPower})
🏆 <b>Kupa:</b> ${myTrophies}

🗺️ <b>Harita:</b> ${mapName}
🎮 <b>Mod:</b> ${eventMode.toUpperCase()}
⏱️ <b>Süre:</b> ${duration}
🎲 <b>Tip:</b> ${type}
${starPlayerText}`;

            const isSent = await sendTelegram(msg);
            if (isSent) {
                saveMatchToLog(battle.battleTime);
            } else {
                break; 
            }
            
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

    } catch (error) {
        console.error("Hata:", error.message);
    }
}

setInterval(checkBattles, 5000);
checkBattles();
