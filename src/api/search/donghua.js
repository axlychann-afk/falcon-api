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

        // Ambil semua link yang mengandung /donghua/ atau /movie/ atau /episode/
        $('a').each((i, el) => {
            let href = $(el).attr('href');
            let text = $(el).text().trim();

            // Skip link kosong atau navigasi
            if (!href || !text) return;
            if (href === '/' || href.includes('/bookmark/') || href.includes('/schedule/') || 
                href.includes('/privacy-policy/') || href.includes('/genres/') || href === '#') return;
            
            // Hanya ambil link yang mengandung pola donghua (bukan beranda/nav)
            const isValidLink = href.includes('/donghua/') || href.includes('/episode/') || 
                                href.includes('/movie/') || href.match(/\/[a-z0-9-]+\/$/);
            if (!isValidLink) return;
            
            // Skip judul navigasi
            if (text === 'Beranda' || text === 'Bookmark' || text === 'Schedule' || 
                text === 'Privacy Policy' || text.length < 5) return;
            
            // Bersihkan judul (hilangkan newline, spasi ganda)
            let judul = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            
            // Hapus duplikat berdasarkan href
            if (seen.has(href)) return;
            seen.add(href);

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

        return results;

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
