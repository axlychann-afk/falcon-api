const axios = require('axios');
const cheerio = require('cheerio');

// ──────────────────────────────────────────────────────────────
// 1️⃣ SEARCH ANIME
// ──────────────────────────────────────────────────────────────
async function searchAnime(query) {
    try {
        const searchUrl = `https://v2.samehadaku.how/?s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const results = [];
        
        // Cari link anime
        $('a[href*="/anime/"]').each((i, el) => {
            const link = $(el).attr('href');
            let title = $(el).find('h2, h3, .title').text().trim();
            if (!title) title = $(el).text().trim();
            
            if (title && link && link.includes('/anime/') && title.length > 3 && title.length < 100) {
                const exists = results.find(r => r.url === link);
                if (!exists) {
                    results.push({
                        title: title,
                        url: link,
                        image: null,
                        type: '-',
                        score: '-',
                        status: '-'
                    });
                }
            }
        });
        
        return results.slice(0, 20);
    } catch (error) {
        console.error('[Search Error]', error.message);
        return [];
    }
}

// ──────────────────────────────────────────────────────────────
// 2️⃣ GET LATEST ANIME (berdasarkan struktur yang kamu kasih)
// ──────────────────────────────────────────────────────────────
async function getLatestAnime() {
    try {
        const url = 'https://v2.samehadaku.how/anime-terbaru/';
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const animes = [];
        
        // Dari struktur yang kamu kasih, anime ada di dalam div#container
        // Cari semua link yang mengarah ke anime
        $('#container a[href*="/anime/"]').each((i, el) => {
            const link = $(el).attr('href');
            let title = $(el).text().trim();
            
            // Filter judul yang terlalu pendek (bukan judul anime)
            if (title && link && title.length > 5 && title.length < 100 && link.includes('/anime/')) {
                // Cek apakah sudah ada
                const exists = animes.find(a => a.url === link);
                if (!exists) {
                    // Cari episode di sekitar elemen ini
                    let episode = '-';
                    let parent = $(el).parent();
                    for (let j = 0; j < 5; j++) {
                        const text = parent.text();
                        const match = text.match(/Episode\s*(\d+)/i);
                        if (match) {
                            episode = `Episode ${match[1]}`;
                            break;
                        }
                        parent = parent.parent();
                    }
                    
                    animes.push({
                        title: title,
                        url: link,
                        episode: episode,
                        thumbnail: null
                    });
                }
            }
        });
        
        // Hapus duplikat berdasarkan URL
        const unique = [];
        const seen = new Set();
        for (const item of animes) {
            if (!seen.has(item.url)) {
                seen.add(item.url);
                unique.push(item);
            }
        }
        
        return unique.slice(0, 20);
        
    } catch (error) {
        console.error('[Latest Error]', error.message);
        return [];
    }
}

// ──────────────────────────────────────────────────────────────
// 3️⃣ GET SCHEDULE
// ──────────────────────────────────────────────────────────────
async function getSchedule() {
    try {
        // Coba pake API endpoint
        const apiUrl = 'https://v2.samehadaku.how/wp-json/custom/v1/all-schedule?perpage=50';
        const { data } = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        
        const hariMap = {
            'monday': 'Senin', 'tuesday': 'Selasa', 'wednesday': 'Rabu',
            'thursday': 'Kamis', 'friday': 'Jumat', 'saturday': 'Sabtu', 'sunday': 'Minggu'
        };
        
        const schedule = {
            'Senin': [], 'Selasa': [], 'Rabu': [], 'Kamis': [], 'Jumat': [], 'Sabtu': [], 'Minggu': []
        };
        
        if (data && Array.isArray(data)) {
            for (const item of data) {
                const hari = hariMap[item.day] || item.day;
                if (schedule[hari]) {
                    schedule[hari].push({
                        title: item.title || 'Unknown',
                        url: item.url || '#',
                        time: item.east_time || '-',
                        genre: item.genre || '-',
                        score: item.east_score || '-'
                    });
                }
            }
        }
        
        return schedule;
        
    } catch (error) {
        console.error('[Schedule Error]', error.message);
        return null;
    }
}

// ──────────────────────────────────────────────────────────────
// 4️⃣ GET STREAMING LINK
// ──────────────────────────────────────────────────────────────
async function getStreamingUrl(episodeUrl) {
    try {
        const { data } = await axios.get(episodeUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        let playerUrl = null;
        let downloadLinks = [];
        
        // Cari iframe player
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && (src.includes('filedon') || src.includes('embed') || src.includes('player') || src.includes('drive') || src.includes('mp4'))) {
                playerUrl = src;
                return false;
            }
        });
        
        // Cari link download
        if (!playerUrl) {
            $('a[href*="filedon.co"], a[href*="doodstream"], a[href*="drive.google"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href) downloadLinks.push(href);
            });
            playerUrl = downloadLinks[0] || null;
        }
        
        const title = $('h1.entry-title').text().trim() || 'Episode';
        
        return {
            title: title,
            player_url: playerUrl,
            download_links: downloadLinks
        };
        
    } catch (error) {
        throw new Error(`Gagal ambil streaming: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────────
// EXPORT ENDPOINTS
// ──────────────────────────────────────────────────────────────
module.exports = (app) => {
    
    app.get('/anime/samehadaku/search', async (req, res) => {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyChann',
                error: 'Parameter "q" diperlukan'
            });
        }
        
        try {
            const results = await searchAnime(q);
            res.json({
                status: results.length > 0,
                creator: 'AxlyChann',
                query: q,
                total: results.length,
                results: results
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyChann', error: error.message });
        }
    });
    
    app.get('/anime/samehadaku/latest', async (req, res) => {
        try {
            const results = await getLatestAnime();
            res.json({
                status: results.length > 0,
                creator: 'AxlyChann',
                total: results.length,
                results: results
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyChann', error: error.message });
        }
    });
    
    app.get('/anime/samehadaku/schedule', async (req, res) => {
        try {
            const schedule = await getSchedule();
            if (!schedule) {
                return res.json({
                    status: false,
                    creator: 'AxlyChann',
                    error: 'Gagal mengambil jadwal',
                    fallback_url: 'https://v2.samehadaku.how/jadwal-rilis/'
                });
            }
            res.json({ status: true, creator: 'AxlyChann', result: schedule });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyChann', error: error.message });
        }
    });
    
    app.get('/anime/samehadaku/stream', async (req, res) => {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyChann',
                error: 'Parameter "url" diperlukan'
            });
        }
        
        try {
            const result = await getStreamingUrl(url);
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyChann', error: error.message });
        }
    });
};
