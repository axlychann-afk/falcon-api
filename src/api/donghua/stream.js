const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/donghua/stream', async (req, res) => {
    const { slug } = req.query;
    
    if (!slug) {
      return res.status(400).json({
        status: false,
        creator: getCreator(),
        error: 'Parameter "slug" diperlukan'
      });
    }
    
    try {
      const url = `${BASE_URL}/${slug}/`;
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(data);
      let streamUrl = null;
      let source = null;
      
      // Cari semua iframe (Dailymotion, OK.ru, dll)
      $('iframe').each((_, el) => {
        const src = $(el).attr('src');
        if (src && (src.includes('dailymotion.com') || src.includes('ok.ru') || src.includes('rumble.com'))) {
          streamUrl = src;
          if (src.includes('ok.ru')) source = 'OK.ru';
          else if (src.includes('dailymotion')) source = 'Dailymotion';
          else source = 'Other';
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
      
      const title = $('.entry-title').text().trim() || 'Donghua Episode';
      
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: title,
          source: source,
          embed_url: streamUrl,
          watch_url: streamUrl.replace('/videoembed/', '/video/')
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
