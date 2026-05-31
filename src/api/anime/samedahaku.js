const axios = require('axios');
const cheerio = require('cheerio');

// ──────────────────────────────────────────────────────────────
// 1️⃣ SEARCH ANIME
// ──────────────────────────────────────────────────────────────
async function searchAnime(query) {
    try {
        const searchUrl = `https://v2.samehadaku.how/?s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const results = [];
        
        $('article.animpost').each((i, el) => {
            const link = $(el).find('.animposx a').attr('href');
            const title = $(el).find('.data .title h2').text().trim();
            const image = $(el).find('.content-thumb img').attr('src');
            const type = $(el).find('.content-thumb .type').text().trim();
            const score = $(el).find('.content-thumb .score').text().trim();
            const status = $(el).find('.data .type').text().trim();
            
            if (title && link) {
                results.push({
                    title: title,
                    url: link,
                    image: image || null,
                    type: type || 'Unknown',
                    score: score || '-',
                    status: status || '-'
                });
            }
        });
        
        return results;
    } catch (error) {
        throw new Error(`Gagal search: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────────
// 2️⃣ GET LATEST ANIME
// ──────────────────────────────────────────────────────────────
async function getLatestAnime() {
    try {
        const url = 'https://v2.samehadaku.how/anime-terbaru/';
        const { data } = await axios.get(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const animes = [];
        
        $('.animepost, .item, .post, .list-item, article').each((i, el) => {
            const link = $(el).find('a[href*="samehadaku.how/anime/"]').attr('href') ||
                        $(el).find('.title a, h3 a, .judul a, .anime-title a').attr('href') ||
                        $(el).find('a').first().attr('href');
            
            const title = $(el).find('.judul, .title, h3, .anime-title, h2').first().text().trim();
            const episode = $(el).find('.episode, .eps, .epz').text().trim();
            const thumbnail = $(el).find('img').first().attr('src');
            
            if (title && link && !animes.find(a => a.url === link)) {
                animes.push({
                    title: title,
                    url: link,
                    episode: episode || 'Episode terbaru',
                    thumbnail: thumbnail || null
                });
            }
        });
        
        if (animes.length === 0) {
            $('a[href*="samehadaku.how/anime/"]').each((i, el) => {
                const link = $(el).attr('href');
                const title = $(el).text().trim();
                
                if (title && link && title.length > 3 && animes.length < 30) {
                    animes.push({
                        title: title.substring(0, 60),
                        url: link,
                        episode: 'Episode terbaru',
                        thumbnail: null
                    });
                }
            });
        }
        
        const uniqueAnimes = [];
        const seenUrls = new Set();
        for (const anime of animes) {
            if (!seenUrls.has(anime.url)) {
                seenUrls.add(anime.url);
                uniqueAnimes.push(anime);
            }
        }
        
        return uniqueAnimes.slice(0, 20);
        
    } catch (error) {
        throw new Error(`Gagal ambil anime terbaru: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────────
// 3️⃣ GET SCHEDULE (JADWAL RILIS)
// ──────────────────────────────────────────────────────────────
async function getSchedule() {
    try {
        const apiUrl = 'https://v2.samehadaku.how/wp-json/custom/v1/all-schedule?perpage=50';
        const { data } = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        
        const hariMap = {
            'monday': 'Senin',
            'tuesday': 'Selasa',
            'wednesday': 'Rabu',
            'thursday': 'Kamis',
            'friday': 'Jumat',
            'saturday': 'Sabtu',
            'sunday': 'Minggu'
        };
        
        const schedule = {
            'Senin': [],
            'Selasa': [],
            'Rabu': [],
            'Kamis': [],
            'Jumat': [],
            'Sabtu': [],
            'Minggu': []
        };
        
        for (const item of data) {
            const hari = hariMap[item.day] || item.day;
            if (schedule[hari]) {
                schedule[hari].push({
                    title: item.title,
                    url: item.url,
                    time: item.east_time || '-',
                    genre: item.genre || '-',
                    score: item.east_score || '-'
                });
            }
        }
        
        return schedule;
        
    } catch (error) {
        // Fallback: ambil per hari
        try {
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const hariIndo = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
            
            const schedule = {
                'Senin': [],
                'Selasa': [],
                'Rabu': [],
                'Kamis': [],
                'Jumat': [],
                'Sabtu': [],
                'Minggu': []
            };
            
            for (let i = 0; i < days.length; i++) {
                const { data } = await axios.get(`https://v2.samehadaku.how/wp-json/custom/v1/all-schedule?day=${days[i]}&perpage=20`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    timeout: 10000
                });
                
                if (data && data.length > 0) {
                    for (const anime of data) {
                        schedule[hariIndo[i]].push({
                            title: anime.title,
                            url: anime.url,
                            time: anime.east_time || '-',
                            genre: anime.genre || '-',
                            score: anime.east_score || '-'
                        });
                    }
                }
            }
            
            return schedule;
            
        } catch (fallbackErr) {
            throw new Error(`Gagal ambil jadwal: ${fallbackErr.message}`);
        }
    }
}

