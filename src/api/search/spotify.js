const axios = require('axios');

// Ganti dengan Client ID & Secret dari Spotify Developer Dashboard
const CLIENT_ID = 'fbf05c3971764fd5bc55466cde7ac261';
const CLIENT_SECRET = '4c92cf05731a4fc2b3612246a7e36d7e';

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const response = await axios.post('https://accounts.spotify.com/api/token', 
        'grant_type=client_credentials', {
            headers: {
                'Authorization': `Basic ${basic}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

    cachedToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return cachedToken;
}

// Cache hasil search
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function searchSpotify(query, limit = 10) {
    const cacheKey = `spotify_${query}_${limit}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const token = await getToken();
    const response = await axios.get('https://api.spotify.com/v1/search', {
        params: { q: query, type: 'track', limit: Math.min(limit, 30), market: 'ID' },
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const tracks = response.data.tracks?.items.map(track => ({
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        image: track.album.images[0]?.url,
        url: track.external_urls.spotify,
        duration: `${Math.floor(track.duration_ms / 60000)}:${Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0')}`
    })) || [];

    cache.set(cacheKey, tracks);
    setTimeout(() => cache.delete(cacheKey), CACHE_TTL);
    return tracks;
}

module.exports = (app) => {
    app.get('/search/spotify', async (req, res) => {
        const { q, limit = 10 } = req.query;
        if (!q) return res.status(400).json({ status: false, error: 'Parameter "q" diperlukan' });

        try {
            const results = await searchSpotify(q, Math.min(parseInt(limit) || 10, 30));
            res.json({ status: true, creator: 'AxlyChann', result: { query: q, total: results.length, data: results } });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
