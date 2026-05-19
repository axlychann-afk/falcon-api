const axios = require('axios');

async function ytdownDl(url) {
    try {
        const response = await axios.post('https://app.ytdown.to/proxy.php', 
            new URLSearchParams({ url: url }), 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
                },
                timeout: 30000
            }
        );

        if (!response.data || response.data.api?.status !== 'ok') {
            throw new Error('Gagal mengambil data dari ytdown');
        }

        const apiData = response.data.api;
        return {
            status: true,
            title: apiData.title || '-',
            id: apiData.id || '-',
            thumbnail: apiData.imagePreviewUrl || '-',
            duration: apiData.mediaItems?.[0]?.mediaDuration || '-',
            channel: apiData.userInfo?.name || '-',
            videos: (apiData.mediaItems || [])
                .filter(item => item.type === 'Video')
                .map(item => ({
                    resolution: item.mediaRes || 'unknown',
                    quality: item.mediaQuality || '-',
                    size: item.mediaFileSize || '-',
                    ext: item.mediaExtension || 'MP4',
                    url: item.mediaUrl
                })),
            audios: (apiData.mediaItems || [])
                .filter(item => item.type === 'Audio')
                .map(item => ({
                    quality: item.mediaQuality || '-',
                    size: item.mediaFileSize || '-',
                    ext: item.mediaExtension || 'M4A',
                    url: item.mediaUrl
                }))
        };
    } catch (e) {
        return { status: false, error: e.message };
    }
}

module.exports = (app) => {
    // Endpoint untuk download video (ytmp4)
    app.get('/download/ytmp4', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL YouTube)'
            });
        }

        try {
            const result = await ytdownDl(url);
            if (!result.status) throw new Error(result.error);

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    title: result.title,
                    channel: result.channel,
                    thumbnail: result.thumbnail,
                    duration: result.duration,
                    videos: result.videos,
                    audios: result.audios
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal download YouTube'
            });
        }
    });

    // Endpoint khusus ambil audio MP3 saja (ytmp3)
    app.get('/download/ytmp3', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL YouTube)'
            });
        }

        try {
            const result = await ytdownDl(url);
            if (!result.status) throw new Error(result.error);

            // Cari audio dengan kualitas terbaik (biasanya 320k atau 128k)
            const bestAudio = result.audios.find(a => a.quality === '320k') || 
                              result.audios.find(a => a.quality === '128k') || 
                              result.audios[0];

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    title: result.title,
                    channel: result.channel,
                    thumbnail: result.thumbnail,
                    duration: result.duration,
                    audio: bestAudio || null,
                    all_audios: result.audios
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal download audio YouTube'
            });
        }
    });
};
