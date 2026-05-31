const axios = require('axios');
const cheerio = require('cheerio');

// ─── Deteksi tipe konten ──────────────────────────────────────────────────────
function detectContentType(url) {
    if (/\/(photo|photos|photo\.php)/i.test(url)) return 'photo';
    if (/\/(watch|videos?|reel|video\.php)/i.test(url)) return 'video';
    if (/fb\.watch/i.test(url)) return 'video';
    return 'auto';
}

// ─── Decode escaped string ────────────────────────────────────────────────────
function cleanUrl(str) {
    return str
        .replace(/\\u002F/gi, '/')
        .replace(/\\u0026/gi, '&')
        .replace(/\\u003D/gi, '=')
        .replace(/\\\//g, '/')
        .replace(/&amp;/g, '&')
        .replace(/\\"/g, '"');
}

// ─── Fetch HTML ───────────────────────────────────────────────────────────────
async function fetchHtml(url) {
    const attempts = [
        {
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
                'Accept-Language': 'id-ID,id;q=0.9',
                'Accept': 'text/html,application/xhtml+xml',
            }
        },
        {
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept-Language': 'id-ID,id;q=0.9',
            }
        },
        {
            url: url.replace(/www\.facebook\.com/, 'm.facebook.com'),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
                'Accept-Language': 'id-ID,id;q=0.9',
            }
        }
    ];

    for (const attempt of attempts) {
        try {
            const res = await axios.get(attempt.url, {
                headers: attempt.headers,
                timeout: 20000,
                maxRedirects: 10,
            });
            if (res.data?.length > 1000) return { html: res.data, finalUrl: attempt.url };
        } catch { continue }
    }
    return null;
}

