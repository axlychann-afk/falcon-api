const axios = require('axios');

async function ytdownDl(url) {
    const response = await axios.post('https://app.ytdown.to/proxy.php', 
        new URLSearchParams({ url: url }), 
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
            },
            timeout: 30000
        }
    );

    if (!response.data || response.data.api?.status !== 'ok') {
        throw new Error('Gagal mengambil data dari ytdown');
    }

    const apiData = response.data.api;
    const videos = [];
    const audios = [];

    if (Array.isArray(apiData.mediaItems)) {
        apiData.mediaItems.forEach(item => {
            if (item.type === 'Video') {
                videos.push({
                    resolution: item.mediaRes || 'unknown',
                    quality: item.mediaQuality || '-',
                    size: item.mediaFileSize || '-',
                    url: item.mediaUrl
                });
            } else if (item.type === 'Audio') {
                audios.push({
                    quality: item.mediaQuality || '-',
                    size: item.mediaFileSize || '-',
                    url: item.mediaUrl
                });
            }
        });
    }

    return {
        title: apiData.title || '-',
        thumbnail: apiData.imagePreviewUrl || '-',
        duration: apiData.mediaItems?.[0]?.mediaDuration || '-',
        channel: apiData.userInfo?.name || '-',
        videos: videos,
        audios: audios
    };
}

module.exports = (app) => {
    // Endpoint untuk video (ytmp4)
    app.get('/download/ytmp4', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, error: 'Parameter "url" diperlukan' });

        try {
            const result = await ytdownDl(url);
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    title: result.title,
                    thumbnail: result.thumbnail,
                    duration: result.duration,
                    videos: result.videos
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });

    // Endpoint untuk audio (ytmp3)
    app.get('/download/ytmp3', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, error: 'Parameter "url" diperlukan' });

        try {
            const result = await ytdownDl(url);
            // Ambil audio kualitas terbaik (biasanya 320k atau 128k)
            const bestAudio = result.audios.find(a => a.quality === '320k') || result.audios[0];
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    title: result.title,
                    thumbnail: result.thumbnail,
                    duration: result.duration,
                    audio: bestAudio || null,
                    all_audios: result.audios
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
