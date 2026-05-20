const axios = require('axios');

const CLIENT_ID = 'fbf05c3971764fd5bc55466cde7ac261';
const CLIENT_SECRET = '4c92cf05731a4fc2b3612246a7e36d7e';

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const response = await axios.post('https://accounts.spotify.com/api/token', 
        'grant_type=client_credentials', {
            headers: {
                'Authorization': `Basic ${basic}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );

    cachedToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return cachedToken;
}

module.exports = (app) => {
    app.get('/search/spotify', async (req, res) => {
        const { q, limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "q" diperlukan (kata kunci pencarian)'
            });
        }

        try {
            const token = await getToken();
            const response = await axios.get(`https://api.spotify.com/v1/search`, {
                params: {
                    q: q,
                    type: 'track',
                    limit: Math.min(parseInt(limit) || 10, 30)
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            const tracks = response.data.tracks?.items.map(track => ({
                title: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                image: track.album.images[0]?.url || null,
                url: track.external_urls.spotify,
                popularity: track.popularity,
                duration: `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`
            })) || [];

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    query: q,
                    total: tracks.length,
                    data: tracks
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
