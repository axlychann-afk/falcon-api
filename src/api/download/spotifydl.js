const axios = require('axios');

module.exports = (app) => {
    app.get('/download/spotify', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL Spotify)'
            });
        }

        // Extract track ID dari URL Spotify
        const trackId = url.match(/track\/([a-zA-Z0-9]+)/)?.[1];
        if (!trackId) {
            return res.status(400).json({
                status: false,
                error: 'URL Spotify tidak valid'
            });
        }

        try {
            // API 1: spotifydown.com
            const response = await axios.get(`https://api.spotifydown.com/download/${trackId}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Origin': 'https://spotifydown.com',
                    'Referer': 'https://spotifydown.com/'
                },
                timeout: 30000
            });
            
            if (response.data && response.data.success) {
                return res.json({
                    status: true,
                    creator: 'FlowFalcon',
                    result: {
                        title: response.data.metadata?.title || 'Unknown',
                        artist: response.data.metadata?.artist || 'Unknown',
                        download_url: response.data.link,
                        thumbnail: response.data.metadata?.cover || null,
                        duration: response.data.metadata?.duration || null
                    }
                });
            }
            throw new Error('Gagal dari spotifydown');
            
        } catch (error) {
            // Fallback API 2: spotify-downloader-api.vercel.app
            try {
                const fallbackRes = await axios.get(`https://spotify-downloader-api.vercel.app/api/download?trackId=${trackId}`, {
                    timeout: 30000
                });
                
                if (fallbackRes.data && fallbackRes.data.downloadUrl) {
                    return res.json({
                        status: true,
                        creator: 'FlowFalcon',
                        result: {
                            title: fallbackRes.data.title || 'Unknown',
                            artist: fallbackRes.data.artist || 'Unknown',
                            download_url: fallbackRes.data.downloadUrl,
                            thumbnail: fallbackRes.data.thumbnail || null,
                            duration: fallbackRes.data.duration || null
                        }
                    });
                }
                throw new Error('Gagal dari fallback API');
                
            } catch (fallbackError) {
                // Fallback API 3: api.vihangay.xyz
                try {
                    const vihangayRes = await axios.get(`https://api.vihangay.xyz/tools/spotifydl?url=${encodeURIComponent(url)}`, {
                        timeout: 30000
                    });
                    
                    if (vihangayRes.data && vihangayRes.data.download_url) {
                        return res.json({
                            status: true,
                            creator: 'FlowFalcon',
                            result: {
                                title: vihangayRes.data.title || 'Unknown',
                                artist: vihangayRes.data.artist || 'Unknown',
                                download_url: vihangayRes.data.download_url,
                                thumbnail: vihangayRes.data.thumbnail || null
                            }
                        });
                    }
                    throw new Error('Gagal dari vihangay API');
                    
                } catch (finalError) {
                    res.status(500).json({
                        status: false,
                        error: 'Gagal download lagu. Coba lagi nanti.'
                    });
                }
            }
        }
    });
};
