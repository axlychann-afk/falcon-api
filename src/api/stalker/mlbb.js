const axios = require('axios');

module.exports = (app) => {
    app.get('/stalker/mlbb', async (req, res) => {
        const { id, zone } = req.query;

        if (!id) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "id" diperlukan (ID player Mobile Legends)'
            });
        }

        if (!zone) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "zone" diperlukan (zone ID player)'
            });
        }

        try {
            const response = await axios.get(`https://api.nexray.eu.cc/stalker/mlbb?id=${id}&zone=${zone}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const data = response.data;

            if (!data.status || !data.result) {
                throw new Error('Gagal mengambil data MLBB');
            }

            const result = data.result;

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    username: result.username || '-',
                    region: result.region || '-',
                    id: result.id || id,
                    zone: result.zone || zone
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengambil data Mobile Legends'
            });
        }
    });
};
