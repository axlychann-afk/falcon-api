// ytdown.js - YouTube Downloader via yt-dlp-exec
const ytDlp = require('yt-dlp-exec');

function formatSize(bytes) {
  if (!bytes) return '-';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDuration(seconds) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function ytdownDl(url) {
  const info = await ytDlp(url, {
    dumpSingleJson: true,
    noPlaylist: true,
    noWarnings: true,
  });

  const videos = [];
  const audios = [];

  for (const f of info.formats || []) {
    if (!f.url) continue;
    const size = formatSize(f.filesize ?? f.filesize_approx);

    if (f.vcodec !== 'none' && f.acodec !== 'none' && f.ext === 'mp4') {
      videos.push({
        resolution: f.resolution ?? `${f.height ?? '?'}p`,
        quality: f.height ? `${f.height}p` : (f.format_note ?? '-'),
        size,
        url: f.url
      });
    } else if (f.vcodec === 'none' && f.acodec && f.acodec !== 'none') {
      const kbps = f.abr ?? f.tbr;
      audios.push({
        quality: kbps ? `${Math.round(kbps)}k` : (f.format_note ?? 'audio'),
        size,
        url: f.url
      });
    }
  }

  videos.sort((a, b) => parseInt(b.quality) - parseInt(a.quality));
  audios.sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

  return {
    title: info.title || '-',
    thumbnail: info.thumbnail || '-',
    duration: formatDuration(info.duration),
    channel: info.channel || info.uploader || '-',
    videos,
    audios
  };
}

function isYouTubeUrl(url) {
  return url.includes('youtu.be') || url.includes('youtube.com');
}

module.exports = (app) => {

  // GET /download/ytmp4?url=xxx
  app.get('/download/ytmp4', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter url (link YouTube) wajib diisi' });
      if (!isYouTubeUrl(url)) return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'URL harus dari YouTube' });

      const result = await ytdownDl(url);
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          title: result.title,
          thumbnail: result.thumbnail,
          duration: result.duration,
          videos: result.videos
        }
      });
    } catch (error) {
      res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
    }
  });

  // GET /download/ytmp3?url=xxx
  app.get('/download/ytmp3', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter url (link YouTube) wajib diisi' });
      if (!isYouTubeUrl(url)) return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'URL harus dari YouTube' });

      const result = await ytdownDl(url);
      const bestAudio = result.audios.find(a => a.quality === '320k') || result.audios[0];
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          title: result.title,
          thumbnail: result.thumbnail,
          duration: result.duration,
          audio: bestAudio || null,
          all_audios: result.audios
        }
      });
    } catch (error) {
      res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
    }
  });

  // GET /download/ytdown?url=xxx
  app.get('/download/ytdown', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter url (link YouTube) wajib diisi' });
      if (!isYouTubeUrl(url)) return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'URL harus dari YouTube' });

      const result = await ytdownDl(url);
      res.json({
        status: true,
        creator: 'AxlyDev',
        result: {
          title: result.title,
          thumbnail: result.thumbnail,
          duration: result.duration,
          channel: result.channel,
          videos: result.videos,
          audios: result.audios
        }
      });
    } catch (error) {
      res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
    }
  });

};
