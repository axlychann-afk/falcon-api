const axios = require('axios');
const cheerio = require('cheerio');

async function searchSeries(keyword) {
    const url = `https://donghub.vip/?s=${encodeURIComponent(keyword)}`;
    const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const $ = cheerio.load(response.data);
    const results = [];
    const seen = new Set();

    $('.post-item, .bs-item, article').each((i, el) => {
        const linkEl = $(el).find('a').first();
        const href = linkEl.attr('href');
        let title = linkEl.text().trim() || $(el).find('h3, .title').text().trim();
        const imgEl = $(el).find('img').first();
        let thumbnail = imgEl.attr('src') || imgEl.attr('data-src') || null;

        if (!href || !title) return;
        if (href.includes('/bookmark/') || href.includes('/schedule/') || href === '/') return;

        title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (title.length < 3 || title === 'Beranda' || title === 'Bookmark') return;
        if (seen.has(href)) return;
        seen.add(href);

        let tipe = 'Series';
        if (href.includes('/episode/')) tipe = 'Episode';
        else if (href.includes('/movie/')) tipe = 'Movie';

        if (!thumbnail) {
            thumbnail = `https://via.placeholder.com/200x300?text=${encodeURIComponent(title.slice(0, 20))}`;
        }

        results.push({ title, link: href, type: tipe, thumbnail });
    });

    return results.slice(0, 20);
}

async function searchEpisode(keyword) {
    // Cari series dulu
    const seriesName = keyword.replace(/episode\s*\d+/i, '').trim();
    const series = await searchSeries(seriesName);
    
    if (series.length === 0) return [];

    // Ambil episode dari series pertama
    const seriesUrl = series[0].link;
    const response = await axios.get(seriesUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const $ = cheerio.load(response.data);
    const episodes = [];

    $('a[href*="/episode/"]').each((i, el) => {
        const href = $(el).attr('href');
        let title = $(el).text().trim();
        if (!href) return;
        
        title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Filter sesuai nomor episode jika ada
        const episodeMatch = keyword.match(/episode\s*(\d+)/i);
        if (episodeMatch) {
            const targetEp = episodeMatch[1];
            if (!href.includes(`episode-${targetEp}`) && !title.includes(`Episode ${targetEp}`)) {
                return;
            }
        }
        
        episodes.push({
            title: title || `Episode ${href.match(/episode-(\d+)/i)?.[1] || '?'}`,
            link: href,
            type: 'Episode',
            thumbnail: series[0].thumbnail
        });
    });

    return episodes.slice(0, 10);
}

module.exports = (app) => {
    app.get('/search/donghua', async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ status: false, error: 'Parameter "q" diperlukan' });
        }

        try {
            let results = [];
            const isEpisodeSearch = q.toLowerCase().includes('episode');

            if (isEpisodeSearch) {
                results = await searchEpisode(q);
            } else {
                results = await searchSeries(q);
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    query: q,
                    type: isEpisodeSearch ? 'episode' : 'series',
                    total: results.length,
                    data: results
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message || 'Gagal mencari' });
        }
    });
};
