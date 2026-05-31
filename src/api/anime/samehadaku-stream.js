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
            
            console.log('[Stream] Filedon URL:', filedonUrl);
            
            // 3. Konversi ke embed URL
            let embedUrl = filedonUrl;
            if (filedonUrl.includes('/view/')) {
                embedUrl = filedonUrl.replace('/view/', '/embed/');
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
            
            // 5. Ekstrak MP4 URL
            const $$ = cheerio.load(filedonRes.data);
            let mp4Url = null;
            
            $$('video').each((i, el) => {
                const src = $$(el).attr('src');
                if (src && src.includes('.mp4')) {
                    mp4Url = src;
                    return false;
                }
            });
            
            if (!mp4Url) {
                $$('video source').each((i, el) => {
                    const src = $$(el).attr('src');
                    if (src && src.includes('.mp4')) {
                        mp4Url = src;
                        return false;
                    }
                });
            }
            
            if (!mp4Url) {
                const regex = /https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/;
                const match = filedonRes.data.match(regex);
                if (match) mp4Url = match[0];
            }
            
            if (!mp4Url) {
                throw new Error('MP4 URL tidak ditemukan');
            }
            
            console.log('[Stream] MP4 URL:', mp4Url);
            
            const title = $('h1.entry-title').text().trim() || 'Episode';
            
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: {
                    title: title,
                    mp4_url: mp4Url
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
