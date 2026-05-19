const axios = require('axios');

module.exports = (app) => {
    app.get('/tools/ssweb', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan'
            });
        }

        try {
            const response = await axios.get('https://www.neoapis.xyz/api/tools/ssweb', {
                params: { url: url },
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });

            const contentType = response.headers['content-type'] || 'image/png';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="screenshot.png"`);
            res.send(response.data);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengambil screenshot'
            });
        }
    });
};
