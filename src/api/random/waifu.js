const axios = require('axios');

module.exports = (app) => {
    app.get('/random/waifu', async (req, res) => {
        try {
            // Pake Nekos.life API (gratis, stabil)
            const response = await axios.get('https://nekos.life/api/v2/img/waifu', {
                timeout: 10000
            });

            if (!response.data?.url) {
                throw new Error('Gambar tidak ditemukan');
            }

            const imageUrl = response.data.url;
            res.redirect(imageUrl);

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: 'Gagal mengambil gambar waifu'
            });
        }
    });
};
