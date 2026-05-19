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
            const response = await axios.get('https://api.harzrestapi.web.id/api/v2/ig', {
                params: {
                    q: url,
                    apikey: 'FREE'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const data = response.data;

            if (!data.success || data.status !== 200) {
                throw new Error(data.message || 'Gagal ambil data');
            }

            const result = {
                type: data.type || 'unknown',
                username: data.username || '-',
                thumbnail: data.thumb || null
            };

            // Handle carousel (multiple images/videos)
            if (data.type === 'carousel') {
                result.media = [];
                
                // Ambil gambar
                if (data.images && Array.isArray(data.images)) {
                    data.images.forEach(img => {
                        result.media.push({ type: 'image', url: img });
                    });
                }
                
                // Ambil video
                if (data.videos && Array.isArray(data.videos)) {
                    data.videos.forEach(vid => {
                        result.media.push({ type: 'video', url: vid });
                    });
                }
                
                // Ambil audio
                if (data.mp3 && Array.isArray(data.mp3) && data.mp3.length > 0) {
                    result.audio = data.mp3[0].url;
                }
            } 
            // Handle single video
            else if (data.type === 'video' || data.type === 'reel') {
                result.video_url = data.videos?.[0] || null;
                result.audio = data.mp3?.[0]?.url || null;
            }
            // Handle single image
            else if (data.type === 'image') {
                result.image_url = data.images?.[0] || null;
            }

            // Kirim response
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: result
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal download Instagram'
            });
        }
    });
};
