const axios = require('axios');

// Token dari hasil capture lo
const BEARER_TOKEN = 'BQAGxrbyJ0KglO7ezw6WmazzpR_nsH8_X-RR9KyWGHNPYPRlBJcC_cOodj1Usj4uBXO1i9R00gUs1nO6H_IC-hh1eLhGlqvy8LwkqhyOb00pjKcbVqdjAIZIONeZbDENS_TnaIL_wO1Nnvm7ur3y3c4ETbgmb9YO-Uq2nWpngRWFun-unA0WavaJtVVQ4FzK5yfZ__SlFI5yHcBTG6Y-4Y1UbeyydF1ddTmcggnrjW1taaDGJvfT6SwXsl1tD1E0ltdI7uGgVeHo98JqYfLLnj8owFQ7s_Li8CYm2wNC8RlmAqgbONZzAiASY4_Vavq7YL4hv-EHLh-sTc8nYBh7ADn-lFU_Ic4yxLaOC26ywiaE9YXIEdbOwJSwrBkRt4CMq5ssAlIV6gAmdW11Ag';

async function searchSpotify(query, limit = 20) {
    try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
            params: {
                q: query,
                type: 'track',
                limit: Math.min(limit, 30),
                market: 'ID'
            },
            headers: {
                'Authorization': `Bearer ${BEARER_TOKEN}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'app-platform': 'WebPlayer',
                'spotify-app-version': '1.2.91.188.ge6cd0508'
            },
            timeout: 15000
        });

        const tracks = response.data.tracks?.items.map(track => ({
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            image: track.album.images[0]?.url,
            url: track.external_urls.spotify,
            duration: `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`,
            preview: track.preview_url || null
        })) || [];

        return tracks;
    } catch (error) {
        if (error.response?.status === 401) {
            throw new Error('Token expired. Ambil token baru dari browser Spotify');
        }
        throw new Error(error.message);
    }
}

module.exports = (app) => {
    app.get('/search/spotify', async (req, res) => {
        const { q, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({ status: false, error: 'Parameter "q" diperlukan' });
        }

        try {
            const results = await searchSpotify(q, Math.min(parseInt(limit) || 10, 30));
            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    query: q,
                    total: results.length,
                    data: results
                }
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
