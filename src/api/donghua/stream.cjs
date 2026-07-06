const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://anichin.moe";

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

// Pakai axios.create() biar header konsisten — ini yang cegah 403
const createInstance = () => {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    timeout: 30000,
  });
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
      const client = createInstance();
      const { data } = await client.get(`/${slug}/`);
      const $ = cheerio.load(data);

      let streamUrl = null;
      let videoId = null;
      let source = null;
      const allStreams = [];

      // ── CARA UTAMA: decode base64 dari .mirror option ────────────────────
      // anichin.moe menyimpan embed URL di dalam value option yang di-encode base64
      // Contoh: <option value="PHNjcmlwdC...">Server 1</option>
      $(".mirror option").each((_, el) => {
        const serverName = $(el).text().trim();
        const value = $(el).attr("value") || "";

        if (!value || serverName === "Select Video Server") return;

        let decoded;
        try {
          decoded = Buffer.from(value, "base64").toString("utf-8");
        } catch {
          return; // skip kalau bukan base64 valid
        }

        // Cari iframe src di dalam HTML yang sudah di-decode
        const iframeMatch = decoded.match(/<iframe[^>]*src=["']([^"']+)["']/i);
        if (!iframeMatch || !iframeMatch[1]) return;

        const embedUrl = iframeMatch[1];

        // Tentukan source dari URL embed
        let detectedSource = 'Unknown';
        let detectedId = null;

        if (/player\.cakrawalaweb\.site/.test(embedUrl)) {
          detectedSource = 'CakrawalaWeb Player';
        } else if (/dailymotion\.com/.test(embedUrl)) {
          detectedSource = 'Dailymotion';
          detectedId = embedUrl.match(/video\/([a-zA-Z0-9]+)/)?.[1] || null;
        } else if (/ok\.ru/.test(embedUrl)) {
          detectedSource = 'OK.ru';
          detectedId = embedUrl.match(/videoembed\/(\d+)/)?.[1] || null;
        } else if (/rumble\.com/.test(embedUrl)) {
          detectedSource = 'Rumble';
          detectedId = embedUrl.match(/embed\/([a-zA-Z0-9]+)/)?.[1] || null;
        } else if (/streamtape\.com/.test(embedUrl)) {
          detectedSource = 'Streamtape';
        } else if (/dood/.test(embedUrl) || /d0000d\.com/.test(embedUrl)) {
          detectedSource = 'Doodstream';
        } else if (/filemoon\.sx|moonplayer\.net/.test(embedUrl)) {
          detectedSource = 'Filemoon';
        } else if (/streamwish\.com|sfastwish\.com/.test(embedUrl)) {
          detectedSource = 'StreamWish';
        }

        allStreams.push({
          server: serverName,
          source: detectedSource,
          video_id: detectedId,
          embed_url: embedUrl,
        });

        // Simpan yang pertama sebagai stream utama
        if (!streamUrl) {
          streamUrl = embedUrl;
          source = detectedSource;
          videoId = detectedId;
        }
      });

      // ── FALLBACK: scan Dailymotion Player Script API (data-video) ────────
      // Untuk episode yang pakai script tag bukan iframe
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

      // ── FALLBACK: scan iframe langsung di halaman ─────────────────────────
      if (!streamUrl) {
        $('iframe[src*="player.cakrawalaweb.site"]').each((_, el) => {
          streamUrl = $(el).attr('src');
          source = 'CakrawalaWeb Player';
          return false;
        });
      }

      if (!streamUrl) {
        $('iframe[src*="dailymotion.com"]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) {
            const match = src.match(/video\/([a-zA-Z0-9]+)/);
            if (match) {
              videoId = match[1];
              streamUrl = `https://www.dailymotion.com/embed/video/${videoId}?ui=0&autoplay=1`;
              source = 'Dailymotion';
            }
          }
          return false;
        });
      }

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
          watch_url: watchUrl || streamUrl,
          // Bonus: semua server tersedia (dari .mirror option)
          all_streams: allStreams.length > 0 ? allStreams : undefined
        }
      });

    } catch (error) {
      console.error('[Donghua Stream Error]', error.message);

      if (error.response?.status === 403) {
        return res.status(403).json({
          status: false,
          creator: getCreator(),
          error: 'Akses ditolak oleh anichin.moe (403)',
          note: 'Site mungkin sedang down atau memblokir request'
        });
      }

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
