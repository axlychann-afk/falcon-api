const axios = require('axios');
const cheerio = require('cheerio');

module.exports = (app) => {
    
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
            console.log('[Stream] Episode URL:', url);
            
            // 1. Ambil halaman episode Samehadaku
            const { data } = await axios.get(url, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });
            
            const $ = cheerio.load(data);
            let filedonUrl = null;
            
            // 2. Cari link filedon
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
            
            // 3. Konversi ke embed URL (filedon.co/embed/xxx)
            let embedUrl = filedonUrl;
            if (embedUrl.includes('/view/')) {
                embedUrl = embedUrl.replace('/view/', '/embed/');
            }
            
            console.log('[Stream] Embed URL:', embedUrl);
            
            // 4. Ambil halaman embed filedon
            const filedonRes = await axios.get(embedUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://v2.samehadaku.how/'
                },
                timeout: 15000
            });
            
            // 5. Cari link krakenfiles atau MP4 langsung
            let mp4Url = null;
            let krakenUrl = null;
            
            // Cari link krakenfiles
            const krakenMatch = filedonRes.data.match(/krakenfiles\.com\/view\/[a-zA-Z0-9]+/);
            if (krakenMatch) {
                krakenUrl = `https://${krakenMatch[0]}`;
                console.log('[Stream] Kraken URL:', krakenUrl);
                
                // Ambil halaman krakenfiles
                const krakenRes = await axios.get(krakenUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 15000
                });
                
                // Ekstrak MP4 dari krakenfiles
                const $$ = cheerio.load(krakenRes.data);
                $$('source').each((i, el) => {
                    const src = $$(el).attr('src');
                    if (src && src.includes('.mp4')) {
                        mp4Url = src;
                        return false;
                    }
                });
            }
            
            // 6. Kalo ga nemu kraken, cari MP4 langsung
            if (!mp4Url) {
                const mp4Match = filedonRes.data.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
                if (mp4Match) mp4Url = mp4Match[0];
            }
            
            // 7. Ambil judul episode
            const title = $('h1.entry-title').text().trim() || 'Episode';
            
            if (mp4Url) {
                console.log('[Stream] MP4 URL ditemukan!');
                return res.json({
                    status: true,
                    creator: 'AxlyDev',
                    result: {
                        title: title,
                        mp4_url: mp4Url
                    }
                });
            }
            
            // 8. Fallback: kasih player_url
            return res.json({
                status: true,
                creator: 'AxlyDev',
                result: {
                    title: title,
                    player_url: embedUrl,
                    note: 'MP4 tidak bisa diambil langsung, silakan buka link player'
                }
            });
            
        } catch (error) {
            console.error('[Stream Error]', error.message);
            res.status(500).json({
                status: false,
                creator: 'AxlyDev',
                error: error.message
            });
        }
    });
};
