const axios = require('axios');

module.exports = (app) => {
    app.get('/stalker/genshin', async (req, res) => {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "id" diperlukan (UID Genshin Impact)'
            });
        }

        try {
            const response = await axios.get(`https://api.nexray.eu.cc/stalker/genshin?id=${id}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const data = response.data;

            if (!data.status || !data.result) {
                throw new Error('Gagal mengambil data Genshin');
            }

            const result = data.result;

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    uid: result.id,
                    nickname: result.player_info?.nickname || '-',
                    level: result.player_info?.level || 0,
                    signature: result.player_info?.signature || '-',
                    world_level: result.player_info?.world_level || 0,
                    achievements: result.player_info?.achievements || 0,
                    spiral_abyss: result.player_info?.spiral_abyss || '-',
                    theater: result.player_info?.theater || '-',
                    stygian_onslaught: result.player_info?.stygian_onslaught || '-',
                    avatar: result.player_info?.avatar || null,
                    image_url: result.image_url || null,
                    timestamp: result.timestamp
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mengambil data Genshin Impact'
            });
        }
    });
};
