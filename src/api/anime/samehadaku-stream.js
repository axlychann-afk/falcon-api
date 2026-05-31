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
            
            // 2. LANGSUNG cari link Krakenfiles (tanpa Filedon)
            let krakenUrl = null;
            
            $('a[href*="krakenfiles.com/view/"]').each((i, el) => {
                krakenUrl = $(el).attr('href');
                return false;
            });
            
            if (!krakenUrl) {
                throw new Error('Link Krakenfiles tidak ditemukan di halaman episode');
            }
            
            console.log('[Stream] Kraken URL:', krakenUrl);
            
            // 3. Ambil halaman Krakenfiles
            const krakenRes = await axios.get(krakenUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                timeout: 15000
            });
            
            // 4. Ekstrak MP4 URL
            const $$ = cheerio.load(krakenRes.data);
            let mp4Url = null;
            
            $$('source[type="video/mp4"]').each((i, el) => {
                mp4Url = $$(el).attr('src');
                return false;
            });
            
            if (!mp4Url) {
                $$('video').each((i, el) => {
                    mp4Url = $$(el).attr('src');
                    return false;
                });
            }
            
            if (!mp4Url) {
                throw new Error('MP4 URL tidak ditemukan di Krakenfiles');
            }
            
            console.log('[Stream] MP4 URL ditemukan!');
            
            // 5. Ambil judul episode
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
