const axios = require('axios');
const cheerio = require('cheerio');

async function getStreamingUrl(episodeUrl) {
    try {
        const { data } = await axios.get(episodeUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        let playerUrl = null;
        
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && (src.includes('filedon') || src.includes('embed') || src.includes('player') || src.includes('drive'))) {
                playerUrl = src;
                return false;
            }
        });
        
        if (!playerUrl) {
            $('a[href*="filedon.co"]').each((i, el) => {
                playerUrl = $(el).attr('href');
                return false;
            });
        }
        
        return {
            player_url: playerUrl,
            download_links: playerUrl ? [playerUrl] : []
        };
        
    } catch (error) {
        throw new Error(`Gagal ambil streaming: ${error.message}`);
    }
}

module.exports = (app) => {
    app.get('/anime/samehadaku/stream', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyDev',
                error: 'Parameter "url" diperlukan'
            });
        }
        
        try {
            const result = await getStreamingUrl(url);
            
            if (!result.player_url) {
                return res.status(404).json({
                    status: false,
                    creator: 'AxlyDev',
                    error: 'Link player tidak ditemukan'
                });
            }
            
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: {
                    player_url: result.player_url,
                    download_links: result.download_links
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                creator: 'AxlyDev',
                error: error.message
            });
        }
    });
};
