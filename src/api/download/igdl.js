const axios = require('axios');

module.exports = (app) => {
    app.get('/download/instagram', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL Instagram Reels/Post)'
            });
        }

        try {
            const response = await axios.get('https://api.harzrestapi.web.id/api/v2/ig', {
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

            if (!data.success || data.status !== 200) {
                throw new Error(data.message || 'Gagal mengambil data Instagram');
            }

            const result = {
                type: data.type || 'unknown',
                username: data.username || 'unknown',
                thumbnail: data.thumb || null
            };

            if (data.type === 'carousel') {
                result.media = [];
                if (data.images && Array.isArray(data.images)) {
                    result.media.push(...data.images.map(img => ({ type: 'image', url: img })));
                }
                if (data.videos && Array.isArray(data.videos)) {
                    result.media.push(...data.videos.map(vid => ({ type: 'video', url: vid })));
                }
                if (data.mp3 && Array.isArray(data.mp3) && data.mp3.length > 0) {
                    result.audio = data.mp3[0].url;
                }
            } else if (data.type === 'video' || data.type === 'reel') {
                result.video_url = data.videos?.[0] || data.result?.videos?.[0] || null;
                result.audio = data.mp3?.[0]?.url || null;
            } else if (data.type === 'image') {
                result.image_url = data.images?.[0] || null;
            }

            if (data.result) {
                if (data.result.videos && !result.video_url) result.video_url = data.result.videos[0];
                if (data.result.images && !result.image_url && !result.media) result.image_url = data.result.images[0];
                if (data.result.audio && !result.audio) result.audio = data.result.audio;
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
            });

        } catch (error) {
            console.error('Instagram download error:', error.message);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal download Instagram. Cek URL atau coba lagi nanti.'
            });
        }
    });
};
