const axios = require('axios');
const cheerio = require('cheerio');

// Domain API kamu
const API_DOMAIN = 'https://axlyapi.qzz.io';

async function getStreamingUrl(episodeUrl) {
    try {
        const { data } = await axios.get(episodeUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const sources = [];
        
        // ==================== SEMUA SUMBER VIDEO ====================
        
        // 1. Pixeldrain (prioritas utama)
        $('a[href*="pixeldrain.com/u/"]').each((i, el) => {
            const href = $(el).attr('href');
            const match = href.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
            if (match) {
                sources.push({
                    name: 'Pixeldrain',
                    url: `${API_DOMAIN}/dl/${match[1]}`
                });
            }
        });
        
        // 2. Filedon / Pucuk
        $('a[href*="filedon.co"]').each((i, el) => {
            let href = $(el).attr('href');
            let name = $(el).text().trim() || 'Pucuk';
            
            // Konversi view ke embed
            if (href.includes('/view/')) {
                href = href.replace('/view/', '/embed/');
            }
            
            // Deteksi kualitas
            if (href.includes('FULLHD')) name = 'Pucuk 1080p';
            else if (href.includes('MP4HD')) name = 'Pucuk 720p';
            
            sources.push({ name, url: href });
        });
        
        // 3. Wibufile
        $('a[href*="wibufile.com"]').each((i, el) => {
            const href = $(el).attr('href');
            let name = $(el).text().trim() || 'Wibufile';
            
            if (href.includes('FULLHD')) name = 'Wibufile 1080p';
            else if (href.includes('MP4HD')) name = 'Wibufile 720p';
            else if (href.includes('.mp4')) name = 'Wibufile 480p';
            
            sources.push({ name, url: href });
        });
        
        // 4. Blogspot
        $('a[href*="blogger.com/video"]').each((i, el) => {
            const href = $(el).attr('href');
            sources.push({
                name: $(el).text().trim() || 'Blogspot',
                url: href
            });
        });
        
        // 5. Mega.nz
        $('a[href*="mega.nz"]').each((i, el) => {
            let href = $(el).attr('href');
            let name = $(el).text().trim() || 'Mega';
            
            // Konversi ke embed
            if (href.includes('#!')) {
                href = href.replace('#!', '/embed');
            }
            
            if (href.includes('FULLHD')) name = 'Mega 1080p';
            else if (href.includes('MP4HD')) name = 'Mega 720p';
            
            sources.push({ name, url: href });
        });
        
        // 6. Google Drive
        $('a[href*="drive.google.com"]').each((i, el) => {
            const href = $(el).attr('href');
            let name = $(el).text().trim() || 'Google Drive';
            
            // Konversi ke preview
            const fileMatch = href.match(/\/d\/([^\/]+)/);
            if (fileMatch) {
                sources.push({
                    name,
                    url: `https://drive.google.com/file/d/${fileMatch[1]}/preview`
                });
            } else {
                sources.push({ name, url: href });
            }
        });
        
        // 7. Krakenfiles (opsional, tapi butuh POST request)
        // Skip dulu karena ribet
        
        // 8. Iframe (fallback untuk embed lainnya)
        if (sources.length === 0) {
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && (src.includes('embed') || src.includes('player'))) {
                    sources.push({
                        name: 'Embed Player',
                        url: src
                    });
                }
            });
        }
        
        // Hapus duplikat
        const uniqueSources = [];
        const seenUrls = new Set();
        for (const source of sources) {
            if (!seenUrls.has(source.url)) {
                seenUrls.add(source.url);
                uniqueSources.push(source);
            }
        }
        
        return {
            success: true,
            total: uniqueSources.length,
            sources: uniqueSources
        };
        
    } catch (error) {
        throw new Error(`Gagal ambil streaming: ${error.message}`);
    }
}

module.exports = (app) => {
    app.get('/anime/samehadaku/stream', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyDev',
                error: 'Parameter "url" diperlukan'
            });
        }
        
        try {
            const result = await getStreamingUrl(url);
            
            if (result.sources.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: 'AxlyDev',
                    error: 'Tidak ada sumber video ditemukan'
                });
            }
            
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: result
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
