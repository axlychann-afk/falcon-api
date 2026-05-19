const axios = require('axios');

module.exports = (app) => {
    app.get('/random/loli', async (req, res) => {
        try {
            // Pake Waifu.pics API (punya tag loli)
            const response = await axios.get('https://api.waifu.pics/sfw/loli', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });

            const data = response.data;

            if (!data || !data.url) {
                throw new Error('Gagal mengambil gambar loli');
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    url: data.url,
                    category: 'loli',
                    source: 'waifu.pics'
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengambil gambar loli'
            });
        }
    });
};
