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
            // Panggil API
            const response = await axios.get('https://api.harzrestapi.web.id/api/v2/ig', {
                params: {
                    q: url,
                    apikey: 'FREE'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // Kirim response mentah dulu buat debugging
            return res.json({
                status: true,
                creator: 'AxlyChann',
                raw_response: response.data,  // Ini buat liat struktur asli
                note: 'Cek struktur data di raw_response'
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message,
                detail: error.response?.data
            });
        }
    });
};
