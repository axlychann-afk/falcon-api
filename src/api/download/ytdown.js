// ytdown.js - YouTube Downloader via J2Downloader (AIO)
// Endpoint: GET /download/ytmp4 | GET /download/ytmp3 | GET /download/aio
const axios = require('axios');
const crypto = require('crypto');

// ============================================================
//  J2Downloader class (AIO)
// ============================================================
class J2Downloader {
    constructor() {
        this.baseUrl = 'https://j2download.com';
        this.userAgent = 'Mozilla/5.0 (Linux; Android 16; Infinix X6837 Build/BP2A.250605.031.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.135 Mobile Safari/537.36';
    }
    
    getRandomIp() {
        const r = () => Math.floor(Math.random() * 254) + 1;
        return `${r()}.${r()}.${r()}.${r()}`;
    }

    hasLeadingZeroNibbles(bytes, difficulty) {
        const fullBytes = Math.floor(difficulty / 2);
        const hasHalfByte = (difficulty & 1) === 1;
        for (let i = 0; i < fullBytes; i++) {
            if (bytes[i] !== 0) return false;
        }
        return !(hasHalfByte && (bytes[fullBytes] & 0xF0) !== 0);
    }

    deriveAltChallenge(challenge, nonce, solution) {
        const text = `pow:alt:${challenge}:${nonce}:${solution}`;
        return crypto.createHash('sha256').update(text).digest('hex');
    }

    solveSinglePow(challengeType, challenge, nonce, difficulty) {
        const prefix = challengeType === 'alt' ? `pow:${nonce}:` : `pow:${challenge}:`;
        const suffix = challengeType === 'alt' ? `:${challenge}` : `:${nonce}:${challenge.length}`;
        for (let n = 0; n < 100000000; n++) {
            const text = prefix + n + suffix;
            const hash = crypto.createHash('sha256').update(text).digest();
            if (this.hasLeadingZeroNibbles(hash, difficulty)) return String(n);
        }
        return null;
    }

    generatePowSolution(challenge, nonce, difficulty, challengeType = 'classic') {
        const first = this.solveSinglePow(challengeType, challenge, nonce, difficulty);
        if (!first) return null;
        if (challengeType !== 'alt') return first;
        const secondChallenge = this.deriveAltChallenge(challenge, nonce, first);
        const second = this.solveSinglePow(challengeType, secondChallenge, nonce, difficulty);
        return second ? `${first}.${second}` : null;
    }

    async autoGetJwtAndSession(ip) {
        const homeRes = await axios.get(`${this.baseUrl}/id`, {
            headers: { 
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            }
        });

        let rawSetCookie = homeRes.headers['set-cookie'];
        if (Array.isArray(rawSetCookie)) rawSetCookie = rawSetCookie.join('; ');
        if (!rawSetCookie) rawSetCookie = '';
        
        const sessionMatch = rawSetCookie.match(/session=([^;]+)/);
        if (!sessionMatch) throw new Error("Session tidak ditemukan");
        const sessionCookie = sessionMatch[1];
        
        const htmlText = homeRes.data;
        const bootstrapMatch = htmlText.match(/window\.__BOOTSTRAP__\s*=\s*(\{.*?\})/s);
        if (!bootstrapMatch) throw new Error("Bootstrap tidak ditemukan");
        const { nonce, powChallenge, powDifficulty, challengeType } = JSON.parse(bootstrapMatch[1]);

        const powSolution = this.generatePowSolution(powChallenge, nonce, powDifficulty, challengeType || 'classic');
        if (!powSolution) throw new Error("Gagal PoW");

        const authRes = await axios.post(`${this.baseUrl}/api/auth/issue`, '', {
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': this.baseUrl,
                'Referer': `${this.baseUrl}/id`,
                'Cookie': `session=${sessionCookie}`,
                'x-page-nonce': nonce,
                'x-pow-solution': powSolution,
                'X-Forwarded-For': ip,
                'X-Real-IP': ip,
                'Client-IP': ip
            }
        });

