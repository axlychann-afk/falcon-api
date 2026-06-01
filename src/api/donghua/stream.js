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
        error: 'Parameter "slug" diperlukan (contoh: ?slug=tales-of-herding-gods-episode-85-subtitle-indonesia)'
      });
    }
    
    try {
      // Ambil halaman episode dari anichin.moe
      const { data } = await axios.get(`${BASE_URL}/${slug}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(data);
      
      // Variabel untuk menyimpan stream
      let streamUrl = null;
      let videoId = null;
      let source = null;
      
      // 1. Cari iframe Dailymotion
      $('iframe[src*="dailymotion.com"]').each((_, el) => {
        const src = $(el).attr('src');
        if (src) {
          const match = src.match(/video=([a-zA-Z0-9]+)/);
          if (match) {
            videoId = match[1];
            streamUrl = `https://www.dailymotion.com/embed/video/${videoId}?ui=0&autoplay=1`;
            source = 'Dailymotion';
          }
          return false;
        }
      });
      
      // 2. Cari iframe OK.ru
      if (!streamUrl) {
        $('iframe[src*="ok.ru"]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) {
            streamUrl = src;
            source = 'OK.ru';
            // Extract video ID dari URL OK.ru
            const match = src.match(/videoembed\/(\d+)/);
            if (match) videoId = match[1];
          }
          return false;
        });
      }
      
      // 3. Cari iframe Rumble
      if (!streamUrl) {
        $('iframe[src*="rumble.com"]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) {
            streamUrl = src;
            source = 'Rumble';
            const match = src.match(/embed\/([a-zA-Z0-9]+)/);
            if (match) videoId = match[1];
          }
          return false;
        });
      }
      
      // 4. Fallback: cari link Dailymotion
      if (!streamUrl) {
        $('a[href*="dailymotion.com"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            const match = href.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
            if (match) {
              videoId = match[1];
              streamUrl = `https://www.dailymotion.com/embed/video/${videoId}?ui=0&autoplay=1`;
              source = 'Dailymotion';
            }
          }
          return false;
        });
      }
      
      // 5. Fallback: cari link OK.ru
      if (!streamUrl) {
        $('a[href*="ok.ru"]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            const match = href.match(/ok\.ru\/video\/(\d+)/);
            if (match) {
              videoId = match[1];
              streamUrl = `https://ok.ru/videoembed/${videoId}`;
              source = 'OK.ru';
            }
          }
          return false;
        });
      }
      
      if (!streamUrl) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Link streaming tidak ditemukan',
          note: 'Pastikan slug episode benar'
        });
      }
      
      // Ambil judul episode
      const title = $('.entry-title').text().trim() || 'Donghua Episode';
      
      // Buat watch URL untuk OK.ru
      let watchUrl = null;
      if (source === 'OK.ru' && videoId) {
        watchUrl = `https://ok.ru/video/${videoId}`;
      } else if (source === 'Dailymotion' && videoId) {
        watchUrl = `https://www.dailymotion.com/video/${videoId}`;
      }
      
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: title,
          source: source,
          video_id: videoId,
          embed_url: streamUrl,
          watch_url: watchUrl || streamUrl
        }
      });
      
    } catch (error) {
      console.error('[Donghua Stream Error]', error.message);
      
      if (error.response?.status === 404) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Episode tidak ditemukan',
          note: 'Periksa kembali slug episode'
        });
      }
      
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
