const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDonghua(keyword) {
    try {
        const url = `https://donghub.vip/?s=${encodeURIComponent(keyword)}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const results = [];
        const seen = new Set();

        // Filter: cuma ambil link yang mengandung pola donghua
        $('a').each((i, el) => {
            let href = $(el).attr('href');
            let text = $(el).text().trim();

            // Skip link navigasi, bookmark, schedule, privacy, genre, dll
            if (!href || !text) return;
            if (href === '/' || href.includes('/bookmark/') || href.includes('/schedule/') || 
                href.includes('/privacy-policy/') || href.includes('/genres/') || href === '#') return;
            
            // Skip link yang bukan donghua (cek apakah href mengandung pattern donghua)
            if (!href.includes('/donghua/') && !href.includes('/episode/') && !href.includes('/movie/') && 
                !href.match(/\/([a-z0-9-]+)\/$/)) return;
            
            // Bersihkan judul dari newline dan spasi berlebih
            let judul = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            
            // Skip judul pendek atau navigasi
            if (judul.length < 3) return;
            if (judul === 'Beranda' || judul === 'Bookmark' || judul === 'Schedule' || judul === 'Privacy Policy') return;
            
            // Hapus duplikat
            const key = href.split('/')[2] || href;
            if (seen.has(key)) return;
            seen.add(key);

            // Tentukan tipe
            let tipe = 'Series';
            if (href.includes('/episode/')) tipe = 'Episode';
            else if (href.includes('/movie/')) tipe = 'Movie';

            results.push({
                title: judul,
                link: href,
                type: tipe
            });
        });

        // Filter juga yang judulnya nyambung (ambil dari section result)
        // Alternatif: ambil dari selector `.result-item` atau `.bs-item` kalau ada
        
        // Hapus duplikat judul (ambil yang pertama muncul)
        const uniqueResults = [];
        const seenTitles = new Set();
        for (const item of results) {
            const titleKey = item.title.split(' ')[0].toLowerCase();
            if (!seenTitles.has(titleKey) && !item.title.includes('Episode')) {
                seenTitles.add(titleKey);
                uniqueResults.push(item);
            } else if (item.type === 'Episode') {
                uniqueResults.push(item);
            }
        }

        return uniqueResults.slice(0, 30);

    } catch (error) {
        throw new Error(error.message);
    }
}

module.exports = (app) => {
    app.get('/search/donghua', async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "q" diperlukan'
            });
        }

        try {
            const results = await scrapeDonghua(q);
            
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    query: q,
                    total: results.length,
                    data: results
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mencari donghua'
            });
        }
    });
};
