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
            
            // 2. LANGSUNG cari link Pixeldrain
            let pixeldrainId = null;
            
            $('a[href*="pixeldrain.com/u/"]').each((i, el) => {
                const href = $(el).attr('href');
                const match = href.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
                if (match) {
                    pixeldrainId = match[1];
                    return false;
                }
            });
            
            if (!pixeldrainId) {
                throw new Error('Link Pixeldrain tidak ditemukan di halaman episode');
            }
            
            // 3. Bangun MP4 URL
            const mp4Url = `https://pixeldrain.com/api/file/${pixeldrainId}`;
            
            // 4. Ambil judul episode
            const title = $('h1.entry-title').text().trim() || 'Episode';
            
            console.log('[Stream] MP4 URL:', mp4Url);
            
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
