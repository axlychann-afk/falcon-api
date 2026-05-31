const axios = require('axios');
const cheerio = require('cheerio');

async function getStreamingUrl(episodeUrl) {
    try {
        console.log('[Stream] Episode URL:', episodeUrl);
        
        // 1. Ambil halaman episode Samehadaku
        const { data } = await axios.get(episodeUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Referer': 'https://v2.samehadaku.how/'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        let filedonUrl = null;
        
        // 2. Cari link filedon dari iframe atau anchor
        $('iframe[src*="filedon.co"]').each((i, el) => {
            filedonUrl = $(el).attr('src');
            return false;
        });
        
        if (!filedonUrl) {
            $('a[href*="filedon.co"]').each((i, el) => {
                filedonUrl = $(el).attr('href');
                return false;
            });
        }
        
        if (!filedonUrl) {
            throw new Error('Link filedon tidak ditemukan');
        }
        
        console.log('[Stream] Filedon URL:', filedonUrl);
        
        // 3. Ambil halaman filedon embed
        const filedonRes = await axios.get(filedonUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Referer': 'https://v2.samehadaku.how/'
            },
            timeout: 15000
        });
        
        // 4. Ekstrak MP4 URL dari tag <video>
        const $$ = cheerio.load(filedonRes.data);
        let mp4Url = null;
        
        // Cara 1: Cari di tag <video> langsung
        $$('video').each((i, el) => {
            const src = $$(el).attr('src');
            if (src && src.includes('.mp4')) {
                mp4Url = src;
                return false;
            }
        });
        
        // Cara 2: Cari di tag <source> di dalam <video>
        if (!mp4Url) {
            $$('video source').each((i, el) => {
                const src = $$(el).attr('src');
                if (src && src.includes('.mp4')) {
                    mp4Url = src;
                    return false;
                }
            });
        }
        
        // Cara 3: Cari pake regex (fallback)
        if (!mp4Url) {
            const regex = /https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/;
            const match = filedonRes.data.match(regex);
            if (match) mp4Url = match[0];
        }
        
        // 5. Ambil judul episode
        const title = $('h1.entry-title').text().trim() || 
                      $('.titleep').text().trim() || 
                      'Episode';
        
        console.log('[Stream] MP4 found:', !!mp4Url);
        
        return {
            success: true,
            title: title,
            player_url: filedonUrl,
            mp4_url: mp4Url,
            download_links: mp4Url ? [mp4Url] : []
        };
        
    } catch (error) {
        console.error('[Stream Error]', error.message);
        throw new Error(`Gagal ambil streaming: ${error.message}`);
    }
}

module.exports = (app) => {
    // Endpoint stream biasa (return JSON)
    app.get('/anime/samehadaku/stream', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyDev',
                error: 'Parameter "url" diperlukan (URL episode Samehadaku)'
            });
        }
        
        try {
            const result = await getStreamingUrl(url);
            
            if (!result.mp4_url && !result.player_url) {
                return res.status(404).json({
                    status: false,
                    creator: 'AxlyDev',
                    error: 'Link video tidak ditemukan'
                });
            }
            
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: {
                    title: result.title,
                    player_url: result.player_url,
                    mp4_url: result.mp4_url,
                    download_links: result.download_links
                }
            });
            
        } catch (error) {
            res.status(500).json({
                status: false,
                creator: 'AxlyDev',
                error: error.message
            });
        }
    });
    
    // Endpoint redirect langsung ke MP4 (buat streaming langsung)
    app.get('/anime/samehadaku/stream', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).send('Parameter "url" diperlukan');
        }
        
        try {
            const result = await getStreamingUrl(url);
            
            if (result.mp4_url) {
                // Redirect langsung ke file MP4
                return res.redirect(result.mp4_url);
            }
            
            if (result.player_url) {
                // Fallback ke player kalo ga ada MP4
                return res.redirect(result.player_url);
            }
            
            res.status(404).send('Link video tidak ditemukan');
            
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
    });
};
