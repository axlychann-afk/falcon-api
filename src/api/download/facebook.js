const axios = require('axios');
const cheerio = require('cheerio');

async function facebookDownloader(url) {
    try {
        const { data } = await axios.post('https://savereels.io/api/ajaxSearch',
            new URLSearchParams({ q: url, w: '', v: 'v2', lang: 'id' }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 30000
            }
        );

        if (data.status !== 'ok') {
            throw new Error('Gagal mengambil data dari savereels.io');
        }

        const $ = cheerio.load(data.data);
        const videos = [];
        const thumbnail = $('.image-fb img').attr('src') || null;
        const title = $('.content h3').text().trim() || "Facebook Video";
        const audioUrl = $('#audioUrl').val() || null;

        $('table.table tbody tr').each((i, el) => {
            const quality = $(el).find('.video-quality').text().trim();
            const downloadUrl = $(el).find('a.download-link-fb').attr('href');
            if (downloadUrl && quality && !quality.includes('kbps')) {
                videos.push({ quality, url: downloadUrl });
            }
        });

        return {
            status: true,
            title: title,
            thumbnail: thumbnail,
            videos: videos,
            audio: audioUrl
        };

    } catch (error) {
        return {
            status: false,
            error: error.message
        };
    }
}

module.exports = (app) => {
    app.get('/download/facebook', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL Facebook video)'
            });
        }

        try {
            const result = await facebookDownloader(url);
            
            if (!result.status) {
                throw new Error(result.error);
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    title: result.title,
                    thumbnail: result.thumbnail,
                    videos: result.videos,
                    audio: result.audio
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal download Facebook video'
            });
        }
    });
};
