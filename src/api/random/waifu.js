const axios = require('axios');

module.exports = (app) => {
    app.get('/random/waifu', async (req, res) => {
        try {
            const response = await axios.get('https://api.waifu.im/random/?selected_tags=waifu', {
                timeout: 10000
            });

            if (!response.data?.images?.length) {
                throw new Error('Gambar tidak ditemukan');
            }

            const imageUrl = response.data.images[0].url;
            res.redirect(imageUrl);

        } catch (error) {
            res.status(500).json({
                status: false,
                error: 'Gagal mengambil gambar waifu'
            });
        }
    });
};
