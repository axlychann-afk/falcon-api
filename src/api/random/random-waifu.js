const axios = require('axios');

module.exports = (app) => {
    app.get('/random/waifu', async (req, res) => {
        let { q = 'waifu' } = req.query;

        // List tag yang didukung API
        const validTags = ['waifu', 'neko', 'maid', 'uniform', 'kemonomimi', 'genshin', 'honkai'];
        
        if (!validTags.includes(q.toLowerCase())) {
            q = 'waifu';
        }

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

            // Cek apakah ada items di response
            let items = [];
            if (data.data && data.data.items) {
                items = data.data.items;
            } else if (data.items) {
                items = data.items;
            } else if (data.result && data.result.items) {
                items = data.result.items;
            }

            if (!items || items.length === 0) {
                throw new Error('Tidak ada gambar ditemukan untuk tag: ' + q);
            }

            const item = items[0];

            const result = {
                id: item.id,
                url: item.url,
                width: item.width,
                height: item.height,
                byte_size: item.byteSize,
                dominant_color: item.dominantColor,
                is_nsfw: item.isNsfw || false,
                is_animated: item.isAnimated || false,
                source: item.source || null,
                artists: item.artists?.map(a => ({
                    name: a.name,
                    pixiv: a.pixiv,
                    twitter: a.twitter
                })) || [],
                tags: item.tags?.map(t => t.name || t) || [],
                favorites: item.favorites || 0
            };

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
            });

        } catch (error) {
            console.error(error.message);
            
            // Fallback: pake API waifu.im langsung
            try {
                const fallbackRes = await axios.get(`https://api.waifu.im/random/?selected_tags=${q}`, {
                    timeout: 10000
                });
                
                if (fallbackRes.data?.images?.length > 0) {
                    const img = fallbackRes.data.images[0];
                    return res.json({
                        status: true,
                        creator: 'AxlyChann',
                        result: {
                            id: img.id,
                            url: img.url,
                            width: img.width,
                            height: img.height,
                            byte_size: img.byte_size,
                            dominant_color: img.dominant_color,
                            is_nsfw: false,
                            is_animated: false,
                            tags: img.tags?.map(t => t.name) || [],
                            source: img.source || null
                        }
                    });
                }
                throw new Error('Fallback juga gagal');
            } catch (fallback) {
                res.status(500).json({
                    status: false,
                    error: 'Gagal mengambil gambar waifu. Coba tag: waifu, neko, maid'
                });
            }
        }
    });
};