// ─── Ekstrak foto dari HTML ────────────────────────────────────────────────────
function extractPostImages(html) {
    const candidates = [];

    // Strategi 1: Ambil dari JSON data embedded
    const jsonImagePatterns = [
        /"photo_image"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"[^}]*"width"\s*:\s*(\d+)[^}]*"height"\s*:\s*(\d+)/g,
        /"image"\s*:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"[^}]*"width"\s*:\s*(\d+)[^}]*"height"\s*:\s*(\d+)/g,
        /"uri"\s*:\s*"([^"]+)"[^,}]*,\s*"width"\s*:\s*(\d+)\s*,\s*"height"\s*:\s*(\d+)/g,
        /"src"\s*:\s*"(https:\\?\/\\?\/[^"]*fbcdn[^"]*\.(?:jpg|png|webp)[^"]*)"[^}]*"width"\s*:\s*(\d+)[^}]*"height"\s*:\s*(\d+)/g,
    ];

    for (const pattern of jsonImagePatterns) {
        let m;
        const re = new RegExp(pattern.source, pattern.flags);
        while ((m = re.exec(html)) !== null) {
            const imgUrl = cleanUrl(m[1]);
            const w = parseInt(m[2]);
            const h = parseInt(m[3]);
            if (
                imgUrl.includes('fbcdn') &&
                !imgUrl.includes('emoji') &&
                !imgUrl.includes('safe_image') &&
                !imgUrl.includes('cp0') &&
                w >= 400 && h >= 400
            ) {
                candidates.push({ url: imgUrl, area: w * h, w, h });
            }
        }
    }

    // Strategi 2: og:image
    const ogPatterns = [
        /property="og:image"\s+content="([^"]+)"/,
        /og:image[^>]*?content="([^"]+)"/,
    ];
    for (const pattern of ogPatterns) {
        const m = html.match(pattern);
        if (m) {
            const imgUrl = cleanUrl(m[1]);
            if (
                imgUrl.includes('fbcdn') &&
                !imgUrl.includes('profile') &&
                !imgUrl.includes('p50x50') &&
                !imgUrl.includes('p100x100')
            ) {
                const upgraded = upgradeResolution(imgUrl);
                candidates.push({ url: upgraded, area: 9000 * 9000, w: 9000, h: 9000 });
            }
        }
    }

    if (candidates.length === 0) return [];

    // Deduplicate
    const seen = new Set();
    const unique = candidates.filter(c => {
        const key = c.url.split('?')[0];
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    unique.sort((a, b) => b.area - a.area);
    return unique.map(c => c.url);
}

// ─── Upgrade resolusi URL fbcdn ───────────────────────────────────────────────
function upgradeResolution(url) {
    return url
        .replace(/\/p\d+x\d+\//, '/p2048x2048/')
        .replace(/_s\.jpg/, '_n.jpg')
        .replace(/_t\.jpg/, '_n.jpg')
        .replace(/_q\.jpg/, '_n.jpg');
}

// ─── Ambil video (pake savereels.io) ─────────────────────────────────────────
async function getVideo(url) {
    try {
        const { data } = await axios.post('https://savereels.io/api/ajaxSearch',
            new URLSearchParams({ q: url, w: '', v: 'v2', lang: 'id' }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 30000
            }
        );

        if (data.status !== 'ok') return null;

        const $ = cheerio.load(data.data);
        const videos = [];

        $('table.table tbody tr').each((i, el) => {
            const quality = $(el).find('.video-quality').text().trim();
            const downloadUrl = $(el).find('a.download-link-fb').attr('href');
            if (downloadUrl && quality && !quality.includes('kbps')) {
                videos.push({ quality, url: downloadUrl });
            }
        });

        return videos.length > 0 ? videos : null;
    } catch (error) {
        console.error('[Video Error]', error.message);
        return null;
    }
}

// ─── Ambil foto ──────────────────────────────────────────────────────────────
async function getPhoto(url) {
    const result = await fetchHtml(url);
    if (!result) return null;

    const images = extractPostImages(result.html);
    return images.length > 0 ? images[0] : null;
}

// ─── Handler utama ────────────────────────────────────────────────────────────
async function facebookDownloader(url) {
    const contentType = detectContentType(url);
    console.log(`[Facebook] type=${contentType} url=${url}`);

    if (contentType === 'video') {
        const videos = await getVideo(url);
        if (videos && videos.length > 0) {
            return {
                status: true,
                type: 'video',
                title: 'Facebook Video',
                thumbnail: null,
                videos: videos,
                images: []
            };
        }
        return { status: false, error: 'Gagal mengambil video' };
    }

    if (contentType === 'photo') {
        const photoUrl = await getPhoto(url);
        if (photoUrl) {
            return {
                status: true,
                type: 'photo',
                title: 'Facebook Photo',
                thumbnail: photoUrl,
                videos: [],
                images: [{ url: photoUrl, quality: 'HD' }]
            };
        }
        return { status: false, error: 'Gagal mengambil foto' };
    }

    // AUTO: coba video dulu, baru foto
    const videos = await getVideo(url);
    if (videos && videos.length > 0) {
        return {
            status: true,
            type: 'video',
            title: 'Facebook Video',
            thumbnail: null,
            videos: videos,
            images: []
        };
    }

    const photoUrl = await getPhoto(url);
    if (photoUrl) {
        return {
            status: true,
            type: 'photo',
            title: 'Facebook Photo',
            thumbnail: photoUrl,
            videos: [],
            images: [{ url: photoUrl, quality: 'HD' }]
        };
    }

    return { status: false, error: 'Tidak ada konten yang dapat diambil' };
}

// ─── Export endpoint ──────────────────────────────────────────────────────────
module.exports = (app) => {
    app.get('/download/facebook', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyChann',
                error: 'Parameter "url" diperlukan (URL Facebook video/photo)'
            });
        }

        if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyChann',
                error: 'URL harus dari Facebook (facebook.com atau fb.watch)'
            });
        }

        try {
            const result = await facebookDownloader(url);

            if (!result.status) {
                throw new Error(result.error);
            }

            res.json({
                status: true,
                creator: 'AxlyChann',
                result: {
                    type: result.type,
                    title: result.title,
                    thumbnail: result.thumbnail,
                    videos: result.videos,
                    images: result.images
                }
            });
        } catch (error) {
            console.error('[Facebook API Error]', error.message);
            res.status(500).json({
                status: false,
                creator: 'AxlyChann',
                error: error.message || 'Gagal download Facebook media'
            });
        }
    });
};
