const axios = require('axios');

module.exports = (app) => {
    app.get('/random/loli', async (req, res) => {
        try {
            const response = await axios.get('https://api.zenzxz.my.id/image/loli', {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const contentType = response.headers['content-type'] || 'image/jpeg';
            
            res.setHeader('Content-Type', contentType);
            res.send(response.data);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengambil gambar loli'
            });
        }
    });
};
