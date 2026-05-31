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
// 2️⃣ GET STREAMING LINK (PLAYER URL)
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
        
        // Cari iframe player
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && (src.includes('filedon') || src.includes('embed') || src.includes('player') || src.includes('drive') || src.includes('dood') || src.includes('stream') || src.includes('anime'))) {
                playerUrl = src;
                return false;
            }
        });
        
        // Cari link download alternatif
        if (!playerUrl) {
            $('a[href*="filedon.co"], a[href*="doodstream"], a[href*="drive.google"], a[href*="mp4"]').each((i, el) => {
                const href = $(el).attr('href');
                if (href && !downloadLinks.includes(href)) {
                    downloadLinks.push(href);
                }
            });
            playerUrl = downloadLinks[0] || null;
        }
        
        // Ambil judul episode
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
};
