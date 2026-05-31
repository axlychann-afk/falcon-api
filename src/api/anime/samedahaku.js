const axios = require('axios');
const cheerio = require('cheerio');

// ──────────────────────────────────────────────────────────────
// 1️⃣ SEARCH ANIME
// ──────────────────────────────────────────────────────────────
async function searchAnime(query) {
    try {
        const searchUrl = `https://v2.samehadaku.how/?s=${encodeURIComponent(query)}`;
        console.log('[Search] URL:', searchUrl);
        
        const { data } = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const results = [];
        
        // Coba berbagai selector
        $('article.animpost, .animepost, .post, .item').each((i, el) => {
            // Ambil link
            let link = $(el).find('.animposx a').attr('href');
            if (!link) link = $(el).find('h2 a').attr('href');
            if (!link) link = $(el).find('.title a').attr('href');
            if (!link) link = $(el).find('a').first().attr('href');
            
            // Ambil judul
            let title = $(el).find('.data .title h2').text().trim();
            if (!title) title = $(el).find('h2').text().trim();
            if (!title) title = $(el).find('.title').text().trim();
            if (!title) title = $(el).find('h3').text().trim();
            
            // Ambil gambar
            let image = $(el).find('.content-thumb img').attr('src');
            if (!image) image = $(el).find('img').first().attr('src');
            
            // Ambil info lain
            const type = $(el).find('.type').text().trim() || '-';
            const score = $(el).find('.score').text().trim() || '-';
            const status = $(el).find('.status').text().trim() || '-';
            
            if (title && link && link.includes('/anime/')) {
                results.push({
                    title: title,
                    url: link,
                    image: image || null,
                    type: type,
                    score: score,
                    status: status
                });
            }
        });
        
        // Hapus duplikat berdasarkan URL
        const unique = [];
        const seen = new Set();
        for (const item of results) {
            if (!seen.has(item.url)) {
                seen.add(item.url);
                unique.push(item);
            }
        }
        
        console.log('[Search] Found:', unique.length);
        return unique;
        
    } catch (error) {
        console.error('[Search Error]', error.message);
        throw new Error(`Gagal search: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────────
// 2️⃣ GET LATEST ANIME
// ──────────────────────────────────────────────────────────────
async function getLatestAnime() {
    try {
        const url = 'https://v2.samehadaku.how/';
        console.log('[Latest] URL:', url);
        
        const { data } = await axios.get(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const animes = [];
        
        // Cari di bagian terbaru (biasanya di homepage)
        $('.animepost, .post, .item, article').each((i, el) => {
            let link = $(el).find('a[href*="/anime/"]').attr('href');
            if (!link) link = $(el).find('a').first().attr('href');
            
            let title = $(el).find('.title, h3, h2').first().text().trim();
            if (!title) title = $(el).find('a').first().text().trim();
            
            let episode = $(el).find('.episode, .eps, .epz').text().trim();
            let thumbnail = $(el).find('img').first().attr('src');
            
            if (title && link && link.includes('/anime/') && animes.length < 30) {
                animes.push({
                    title: title.substring(0, 60),
                    url: link,
                    episode: episode || 'Episode terbaru',
                    thumbnail: thumbnail || null
                });
            }
        });
        
        // Hapus duplikat
        const unique = [];
        const seen = new Set();
        for (const item of animes) {
            if (!seen.has(item.url)) {
                seen.add(item.url);
                unique.push(item);
            }
        }
        
        console.log('[Latest] Found:', unique.length);
        return unique.slice(0, 20);
        
    } catch (error) {
        console.error('[Latest Error]', error.message);
        throw new Error(`Gagal ambil anime terbaru: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────────
// 3️⃣ GET SCHEDULE (JADWAL RILIS)
// ──────────────────────────────────────────────────────────────
async function getSchedule() {
    try {
        // Coba API endpoint
        const apiUrl = 'https://v2.samehadaku.how/wp-json/custom/v1/all-schedule?perpage=50';
        console.log('[Schedule] URL:', apiUrl);
        
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
        
        console.log('[Schedule] Success');
        return schedule;
        
    } catch (error) {
        console.error('[Schedule Error]', error.message);
        // Return schedule kosong dengan pesan error
        throw new Error(`Gagal ambil jadwal: ${error.message}`);
    }
}

// ──────────────────────────────────────────────────────────────
// 4️⃣ GET STREAMING LINK (PLAYER URL)
// ──────────────────────────────────────────────────────────────
async function getStreamingUrl(episodeUrl) {
    try {
        console.log('[Stream] URL:', episodeUrl);
        
        const { data } = await axios.get(episodeUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        let playerUrl = null;
        let downloadLinks = [];
        
        // Cari iframe player
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && (src.includes('filedon') || src.includes('embed') || src.includes('player') || src.includes('drive') || src.includes('dood') || src.includes('stream') || src.includes('mp4'))) {
                playerUrl = src;
                return false;
            }
        });
        
        // Cari link download
        if (!playerUrl) {
            $('a[href*="filedon.co"], a[href*="doodstream"], a[href*="drive.google"], a[href*=".mp4"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href && !downloadLinks.includes(href)) {
                    downloadLinks.push(href);
                }
            });
            playerUrl = downloadLinks[0] || null;
        }
        
        // Ambil judul episode
        const title = $('h1.entry-title').text().trim() || 
                      $('.titleep').text().trim() || 
                      'Episode';
        
        console.log('[Stream] Player found:', !!playerUrl);
        
        return {
            success: true,
            title: title,
            player_url: playerUrl,
            download_links: downloadLinks
        };
        
    } catch (error) {
        console.error('[Stream Error]', error.message);
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
            console.error('[Search API Error]', error.message);
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
            console.error('[Latest API Error]', error.message);
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
            
            // Cek apakah ada data
            const hasData = Object.values(schedule).some(day => day.length > 0);
            
            if (!hasData) {
                return res.status(404).json({
                    status: false,
                    creator: 'AxlyChann',
                    error: 'Tidak ada jadwal yang ditemukan',
                    fallback_url: 'https://v2.samehadaku.how/jadwal-rilis/'
                });
            }
            
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: schedule
            });
            
        } catch (error) {
            console.error('[Schedule API Error]', error.message);
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
            console.error('[Stream API Error]', error.message);
            res.status(500).json({
                status: false,
                creator: 'AxlyChann',
                error: error.message
            });
        }
    });
};
