const axios = require('axios');
const cheerio = require('cheerio');

const API_DOMAIN = 'https://axlyapi.qzz.io';

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
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            const $ = cheerio.load(data);
            const sources = [];
            
            // 1. Pixeldrain
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
            
            // 2. Filedon
            $('a[href*="filedon.co"]').each((i, el) => {
                let href = $(el).attr('href');
                let name = $(el).text().trim() || 'Pucuk';
                if (href.includes('/view/')) {
                    href = href.replace('/view/', '/embed/');
                }
                sources.push({ name, url: href });
            });
            
            // 3. Wibufile
            $('a[href*="wibufile.com"]').each((i, el) => {
                sources.push({
                    name: $(el).text().trim() || 'Wibufile',
                    url: $(el).attr('href')
                });
            });
            
            // 4. Blogspot
            $('a[href*="blogger.com/video"]').each((i, el) => {
                sources.push({
                    name: $(el).text().trim() || 'Blogspot',
                    url: $(el).attr('href')
                });
            });
            
            // 5. Mega
            $('a[href*="mega.nz"]').each((i, el) => {
                let href = $(el).attr('href');
                if (href.includes('#!')) {
                    href = href.replace('#!', '/embed');
                }
                sources.push({
                    name: $(el).text().trim() || 'Mega',
                    url: href
                });
            });
            
            // 6. Google Drive
            $('a[href*="drive.google.com"]').each((i, el) => {
                let href = $(el).attr('href');
                const match = href.match(/\/d\/([^\/]+)/);
                if (match) {
                    sources.push({
                        name: $(el).text().trim() || 'Google Drive',
                        url: `https://drive.google.com/file/d/${match[1]}/preview`
                    });
                } else {
                    sources.push({
                        name: $(el).text().trim() || 'Google Drive',
                        url: href
                    });
                }
            });
            
            // 7. Krakenfiles
            $('a[href*="krakenfiles.com/view/"]').each((i, el) => {
                sources.push({
                    name: 'Krakenfiles',
                    url: $(el).attr('href')
                });
            });
            
            // 8. Gofile
            $('a[href*="gofile.io/d/"]').each((i, el) => {
                sources.push({
                    name: 'Gofile',
                    url: $(el).attr('href')
                });
            });
            
            // 9. Acefile (BARU!)
            $('a[href*="acefile.co/f/"]').each((i, el) => {
                sources.push({
                    name: 'Acefile',
                    url: $(el).attr('href')
                });
            });
            
            // 10. Mediafire
            $('a[href*="mediafire.com"]').each((i, el) => {
                sources.push({
                    name: 'Mediafire',
                    url: $(el).attr('href')
                });
            });
            
            // 11. Uptobox
            $('a[href*="uptobox.com"]').each((i, el) => {
                sources.push({
                    name: 'Uptobox',
                    url: $(el).attr('href')
                });
            });
            
            // 12. Iframe fallback
            if (sources.length === 0) {
                $('iframe').each((i, el) => {
                    const src = $(el).attr('src');
                    if (src) {
                        sources.push({ name: 'Embed Player', url: src });
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
            
            if (uniqueSources.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: 'AxlyDev',
                    error: 'Tidak ada sumber video ditemukan'
                });
            }
            
            res.json({
                status: true,
                creator: 'AxlyDev',
                total: uniqueSources.length,
                sources: uniqueSources
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
