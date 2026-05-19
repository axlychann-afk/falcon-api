const axios = require('axios');

module.exports = (app) => {
    app.get('/random/waifu', async (req, res) => {
        const { q = 'waifu' } = req.query;

        try {
            const response = await axios.get('https://api.harzrestapi.web.id/api/v2/anime/waifu', {
                params: {
                    q: q,
                    apikey: 'FREE'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const data = response.data;

            if (!data.data || !data.data.items || data.data.items.length === 0) {
                throw new Error('Tidak ada gambar ditemukan');
            }

            const item = data.data.items[0];

            const result = {
                id: item.id,
                url: item.url,
                width: item.width,
                height: item.height,
                byte_size: item.byteSize,
                dominant_color: item.dominantColor,
                is_nsfw: item.isNsfw,
                is_animated: item.isAnimated,
                source: item.source || null,
                artists: item.artists?.map(a => ({
                    name: a.name,
                    pixiv: a.pixiv,
                    twitter: a.twitter
                })) || [],
                tags: item.tags?.map(t => t.name) || [],
                favorites: item.favorites
            };

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengambil gambar waifu'
            });
        }
    });
};
