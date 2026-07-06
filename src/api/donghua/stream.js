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
      const { data } = await axios.get(`${BASE_URL}/${slug}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
          'Referer': BASE_URL,
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(data);
      
      let streamUrl = null;
      let videoId = null;
      let source = null;
      
      // 1. CakrawalaWeb Player (embed utama baru di anichin.moe)
      $('iframe[src*="player.cakrawalaweb.site"]').each((_, el) => {
        const src = $(el).attr('src');
        if (src) {
          streamUrl = src;
          source = 'CakrawalaWeb Player';
          videoId = null;
        }
        return false;
      });
      
      // 2. Dailymotion iframe (cara lama)
      if (!streamUrl) {
        $('iframe[src*="dailymotion.com"]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) {
            const match = src.match(/video=([a-zA-Z0-9]+)/);
            if (match) {
              videoId = match[1];
              streamUrl = `https://www.dailymotion.com/embed/video/${videoId}?ui=0&autoplay=1`;
              source = 'Dailymotion';
            }
          }
          return false;
        });
      }
      
      // 3. Dailymotion Player Script API (cara baru — bukan iframe, pakai data-video)
      //    Contoh: <script src="https://geo.dailymotion.com/player/xid0t.js" data-video="x9abcd">
      if (!streamUrl) {
        $('script[src*="geo.dailymotion.com"]').each((_, el) => {
          const dvId = $(el).attr('data-video');
          if (dvId && dvId.trim() !== '') {
            videoId = dvId.trim();
            streamUrl = `https://www.dailymotion.com/embed/video/${videoId}?ui=0&autoplay=1`;
            source = 'Dailymotion';
          }
          return false;
        });
      }
      
      // 4. OK.ru iframe
      if (!streamUrl) {
        $('iframe[src*="ok.ru"]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) {
            streamUrl = src;
            source = 'OK.ru';
            const match = src.match(/videoembed\/(\d+)/);
            if (match) videoId = match[1];
          }
          return false;
        });
      }
      
      // 5. Rumble iframe
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
      
      // 6. Streamtape
      if (!streamUrl) {
        $('iframe[src*="streamtape.com"]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) { streamUrl = src; source = 'Streamtape'; }
          return false;
        });
      }
      
      // 7. Doodstream
      if (!streamUrl) {
        $('iframe').each((_, el) => {
          const src = $(el).attr('src') || '';
          if (/dood(?:stream)?\.(?:com|la|cx|pm|re|so|to|watch|wf|yt)|d0000d\.com/.test(src)) {
            streamUrl = src;
            source = 'Doodstream';
          }
          return false;
        });
      }
      
      // 8. Filemoon
      if (!streamUrl) {
        $('iframe[src*="filemoon.sx"], iframe[src*="filemoon.in"], iframe[src*="moonplayer.net"]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) { streamUrl = src; source = 'Filemoon'; }
          return false;
        });
      }
      
      // 9. StreamWish
      if (!streamUrl) {
        $('iframe[src*="streamwish.com"], iframe[src*="sfastwish.com"]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) { streamUrl = src; source = 'StreamWish'; }
          return false;
        });
      }
      
      // 10. VidHide
      if (!streamUrl) {
        $('iframe[src*="vidhide.com"]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) { streamUrl = src; source = 'VidHide'; }
          return false;
        });
      }
      
      // 11. Fallback: link Dailymotion di anchor tag
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
      
      // 12. Fallback: link OK.ru di anchor tag
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
      
      const title = $('.entry-title').text().trim() || 'Donghua Episode';
      
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
