const axios = require('axios');
const cheerio = require('cheerio');

// Domain API kamu
const API_DOMAIN = 'https://axlyapi.qzz.io';

// Fungsi untuk ambil direct MP4 dari berbagai source
async function getDirectMp4(url, type) {
    try {
        // 1. PIXELDRAIN -> langsung return API URL
        if (type === 'pixeldrain') {
            const match = url.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
            if (match) {
                return {
                    success: true,
                    mp4_url: `https://pixeldrain.com/api/file/${match[1]}`,
                    note: 'Link direct MP4 dari Pixeldrain'
                };
            }
        }
        
        // 2. FILEDON -> cari MP4 di dalam embed
        if (type === 'filedon') {
            let embedUrl = url;
            if (embedUrl.includes('/view/')) {
                embedUrl = embedUrl.replace('/view/', '/embed/');
            }
            
            const { data } = await axios.get(embedUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://v2.samehadaku.how/' }
            });
            
            // Cari MP4 URL di halaman embed
            const match = data.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
            if (match) {
                return {
                    success: true,
                    mp4_url: match[0],
                    note: 'Link direct MP4 dari Filedon'
                };
            }
        }
        
        // 3. WIBUFILE -> langsung return .mp4
        if (type === 'wibufile' && url.includes('.mp4')) {
            return {
                success: true,
                mp4_url: url,
                note: 'Link direct MP4 dari Wibufile'
            };
        }
        
        // 4. BLOGSPOT -> langsung return
        if (type === 'blogspot') {
            return {
                success: true,
                mp4_url: url,
                note: 'Link direct MP4 dari Blogspot'
            };
        }
        
        // 5. MEGA -> return embed (Mega ga bisa direct)
        if (type === 'mega') {
            return {
                success: true,
                mp4_url: url,
                note: 'Link embed Mega (buka di browser)'
            };
        }
        
        // 6. GOOGLE DRIVE -> konversi ke direct download
        if (type === 'gdrive') {
            const fileMatch = url.match(/\/d\/([^\/]+)/);
            if (fileMatch) {
                return {
                    success: true,
                    mp4_url: `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`,
                    note: 'Link direct download dari Google Drive'
                };
            }
        }
        
        // 7. GOFILE -> perlu ambil direct link
        if (type === 'gofile') {
            const match = url.match(/gofile\.io\/d\/([a-zA-Z0-9]+)/);
            if (match) {
                const fileId = match[1];
                const apiUrl = `https://api.gofile.io/contents/${fileId}`;
                const { data } = await axios.get(apiUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                if (data.status === 'ok' && data.data.contents) {
                    const firstFile = Object.values(data.data.contents)[0];
                    if (firstFile.link) {
                        return {
                            success: true,
                            mp4_url: firstFile.link,
                            note: 'Link direct MP4 dari Gofile'
                        };
                    }
                }
            }
        }
        
        // 8. ACEFILE -> perlu ambil direct link
        if (type === 'acefile') {
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const match = data.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
            if (match) {
                return {
                    success: true,
                    mp4_url: match[0],
                    note: 'Link direct MP4 dari Acefile'
                };
            }
        }
        
        return { success: false, error: 'Tidak bisa mendapatkan direct MP4' };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

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
        
        // 1. Pixeldrain
        $('a[href*="pixeldrain.com/u/"]').each(async (i, el) => {
            const href = $(el).attr('href');
            sources.push({ type: 'pixeldrain', url: href, name: 'Pixeldrain' });
        });
        
        // 2. Filedon
        $('a[href*="filedon.co"]').each((i, el) => {
            let href = $(el).attr('href');
            sources.push({ type: 'filedon', url: href, name: 'Filedon' });
        });
        
        // 3. Wibufile
        $('a[href*="wibufile.com"]').each((i, el) => {
            const href = $(el).attr('href');
            sources.push({ type: 'wibufile', url: href, name: 'Wibufile' });
        });
        
        // 4. Blogspot
        $('a[href*="blogger.com/video"]').each((i, el) => {
            const href = $(el).attr('href');
            sources.push({ type: 'blogspot', url: href, name: 'Blogspot' });
        });
        
        // 5. Mega
        $('a[href*="mega.nz"]').each((i, el) => {
            let href = $(el).attr('href');
            if (href.includes('#!')) {
                href = href.replace('#!', '/embed');
            }
            sources.push({ type: 'mega', url: href, name: 'Mega' });
        });
        
        // 6. Google Drive
        $('a[href*="drive.google.com"]').each((i, el) => {
            const href = $(el).attr('href');
            sources.push({ type: 'gdrive', url: href, name: 'Google Drive' });
        });
        
        // 7. Gofile
        $('a[href*="gofile.io/d/"]').each((i, el) => {
            const href = $(el).attr('href');
            sources.push({ type: 'gofile', url: href, name: 'Gofile' });
        });
        
        // 8. Acefile
        $('a[href*="acefile.co/f/"]').each((i, el) => {
            const href = $(el).attr('href');
            sources.push({ type: 'acefile', url: href, name: 'Acefile' });
        });
        
        // Hapus duplikat
        const uniqueSources = [];
        const seenUrls = new Set();
        for (const source of sources) {
            if (!seenUrls.has(source.url)) {
                seenUrls.add(source.url);
                uniqueSources.push(source);
            }
        }
        
        // Ambil direct MP4 untuk setiap sumber (dijalankan paralel)
        const directResults = await Promise.all(
            uniqueSources.map(async (source) => {
                const result = await getDirectMp4(source.url, source.type);
                if (result.success) {
                    return {
                        name: source.name,
                        mp4_url: result.mp4_url,
                        note: result.note
                    };
                }
                return null;
            })
        );
        
        const validSources = directResults.filter(r => r !== null);
        
        return {
            success: true,
            total: validSources.length,
            sources: validSources
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
                    error: 'Tidak ada sumber video yang bisa diambil'
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
