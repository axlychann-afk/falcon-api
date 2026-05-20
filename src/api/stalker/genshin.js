const axios = require('axios');

module.exports = (app) => {
    app.get('/stalker/genshin', async (req, res) => {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "id" diperlukan'
            });
        }

        try {
            const response = await axios.get(`https://dak.gg/genshin/profile/${id}?hl=en`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            // Ambil JSON dari HTML
            const match = response.data.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
            if (!match) {
                return res.json({
                    status: false,
                    error: 'Tidak nemu __NEXT_DATA__',
                    html_preview: response.data.slice(0, 500)
                });
            }

            const json = JSON.parse(match[1]);
            
            // Return full JSON buat debugging
            return res.json({
                status: 'debug',
                full_json: json
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });
};
