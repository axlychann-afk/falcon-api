const https = require('https');

let cachedCookie = null;
let cookieExpiry = 0;

function request(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
                'X-Requested-With': 'XMLHttpRequest',
                ...headers
            },
            timeout: 15000
        };

        const req = https.get(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function getCookie() {
    if (cachedCookie && Date.now() < cookieExpiry) return cachedCookie;

    const { headers } = await request('https://www.pinterest.com/', { 'Accept': 'text/html' });
    const cookies = headers['set-cookie'] || [];
    const csrf = cookies.find(c => c.startsWith('csrftoken='));
    const sess = cookies.find(c => c.startsWith('_pinterest_sess='));

    if (csrf && sess) {
        cachedCookie = `${csrf.split(';')[0]}; ${sess.split(';')[0]}; _auth=1`;
        cookieExpiry = Date.now() + 10 * 60 * 1000;
        return cachedCookie;
    }
    return null;
}

async function searchVideo(keyword, limit = 10) {
    const cookie = await getCookie();
    if (!cookie) return [];

    const sourceUrl = `/search/pins/?q=${encodeURIComponent(keyword)}`;
    const data = encodeURIComponent(JSON.stringify({
        options: { query: keyword, page_size: Math.min(limit * 2, 50), rs: 'typed', redux_normalize_feed: true },
        context: {}
    }));

    const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodeURIComponent(sourceUrl)}&data=${data}&_=${Date.now()}`;

    const { status, body } = await request(url, {
        'Cookie': cookie,
        'Referer': `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`,
        'X-Pinterest-PWS-Handler': 'www/search/[scope].js'
    });

    if (status !== 200) return [];

    const json = JSON.parse(body);
    const results = json?.resource_response?.data?.results || [];
    
    // Filter manual: cuma ambil yang punya video
    const videos = results.filter(p => p.videos?.video_list && Object.keys(p.videos.video_list).length > 0);

    return videos.slice(0, limit).map(p => {
        const vlist = p.videos?.video_list || {};
        const quality = Object.keys(vlist).find(k => k.includes('720') || k.includes('480')) || Object.keys(vlist)[0];
        const video = vlist[quality] || {};

        return {
            id: p.id,
            title: p.title || p.grid_title || '(no title)',
            video_url: video.url || null,
            duration: video.duration ? `${(video.duration / 1000).toFixed(1)}s` : null,
            thumbnail: p.images?.['736x']?.url || p.images?.orig?.url || null,
            link: `https://www.pinterest.com/pin/${p.id}/`
        };
    });
}

module.exports = (app) => {
    app.get('/search/pinterest/video', async (req, res) => {
        const { q, limit = 10 } = req.query;
        if (!q) return res.status(400).json({ status: false, error: 'Parameter "q" diperlukan' });

        try {
            const results = await searchVideo(q, Math.min(parseInt(limit) || 10, 30));
            res.json({ status: true, creator: 'AxlyChann', result: { query: q, total: results.length, videos: results } });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
