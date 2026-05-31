const axios = require('axios');
const cheerio = require('cheerio');

const API_DOMAIN = 'https://axlyapi.qzz.io';

// Header biar ga kena block
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

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
            console.log('[Stream] Fetching:', url);
            
            const { data } = await axios.get(url, { 
                headers: headers,
                timeout: 15000
            });
            
            const $ = cheerio.load(data);
            const sources = [];
            
            // CARI SEMUA LINK <a>
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                const name = $(el).text().trim();
                
                if (!href) return;
                
                // 1. GOFILE
                if (href.includes('gofile.io')) {
                    sources.push({
                        name: name || 'Gofile',
                        url: href
                    });
                }
                
                // 2. PIXELDRAIN
                else if (href.includes('pixeldrain.com')) {
                    const match = href.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
                    if (match) {
                        sources.push({
                            name: name || 'Pixeldrain',
                            url: `${API_DOMAIN}/dl/${match[1]}`
                        });
                    }
                }
                
                // 3. ACEFILE
                else if (href.includes('acefile.co')) {
                    sources.push({
                        name: name || 'Acefile',
                        url: href
                    });
                }
                
                // 4. FILEDON (PUCUK) - Google Drive diganti ini
                else if (href.includes('filedon.co')) {
                    let fileUrl = href;
                    // Konversi view ke embed
                    if (fileUrl.includes('/view/')) {
                        fileUrl = fileUrl.replace('/view/', '/embed/');
                    }
                    sources.push({
                        name: name || 'Pucuk',
                        url: fileUrl
                    });
                }
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
            
            if (uniqueSources.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: 'AxlyDev',
                    error: 'Tidak ada sumber video ditemukan (Gofile, Pixeldrain, Acefile, Filedon)'
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
