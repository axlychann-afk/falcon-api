const axios = require("axios");

module.exports = (app) => {
    app.get('/search/spotify', async (req, res) => {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "q" diperlukan (kata kunci pencarian)'
            });
        }

        try {
            const response = await axios.get(`https://api.nexray.eu.cc/search/spotify?q=${encodeURIComponent(q)}`);
            
            // Kirim response persis seperti dari API asli
            res.json({
                status: response.data.status,
                author: response.data.author || "FlowFalcon",
                result: response.data.result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal mencari lagu di Spotify'
            });
        }
    });
};
