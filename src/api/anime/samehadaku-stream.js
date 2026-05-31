const axios = require('axios');
const cheerio = require('cheerio');

async function getDirectMp4(episodeUrl) {
    try {
        console.log('[Stream] Episode URL:', episodeUrl);
        
        // 1. Ambil halaman episode Samehadaku
        const { data } = await axios.get(episodeUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        let filedonUrl = null;
        
        // 2. Cari link filedon dari iframe
        $('iframe[src*="filedon.co"]').each((i, el) => {
            filedonUrl = $(el).attr('src');
            return false;
        });
        
        // 3. Kalo ga ada di iframe, cari di link
        if (!filedonUrl) {
            $('a[href*="filedon.co"]').each((i, el) => {
                filedonUrl = $(el).attr('href');
                return false;
            });
        }
        
        if (!filedonUrl) {
            throw new Error('Link filedon tidak ditemukan');
        }
        
        console.log('[Stream] Raw filedon URL:', filedonUrl);
        
        // 4. KONVERSI KE EMBED URL (kunci utama!)
        let embedUrl = filedonUrl;
        if (filedonUrl.includes('/view/')) {
            embedUrl = filedonUrl.replace('/view/', '/embed/');
        }
        
        console.log('[Stream] Embed URL:', embedUrl);
        
        // 5. Ambil halaman embed
        const filedonRes = await axios.get(embedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://v2.samehadaku.how/'
            },
            timeout: 15000
        });
        
        // 6. Ekstrak MP4 URL dari tag <video>
        const $$ = cheerio.load(filedonRes.data);
        let mp4Url = null;
        
        // Cari tag video
        $$('video').each((i, el) => {
            const src = $$(el).attr('src');
            if (src && src.includes('.mp4')) {
                mp4Url = src;
                return false;
            }
        });
        
        // Cari tag source
        if (!mp4Url) {
            $$('video source').each((i, el) => {
                const src = $$(el).attr('src');
                if (src && src.includes('.mp4')) {
                    mp4Url = src;
                    return false;
                }
            });
        }
        
        // Regex fallback
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
        
        return {
            success: true,
            title: title,
            mp4_url: mp4Url
        };
        
    } catch (error) {
        console.error('[Stream Error]', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = (app) => {
    
    // Endpoint: /stream?url=xxx -> return JSON
    // Endpoint: /watch?url=xxx -> redirect ke MP4
    // Endpoint: /stream?url=xxx&redirect=true -> redirect ke MP4
    
    app.get('/stream', async (req, res) => {
        const { url, redirect } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyDev',
                error: 'Parameter "url" diperlukan'
            });
        }
        
        const result = await getDirectMp4(url);
        
        if (!result.success) {
            if (redirect === 'true') {
                return res.status(404).send('Video tidak ditemukan');
            }
            return res.status(404).json({
                status: false,
                creator: 'AxlyDev',
                error: result.error
            });
        }
        
        // Jika redirect=true, langsung redirect ke MP4
        if (redirect === 'true') {
            return res.redirect(result.mp4_url);
        }
        
        // Default: return JSON
        res.json({
            status: true,
            creator: 'AxlyDev',
            result: {
                title: result.title,
                url: result.mp4_url
            }
        });
    });
    
    // Endpoint watch (lebih pendek, selalu redirect)
    app.get('/watch', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).send('Parameter "url" diperlukan');
        }
        
        const result = await getDirectMp4(url);
        
        if (!result.success || !result.mp4_url) {
            return res.status(404).send('Video tidak ditemukan');
        }
        
        res.redirect(result.mp4_url);
    });
};
