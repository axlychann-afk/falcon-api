const axios = require('axios');

module.exports = (app) => {
    app.get('/download/instagram', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan'
            });
        }

        try {
            // API alternatif (porny.anyxem.com) tanpa apikey
            const response = await axios.get(`https://porny.anyxem.com/api/instagram?url=${encodeURIComponent(url)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const data = response.data;

            if (!data.status || !data.result) {
                throw new Error('Gagal mengambil data Instagram');
            }

            const result = data.result;

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    type: result.type || 'video',
                    username: result.username || 'unknown',
                    thumbnail: result.thumbnail || null,
                    video_url: result.video_url || result.videos?.[0] || null,
                    images: result.images || [],
                    audio: result.audio || null,
                    caption: result.caption || null
                }
            });

        } catch (error) {
            // Fallback: pake API harzrestapi
            try {
                const fallbackRes = await axios.get('https://api.harzrestapi.web.id/api/v2/ig', {
                    params: {
                        q: url,
                        apikey: 'FREE'
                    },
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                const fallbackData = fallbackRes.data;

                if (fallbackData.success && fallbackData.result) {
                    return res.json({
                        status: true,
                        creator: 'AxlyChann',
                        result: {
                            type: fallbackData.type || 'video',
                            username: fallbackData.username || 'unknown',
                            thumbnail: fallbackData.thumb || null,
                            video_url: fallbackData.videos?.[0] || fallbackData.result?.video_url,
                            images: fallbackData.images || [],
                            audio: fallbackData.mp3?.[0]?.url || null
                        }
                    });
                }
                throw new Error('Fallback API juga gagal');
                
            } catch (fallbackError) {
                res.status(500).json({
                    status: false,
                    error: 'Gagal download Instagram. Coba lagi nanti.'
                });
            }
        }
    });
};
