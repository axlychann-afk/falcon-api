const scraperGames = require('@bochilteam/scraper-games');

const gamesList = [
    'tebakgambar', 'caklontong', 'family100', 'asahotak',
    'tebakkata', 'tekateki', 'tebakkimia', 'tebakkabupaten',
    'siapakahaku', 'susunkata', 'tebakbendera', 'tebaklirik', 'tebaktebakan'
];

const activeGames = new Map();
const TIMEOUT = 120000;
const POIN = 500;

function generateHint(jawaban) {
    if (!jawaban) return '???';
    const panjang = jawaban.length;
    const revealCount = Math.min(3, Math.floor(panjang / 3));
    return jawaban.slice(0, revealCount) + '×'.repeat(panjang - revealCount);
}

async function getGameData(gameType) {
    const gameFunc = scraperGames[gameType];
    const result = await gameFunc();
    
    let soal, jawaban;
    
    switch(gameType) {
        case 'tebakbendera':
            soal = result.img || result.flag || 'Bendera negara apa?';
            jawaban = result.name || result.jawaban;
            break;
        case 'tebakkimia':
            soal = result.unsur || result.soal || 'Unsur kimia?';
            jawaban = result.lambang || result.jawaban;
            break;
        case 'tebakkabupaten':
            soal = `Kabupaten/kota: ${result.title || ''}`;
            jawaban = result.title || result.jawaban;
            break;
        default:
            soal = result.soal;
            jawaban = result.jawaban;
    }
    
    if (!soal || !jawaban) {
        throw new Error(`Response game ${gameType} tidak valid`);
    }
    
    return { soal, jawaban };
}

async function startGame(gameType, userId) {
    const { soal, jawaban } = await getGameData(gameType);
    const hint = generateHint(jawaban);
    
    activeGames.set(userId, {
        type: gameType,
        soal: soal,
        jawaban: jawaban,
        startTime: Date.now(),
        timeout: setTimeout(() => activeGames.delete(userId), TIMEOUT)
    });
    
    return { soal, jawaban, hint };
}

module.exports = (app) => {
    gamesList.forEach(game => {
        app.get(`/game/${game}/start`, async (req, res) => {
            const { user_id = 'default' } = req.query;
            
            if (activeGames.has(user_id) && user_id !== 'default') {
                return res.status(400).json({ status: false, error: 'Masih ada game aktif. Selesaikan dulu.' });
            }
            
            if (user_id === 'default' && activeGames.has('default')) {
                clearTimeout(activeGames.get('default').timeout);
                activeGames.delete('default');
            }
            
            try {
                const { soal, jawaban, hint } = await startGame(game, user_id);
                
                if (user_id === 'default') {
                    const gameData = activeGames.get('default');
                    if (gameData) {
                        clearTimeout(gameData.timeout);
                        activeGames.delete('default');
                    }
                }
                
                res.json({ status: true, creator: 'AxlyChann', result: { soal, jawaban, hint } });
            } catch (error) {
                res.status(500).json({ status: false, error: error.message });
            }
        });
    });
    
    app.get('/game/answer', async (req, res) => {
        const { user_id = 'default', answer } = req.query;
        if (!answer) return res.status(400).json({ status: false, error: 'Parameter "answer" diperlukan' });
        
        if (user_id === 'default') {
            return res.status(400).json({ status: false, error: 'Endpoint ini khusus untuk bot.' });
        }
        
        const game = activeGames.get(user_id);
        if (!game) return res.status(400).json({ status: false, error: 'Tidak ada game aktif.' });
        
        const isCorrect = answer.toLowerCase().trim() === game.jawaban.toLowerCase();
        const timeTaken = (Date.now() - game.startTime) / 1000;
        
        clearTimeout(game.timeout);
        activeGames.delete(user_id);
        
        if (isCorrect) {
            res.json({ status: true, creator: 'AxlyChann', result: { correct: true, message: `✅ Jawaban benar! Waktu: ${timeTaken.toFixed(1)} detik`, jawaban: game.jawaban, waktu: timeTaken, bonus: POIN, game_type: game.type } });
        } else {
            res.json({ status: false, error: `❌ Jawaban salah!`, jawaban_benar: game.jawaban, game_type: game.type });
        }
    });
};
