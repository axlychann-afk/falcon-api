const scraperGames = require('@bochilteam/scraper-games');

const tebakkalimat = scraperGames.tebakkalimat;
const tebakkata = scraperGames.tebakkata;
const tebakgambar = scraperGames.tebakgambar;
const tebakanime = scraperGames.tebakanime;
const tebaklagu = scraperGames.tebaklagu;
const tebaklirik = scraperGames.tebaklirik;
const asahotak = scraperGames.asahotak;
const family100 = scraperGames.family100;
const siapakahaku = scraperGames.siapakahaku;

const activeGames = new Map();
const TIMEOUT = 120000; // 2 menit
const POIN = 500;

function generateHint(jawaban) {
    const panjang = jawaban.length;
    const revealCount = Math.min(3, Math.floor(panjang / 3));
    return jawaban.slice(0, revealCount) + '×'.repeat(panjang - revealCount);
}

async function startGame(gameType, userId) {
    let result, soal, jawaban;
    
    switch(gameType) {
        case 'tebakkalimat': result = await tebakkalimat(); soal = result.soal; jawaban = result.jawaban; break;
        case 'tebakkata': result = await tebakkata(); soal = result.soal; jawaban = result.jawaban; break;
        case 'tebakgambar': result = await tebakgambar(); soal = result.soal; jawaban = result.jawaban; break;
        case 'tebakanime': result = await tebakanime(); soal = result.soal; jawaban = result.jawaban; break;
        case 'tebaklagu': result = await tebaklagu(); soal = result.soal; jawaban = result.jawaban; break;
        case 'tebaklirik': result = await tebaklirik(); soal = result.soal; jawaban = result.jawaban; break;
        case 'asahotak': result = await asahotak(); soal = result.soal; jawaban = result.jawaban; break;
        case 'family100': result = await family100(); soal = result.soal; jawaban = result.jawaban; break;
        case 'siapakahaku': result = await siapakahaku(); soal = result.soal; jawaban = result.jawaban; break;
        default: throw new Error('Game tidak dikenal');
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
    const games = ['tebakkalimat', 'tebakkata', 'tebakgambar', 'tebakanime', 'tebaklagu', 'tebaklirik', 'asahotak', 'family100', 'siapakahaku'];
    
    games.forEach(game => {
        app.get(`/game/${game}/start`, async (req, res) => {
            const { user_id = 'default' } = req.query;
            
            // Cek game aktif
            if (activeGames.has(user_id)) {
                const gameData = activeGames.get(user_id);
                
                // Untuk user 'default' (web testing), reset otomatis
                if (user_id === 'default') {
                    clearTimeout(gameData.timeout);
                    activeGames.delete(user_id);
                } else {
                    const remaining = Math.ceil((TIMEOUT - (Date.now() - gameData.startTime)) / 1000);
                    return res.status(400).json({
                        status: false,
                        error: `Masih ada game aktif. Selesaikan dulu atau tunggu ${remaining} detik lagi.`,
                        remaining_seconds: remaining,
                        current_game: gameData.type
                    });
                }
            }
            
            try {
                const { soal, jawaban, hint } = await startGame(game, user_id);
                
                // Khusus user 'default' (web testing), langsung hapus game setelah response
                // Karena di web udah keliatan jawabannya, gak perlu nunggu dijawab
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
    
    // Jawab game (khusus bot WA)
    app.get('/game/answer', async (req, res) => {
        const { user_id = 'default', answer } = req.query;
        if (!answer) return res.status(400).json({ status: false, error: 'Parameter "answer" diperlukan' });
        
        // Kalau user default, langsung return (karena game udah dihapus)
        if (user_id === 'default') {
            return res.status(400).json({ status: false, error: 'Endpoint ini khusus untuk bot. Untuk testing langsung lihat response start.' });
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
