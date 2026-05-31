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
            
            // 2. Cari link Filedon
            let filedonUrl = null;
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
                throw new Error('Link Filedon tidak ditemukan');
            }
            
            // 3. Konversi ke embed URL
            let embedUrl = filedonUrl;
            if (embedUrl.includes('/view/')) {
                embedUrl = embedUrl.replace('/view/', '/embed/');
            }
            
            console.log('[Stream] Embed URL:', embedUrl);
            
            // 4. Ambil halaman embed Filedon
            const filedonRes = await axios.get(embedUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': 'https://v2.samehadaku.how/'
                },
                timeout: 15000
            });
            
            // 5. Cari link Pixeldrain
            const pixeldrainMatch = filedonRes.data.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
            
            if (!pixeldrainMatch) {
                throw new Error('Link Pixeldrain tidak ditemukan');
            }
            
            const fileId = pixeldrainMatch[1];
            const mp4Url = `https://pixeldrain.com/api/file/${fileId}`;
            
            console.log('[Stream] MP4 URL:', mp4Url);
            
            // 6. Ambil judul episode
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
