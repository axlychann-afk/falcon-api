const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeDonghua(keyword) {
    try {
        const url = `https://donghub.vip/?s=${encodeURIComponent(keyword)}`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const results = [];

        // Regex untuk filter label sampah
        const labelSampah = /^(Completed|Movie|CompletedMovie|CompletedSub|ONA|Ongoing|OngoingSub|MovieCompleted|MovieCompletedSub|Sub)+/i;
        const duplikatPattern = /^(.+?)\1$/;
        const navBlacklist = ['/', '/bookmark/', '/schedule/', '/privacy-policy/'];
        const seen = new Set();

        // Ambil semua link
        $('a').each((i, el) => {
            let href = $(el).attr('href');
            let text = $(el).text().trim();

            if (!text || !href || navBlacklist.includes(href)) return;
            if (href.includes('/genres/') || text.length <= 3) return;
            if (seen.has(href)) return;
            seen.add(href);

            // Bersihkan judul
            let judul = labelSampah.test(text) ? text.replace(labelSampah, '').trim() : text;
            const duplikatMatch = judul.match(duplikatPattern);
            if (duplikatMatch) judul = duplikatMatch[1];
            if (!judul) return;

            // Tentukan tipe
            let tipe = 'Series';
            if (href.toLowerCase().includes('episode')) tipe = 'Episode';
            else if (href.toLowerCase().includes('movie')) tipe = 'Movie';

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
                error: 'Parameter "q" diperlukan (kata kunci pencarian)'
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
