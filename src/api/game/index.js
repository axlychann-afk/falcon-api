const {
    tebakkalimat,
    tebakkata,
    tebakgambar,
    tebakanime,
    tebaklagu,
    tebaklirik,
    asahotak,
    family100,
    siapakahaku
} = require('@bochilteam/scraper-games');

const activeGames = new Map();
const TIMEOUT = 120000;
const POIN = 500;

function generateHint(jawaban) {
    const panjang = jawaban.length;
    const revealCount = Math.min(3, Math.floor(panjang / 3));
    const hint = jawaban.slice(0, revealCount) + '×'.repeat(panjang - revealCount);
    return hint;
}

async function startGame(gameType, userId) {
    let result, soal, jawaban;
    
    switch(gameType) {
        case 'tebakkalimat':
            result = await tebakkalimat();
            soal = result.soal;
            jawaban = result.jawaban;
            break;
        case 'tebakkata':
            result = await tebakkata();
            soal = result.soal;
            jawaban = result.jawaban;
            break;
        case 'tebakgambar':
            result = await tebakgambar();
            soal = result.soal;
            jawaban = result.jawaban;
            break;
        case 'tebakanime':
            result = await tebakanime();
            soal = result.soal;
            jawaban = result.jawaban;
            break;
        case 'tebaklagu':
            result = await tebaklagu();
            soal = result.soal;
            jawaban = result.jawaban;
            break;
        case 'tebaklirik':
            result = await tebaklirik();
            soal = result.soal;
            jawaban = result.jawaban;
            break;
        case 'asahotak':
            result = await asahotak();
            soal = result.soal;
            jawaban = result.jawaban;
            break;
        case 'family100':
            result = await family100();
            soal = result.soal;
            jawaban = result.jawaban;
            break;
        case 'siapakahaku':
            result = await siapakahaku();
            soal = result.soal;
            jawaban = result.jawaban;
            break;
        default:
            throw new Error('Game tidak dikenal');
    }
    
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
    // Start games
    const games = [
        'tebakkalimat', 'tebakkata', 'tebakgambar', 'tebakanime',
        'tebaklagu', 'tebaklirik', 'asahotak', 'family100', 'siapakahaku'
    ];
    
    games.forEach(game => {
        app.get(`/game/${game}/start`, async (req, res) => {
            const { user_id = 'default' } = req.query;
            
            if (activeGames.has(user_id)) {
                return res.status(400).json({
                    status: false,
                    error: 'Masih ada game aktif. Selesaikan dulu.'
                });
            }
            
            try {
                const { soal, jawaban, hint } = await startGame(game, user_id);
                res.json({
                    status: true,
                    creator: 'AxlyChann',
                    result: { soal, jawaban, hint }
                });
            } catch (error) {
                res.status(500).json({ status: false, error: error.message });
            }
        });
    });
    
    // Answer
    app.get('/game/answer', async (req, res) => {
        const { user_id = 'default', answer } = req.query;
        
        if (!answer) {
            return res.status(400).json({ status: false, error: 'Parameter "answer" diperlukan' });
        }
        
        const game = activeGames.get(user_id);
        if (!game) {
            return res.status(400).json({ status: false, error: 'Tidak ada game aktif.' });
        }
        
        const isCorrect = answer.toLowerCase().trim() === game.jawaban.toLowerCase();
        const timeTaken = (Date.now() - game.startTime) / 1000;
        
        clearTimeout(game.timeout);
        activeGames.delete(user_id);
        
        if (isCorrect) {
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    correct: true,
                    message: `✅ Jawaban benar! 🎉\nWaktu: ${timeTaken.toFixed(1)} detik\nBonus: +${POIN} XP`,
                    jawaban: game.jawaban,
                    waktu: timeTaken,
                    bonus: POIN,
                    game_type: game.type
                }
            });
        } else {
            res.json({
                status: false,
                error: `❌ Jawaban salah!`,
                jawaban_benar: game.jawaban,
                game_type: game.type
            });
        }
    });
};
