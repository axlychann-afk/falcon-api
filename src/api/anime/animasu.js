const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://v1.animasu.work";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
  
  app.get('/anime/animasu/stream', async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          creator: getCreator(),
          error: 'Parameter "url" wajib diisi (URL episode Animasu)'
        });
      }

      if (!url.includes('animasu.work')) {
        return res.status(400).json({
          status: false,
          creator: getCreator(),
          error: 'URL harus dari domain animasu.work'
        });
      }

      // Fetch HTML
      const { data: html } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Referer': BASE_URL,
          'Cookie': 'cf_clearance=1; _ga=1; _ym_uid=1; _ym_d=1; _ym_isad=1'
        },
        timeout: 30000
      });

      const $ = cheerio.load(html);

      // ─── Ambil Judul ──────────────────────────────────────
      const title = $('h1.entry-title').text().trim() || 
                    $('title').text().trim() || 
                    'Anime Episode';

      // ─── Ambil Thumbnail ──────────────────────────────────
      const thumbnail = $('meta[property="og:image"]').attr('content') ||
                        $('img[itemprop="image"]').attr('src') ||
                        null;

      // ─── Cari Stream ──────────────────────────────────────
      let streamUrl = null;
      let embedId = null;
      let rawHtml = null;
      let width = null;
      let height = null;
      let allowfullscreen = false;
      let scrolling = null;
      let source = null;
      let marginwidth = null;
      let marginheight = null;

      // Cari semua iframe
      $('#embed_holder iframe, .player-embed iframe, .video-content iframe').each((_, el) => {
        const $el = $(el);
        const src = $el.attr('src');

        if (!src) return;

        // ─── Blogger ──────────────────────────────────────
        if (src.includes('blogger.com/video.g')) {
          streamUrl = src;
          source = 'Blogger Video';
          rawHtml = $el.toString();
          width = $el.attr('width') || null;
          height = $el.attr('height') || null;
          allowfullscreen = $el.attr('allowfullscreen') !== undefined;
          scrolling = $el.attr('scrolling') || null;
          marginwidth = $el.attr('marginwidth') || null;
          marginheight = $el.attr('marginheight') || null;

          const tokenMatch = src.match(/token=([^&]+)/);
          if (tokenMatch) embedId = tokenMatch[1];

          return false;
        }

        // ─── Abyssplayer ──────────────────────────────────
        if (src.includes('abyssplayer.com')) {
          streamUrl = src;
          source = 'Abyssplayer';
          rawHtml = $el.toString();
          width = $el.attr('width') || null;
          height = $el.attr('height') || null;
          allowfullscreen = $el.attr('allowfullscreen') !== undefined;
          scrolling = $el.attr('scrolling') || null;

          const idMatch = src.match(/abyssplayer\.com\/([a-zA-Z0-9_]+)/);
          if (idMatch) embedId = idMatch[1];

          return false;
        }
      });

      // ─── Jika Tidak Ada Stream ──────────────────────────
      if (!streamUrl) {
        return res.status(404).json({
          status: false,
          creator: getCreator(),
          error: 'Link streaming tidak ditemukan',
          note: 'Halaman ini tidak memiliki player yang didukung (Blogger/Abyssplayer)'
        });
      }

      // ─── Ambil Navigasi ──────────────────────────────────
      const prevEpisode = $('.nvs a[rel="prev"]').attr('href') || null;
      const nextEpisode = $('.nvs a[rel="next"]').attr('href') || null;
      const animeInfo = $('.nvs.nvsc a').attr('href') || null;

      // ─── Ambil Download Link ─────────────────────────────
      let downloadLink = null;
      $('#download_episode').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href !== '#') {
          downloadLink = href;
        }
      });

      // ─── Response ──────────────────────────────────────────
      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: title,
          thumbnail: thumbnail,
          url: url,
          source: source,
          embed_id: embedId,
          embed_url: streamUrl,
          raw_html: rawHtml,
          width: width,
          height: height,
          allowfullscreen: allowfullscreen,
          scrolling: scrolling,
          marginwidth: marginwidth,
          marginheight: marginheight,
          navigation: {
            prev_episode: prevEpisode,
            next_episode: nextEpisode,
            anime_info: animeInfo
          },
          download_link: downloadLink
        }
      });

    } catch (error) {
      console.error('[Animasu Stream Error]', error.message);
      res.status(500).json({
        status: false,
        creator: getCreator(),
        error: error.message
      });
    }
  });
};