// ──────────────────────────────────────────────────────────────
// 4️⃣ GET STREAMING LINK (PLAYER URL)
// ──────────────────────────────────────────────────────────────
async function getStreamingUrl(episodeUrl) {
    try {
        const { data } = await axios.get(episodeUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        let playerUrl = null;
        let downloadLinks = [];
        
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && (src.includes('filedon') || src.includes('embed') || src.includes('player') || src.includes('drive') || src.includes('dood') || src.includes('stream'))) {
                playerUrl = src;
                return false;
            }
        });
        
        if (!playerUrl) {
            $('a[href*="filedon.co"], a[href*="doodstream"], a[href*="drive.google"], a[href*="mp4"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href && !downloadLinks.includes(href)) {
                    downloadLinks.push(href);
                }
            });
            playerUrl = downloadLinks[0] || null;
        }
        
        const title = $('h1.entry-title').text().trim() || $('.titleep').text().trim() || 'Episode';
        
        return {
            success: true,
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
    
    // ─── SEARCH ANIME ──────────────────────────────────────────
    app.get('/anime/samehadaku/search', async (req, res) => {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyChann',
                error: 'Parameter "q" diperlukan (contoh: ?q=naruto)'
            });
        }
        
        try {
            const results = await searchAnime(q);
            
            if (results.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: 'AxlyChann',
                    error: `Tidak ditemukan hasil untuk: ${q}`
                });
            }
            
            res.json({
                status: true,
                creator: 'AxlyChann',
                query: q,
                total: results.length,
                results: results.slice(0, 15)
            });
            
        } catch (error) {
            console.error('[Search Error]', error.message);
            res.status(500).json({
                status: false,
                creator: 'AxlyChann',
                error: error.message
            });
        }
    });
    
    // ─── LATEST ANIME ──────────────────────────────────────────
    app.get('/anime/samehadaku/latest', async (req, res) => {
        try {
            const results = await getLatestAnime();
            
            if (results.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: 'AxlyChann',
                    error: 'Gagal mengambil anime terbaru'
                });
            }
            
            res.json({
                status: true,
                creator: 'AxlyChann',
                total: results.length,
                results: results
            });
            
        } catch (error) {
            console.error('[Latest Error]', error.message);
            res.status(500).json({
                status: false,
                creator: 'AxlyChann',
                error: error.message
            });
        }
    });
    
    // ─── SCHEDULE (JADWAL RILIS) ───────────────────────────────
    app.get('/anime/samehadaku/schedule', async (req, res) => {
        try {
            const schedule = await getSchedule();
            
            // Cek apakah semua hari kosong
            const hasData = Object.values(schedule).some(day => day.length > 0);
            
            if (!hasData) {
                return res.status(404).json({
                    status: false,
                    creator: 'AxlyChann',
                    error: 'Tidak ada jadwal yang ditemukan'
                });
            }
            
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: schedule
            });
            
        } catch (error) {
            console.error('[Schedule Error]', error.message);
            res.status(500).json({
                status: false,
                creator: 'AxlyChann',
                error: error.message,
                fallback_url: 'https://v2.samehadaku.how/jadwal-rilis/'
            });
        }
    });
    
    // ─── GET STREAMING URL ──────────────────────────────────────
    app.get('/anime/samehadaku/stream', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyChann',
                error: 'Parameter "url" diperlukan (URL episode anime)'
            });
        }
        
        try {
            const result = await getStreamingUrl(url);
            
            if (!result.player_url && result.download_links.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: 'AxlyChann',
                    error: 'Link player tidak ditemukan'
                });
            }
            
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    title: result.title,
                    player_url: result.player_url,
                    download_links: result.download_links
                }
            });
            
        } catch (error) {
            console.error('[Stream Error]', error.message);
            res.status(500).json({
                status: false,
                creator: 'AxlyChann',
                error: error.message
            });
        }
    });
};                status: false,
                creator: 'AxlyChann',
                error: 'Parameter "url" diperlukan (URL episode anime)'
            });
        }
        
        try {
            const result = await getStreamingUrl(url);
            
            if (!result.player_url && result.download_links.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: 'AxlyChann',
                    error: 'Link player tidak ditemukan'
                });
            }
            
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    title: result.title,
                    player_url: result.player_url,
                    download_links: result.download_links
                }
            });
            
        } catch (error) {
            console.error('[Stream Error]', error.message);
            res.status(500).json({
                status: false,
                creator: 'AxlyChann',
                error: error.message
            });
        }
    });
};
