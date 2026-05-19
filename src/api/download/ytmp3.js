const axios = require('axios');

module.exports = (app) => {
    app.get('/download/ytmp3', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL YouTube)'
            });
        }

        try {
            const response = await axios.get('https://api.harzrestapi.web.id/api/v2/ytmp3', {
                params: {
                    q: url,
                    apikey: 'FREE'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });

            const data = response.data;

            if (!data.success && data.status !== 200) {
                throw new Error(data.message || 'Gagal mengambil data YouTube');
            }

            // Format response
            const result = {
                title: data.title || 'Unknown',
                author: data.author || 'Unknown',
                thumbnail: data.thumbnail || null,
                duration: data.duration || 0,
                audio: {
                    quality: data.audio?.quality || '128K',
                    size: data.audio?.size || 'Unknown',
                    url: data.audio?.url || null
                },
                videos: []
            };

            // Ambil semua video dari all_medias
            if (data.all_medias && Array.isArray(data.all_medias)) {
                data.all_medias.forEach(media => {
                    if (media.type === 'video') {
                        result.videos.push({
                            quality: media.quality,
                            size: media.size,
                            url: media.url
                        });
                    }
                });
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal download YouTube'
            });
        }
    });
};