        return { jwtToken: authRes.data.accessToken, sessionCookie };
    }

    async download(targetUrl) {
        if (!targetUrl || typeof targetUrl !== 'string') {
            throw new Error("URL salah");
        }
        
        const ip = this.getRandomIp();
        const { jwtToken, sessionCookie } = await this.autoGetJwtAndSession(ip);

        const res = await axios.post(`${this.baseUrl}/api/autolink`, {
            data: { url: targetUrl, unlock: true }
        }, {
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`,
                'Origin': this.baseUrl,
                'Referer': `${this.baseUrl}/id`,
                'Cookie': `session=${sessionCookie}`,
            }
        });

        return res.data;
    }
}

// ============================================================
//  Helper: ekstrak media dari response AIO (defensive)
// ============================================================
function extractMedia(aio, kind /* 'video' | 'audio' */) {
    let pool = [];
    const buckets = [
        aio?.data?.medias, aio?.medias,
        aio?.data?.links,  aio?.links,
        aio?.data?.formats, aio?.formats,
        aio?.data?.downloads, aio?.downloads,
        aio?.data?.files,  aio?.files,
        aio?.data?.sources, aio?.sources,
        aio?.data, aio?.result
    ];
    for (const b of buckets) {
        if (Array.isArray(b)) { pool = pool.concat(b); break; }
    }
    if (!pool.length && aio && typeof aio === 'object') {
        for (const k of Object.keys(aio)) {
            const v = aio[k];
            if (Array.isArray(v)) { pool = v; break; }
        }
    }

    const norm = pool
        .filter(m => m && typeof m === 'object')
        .map(m => {
            const url      = m.url || m.link || m.downloadUrl || m.download_url || m.src || m.href || '';
            const quality  = m.quality || m.resolution || m.label || m.mediaQuality || '-';
            const format   = (m.ext || m.extension || m.format || m.mime || m.type || '').toString().toLowerCase();
            const mime     = (m.mimeType || m.mime || '').toString().toLowerCase();
            const size     = m.size || m.filesize || m.fileSize || m.mediaFileSize || '-';
            return { url, quality, format, mime, size, raw: m };
        })
        .filter(m => m.url);

    const isVideo = (m) =>
        /^(mp4|webm|mkv|mov|m4v)$/.test(m.format) ||
        m.mime.includes('video') ||
        /\b(144|240|360|480|720|1080|1440|2160)p\b/i.test(m.quality) ||
        /\b(2\.5|2\.7|4)k\b/i.test(m.quality);

    const isAudio = (m) =>
        /^(mp3|m4a|aac|ogg|opus|wav|flac)$/.test(m.format) ||
        m.mime.includes('audio') ||
        /\b(64|96|128|192|256|320)k\b/i.test(m.quality);

    return kind === 'video' ? norm.filter(isVideo) : norm.filter(isAudio);
}

function pickTitle(aio) {
    return aio?.data?.title || aio?.title || aio?.data?.name || aio?.name || '-';
}
function pickThumb(aio) {
    return aio?.data?.thumbnail || aio?.data?.image || aio?.data?.imagePreviewUrl ||
           aio?.thumbnail || aio?.image || '-';
}
function pickDuration(aio) {
    return aio?.data?.duration || aio?.duration || aio?.data?.length || '-';
}

const getCreator = () => (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';

// ============================================================
//  Module export
// ============================================================
module.exports = (app) => {

  // ============== ytmp4 (AIO) ==============
  app.get('/download/ytmp4', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, creator: getCreator(), error: 'Parameter url (link YouTube) wajib diisi' });
      if (!url.includes('youtu.be') && !url.includes('youtube.com')) {
        return res.status(400).json({ status: false, creator: getCreator(), error: 'URL harus dari YouTube' });
      }

      const downloader = new J2Downloader();
      const aio = await downloader.download(url);
      const raw = aio?.data || aio;

      let videoList = extractMedia({ data: raw }, 'video');
      if (!videoList.length) videoList = extractMedia(raw, 'video');
      if (!videoList.length && raw?.url) {
        videoList = [{ url: raw.url, quality: raw.quality || '-', format: (raw.ext || raw.type || '').toString().toLowerCase(), mime: raw.mimeType || '', size: raw.size || '-', raw }];
      }

      videoList.sort((a, b) => {
        const pa = parseInt((a.quality.match(/\d+/) || [0])[0], 10);
        const pb = parseInt((b.quality.match(/\d+/) || [0])[0], 10);
        return pb - pa;
      });

      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: pickTitle(aio),
          thumbnail: pickThumb(aio),
          duration: pickDuration(aio),
          video: videoList[0] || null,
          all_videos: videoList,
          source: 'j2download.com (AIO)'
        }
      });

    } catch (error) {
      console.error('[ytmp4 Error]', error.message);
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

  // ============== ytmp3 (AIO) ==============
  app.get('/download/ytmp3', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, creator: getCreator(), error: 'Parameter url (link YouTube) wajib diisi' });
      if (!url.includes('youtu.be') && !url.includes('youtube.com')) {
        return res.status(400).json({ status: false, creator: getCreator(), error: 'URL harus dari YouTube' });
      }

      const downloader = new J2Downloader();
      const aio = await downloader.download(url);
      const raw = aio?.data || aio;

      let audioList = extractMedia({ data: raw }, 'audio');
      if (!audioList.length) audioList = extractMedia(raw, 'audio');
      if (!audioList.length && raw?.url) {
        audioList = [{ url: raw.url, quality: raw.quality || '-', format: (raw.ext || raw.type || '').toString().toLowerCase(), mime: raw.mimeType || '', size: raw.size || '-', raw }];
      }

      audioList.sort((a, b) => {
        const pa = parseInt((a.quality.match(/\d+/) || [0])[0], 10);
        const pb = parseInt((b.quality.match(/\d+/) || [0])[0], 10);
        return pb - pa;
      });

      res.json({
        status: true,
        creator: getCreator(),
        result: {
          title: pickTitle(aio),
          thumbnail: pickThumb(aio),
          duration: pickDuration(aio),
          audio: audioList[0] || null,
          all_audios: audioList,
          source: 'j2download.com (AIO)'
        }
      });

    } catch (error) {
      console.error('[ytmp3 Error]', error.message);
      res.status(500).json({ status: false, creator: getCreator(), error: error.message });
    }
  });

 
};
