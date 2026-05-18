const axios = require('axios');
const cheerio = require('cheerio');

module.exports = (app) => {
    app.get('/search/gimage', async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "q" diperlukan'
            });
        }

        try {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=isch`;
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const images = [];

            $('img').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.startsWith('http') && images.length < 20) {
                    images.push(src);
                }
            });

            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: {
                    query: q,
                    images: images
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};
