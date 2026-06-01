const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/anime/anichin/stream', async (req, res) => {
    const { slug } = req.query;
    
    if (!slug) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Parameter "slug" diperlukan (contoh: ?slug=naruto-episode-1)'
      });
    }
    
    try {
      // Ambil halaman episode
      const { data } = await axios.get(`${BASE_URL}/${slug}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(data);
      
      // Cari iframe Dailymotion
      let streamUrl = null;
      
      $('iframe[src*="dailymotion.com"]').each((_, el) => {
        const src = $(el).attr('src');
        if (src) {
          // Extract ID video
          const videoId = src.match(/video=([a-zA-Z0-9]+)/)?.[1];
          if (videoId) {
            streamUrl = `https://www.dailymotion.com/embed/video/${videoId}?ui=0&autoplay=1`;
          }
          return false;
        }
      });
      
      if (!streamUrl) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Link streaming tidak ditemukan'
        });
      }
      
      // Ambil judul episode
      const title = $('.entry-title').text().trim() || 'Episode';
      
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: title,
          url: streamUrl,
          embed: `<iframe src="${streamUrl}" frameborder="0" allowfullscreen></iframe>`
        }
      });
      
    } catch (error) {
      console.error('[Stream Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
