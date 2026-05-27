// softkomik.js - Scraper Softkomik.co (Manga/Manhwa/Manhua Indonesia)
const axios = require('axios');
const cheerio = require('cheerio');

const CONFIG = {
    baseUrl: 'https://softkomik.co',
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
};

// Headers untuk gambar
const imageHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://softkomik.co/',
    'Origin': 'https://softkomik.co',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

async function fetchNextData(url) {
    const response = await axios.get(url, {
        headers: { 'User-Agent': CONFIG.userAgent },
        timeout: CONFIG.timeout
    });
    const html = response.data;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match || !match[1]) throw new Error('__NEXT_DATA__ tidak ditemukan');
    return JSON.parse(match[1]);
}

function getTypeIcon(type) {
    if (type === 'manga') return '🇯🇵 Manga';
    if (type === 'manhwa') return '🇰🇷 Manhwa';
    if (type === 'manhua') return '🇨🇳 Manhua';
    return '📖 Unknown';
}

function getStatusText(status) {
    return status === 'ongoing' ? 'Ongoing 🟢' : 'Completed 🔴';
}

// ========== 1. GET IMAGES (FIXED - TANPA HEAD REQUEST) ==========
async function getChapterImages(slug, chapterNum, maxPage = 100) {
    const cleanChapter = String(parseInt(chapterNum)).padStart(3, '0');
    const domain = 'https://psy1.komik.im';
    const images = [];
    
    // Generate URL tanpa ngecek satu per satu (biar cepet)
    for (let page = 1; page <= maxPage; page++) {
        images.push({
            url: `${domain}/NodeJs/new-nodeJs/${slug}/chapter-${cleanChapter}/softkomik-${page}.webp`,
            page: page
        });
    }
    
    return {
        total: images.length,
        images: images,
        note: 'URL di-generate berdasarkan pola. Beberapa URL mungkin 404 jika chapter lebih pendek.',
        chapter_url: `${CONFIG.baseUrl}/${slug}/chapter/${cleanChapter}`
    };
}

// ========== 2. LATEST KOMIK ==========
async function getLatestKomik(limit = 20) {
    const jsonData = await fetchNextData(CONFIG.baseUrl);
    const data = jsonData.props?.pageProps?.data;
    if (!data) throw new Error('Gagal mengambil data');
    return {
        newKomik: (data.newKomik || []).slice(0, limit),
        updateKomik: (data.updateNonProject || []).slice(0, limit)
    };
}

// ========== 3. SEARCH KOMIK ==========
async function searchKomik(query, limit = 20) {
    const url = `${CONFIG.baseUrl}/?s=${encodeURIComponent(query)}`;
    const jsonData = await fetchNextData(url);
    const data = jsonData.props?.pageProps?.data;
    if (!data) return [];
    
    let results = [];
    if (data.newKomik) results.push(...data.newKomik);
    if (data.updateNonProject) results.push(...data.updateNonProject);
    
    const unique = [];
    const seen = new Set();
    for (const item of results) {
        if (item.title_slug && !seen.has(item.title_slug)) {
            seen.add(item.title_slug);
            unique.push(item);
        }
    }
    return unique.slice(0, limit);
}

// ========== 4. DETAIL KOMIK ==========
async function getDetailKomik(slug) {
    const url = `${CONFIG.baseUrl}/${slug}`;
    const jsonData = await fetchNextData(url);
    const data = jsonData.props?.pageProps?.data;
    if (!data) throw new Error('Komik tidak ditemukan');
    
    return {
        title: data.title || '-',
        title_alt: data.title_alt || '-',
        slug: data.title_slug || slug,
        type: data.type,
        type_name: getTypeIcon(data.type),
        status: data.status,
        status_text: getStatusText(data.status),
        author: data.author || '-',
        genres: data.Genre || [],
        sinopsis: data.sinopsis?.trim() || 'Tidak ada sinopsis',
        latest_chapter: data.latest_chapter || '-',
        total_chapters: data.chapter?.length || 0,
        updated_at: data.updated_at,
        cover_url: data.cover
    };
}

// ========== 5. LIST CHAPTERS ==========
async function listChapters(slug, limit = 100) {
    const url = `${CONFIG.baseUrl}/${slug}`;
    const jsonData = await fetchNextData(url);
    const data = jsonData.props?.pageProps?.data;
    if (!data?.chapter) return [];
    
    const chapters = [...data.chapter].reverse();
    return chapters.slice(0, limit).map(ch => ({
        chapter: ch.chapter,
        url: `${CONFIG.baseUrl}/${slug}/chapter/${ch.chapter}`
    }));
}

// ========== 6. REKOMENDASI ==========
async function getRekomendasi(limit = 15) {
    const jsonData = await fetchNextData(CONFIG.baseUrl);
    const data = jsonData.props?.pageProps?.data;
    if (!data) throw new Error('Gagal mengambil data');
    
    const allKomik = [...(data.newKomik || []), ...(data.updateNonProject || [])];
    const unique = [];
    const seen = new Set();
    for (const komik of allKomik) {
        if (komik.title_slug && !seen.has(komik.title_slug)) {
            seen.add(komik.title_slug);
            unique.push(komik);
        }
    }
    for (let i = unique.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
    }
    return unique.slice(0, limit);
}

// ========== EXPRESS ENDPOINT ==========
module.exports = (app) => {
    
    // 1. LATEST
    app.get('/anime/komik/latest', async (req, res) => {
        try {
            const { limit = 20 } = req.query;
            const data = await getLatestKomik(parseInt(limit));
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: {
                    new_komik: data.newKomik.map(k => ({
                        title: k.title,
                        slug: k.title_slug,
                        type: k.type,
                        type_name: getTypeIcon(k.type),
                        status: k.status,
                        status_text: getStatusText(k.status),
                        latest_chapter: k.latest_chapter,
                        cover_url: k.cover
                    })),
                    update_komik: data.updateKomik.map(k => ({
                        title: k.title,
                        slug: k.title_slug,
                        type: k.type,
                        type_name: getTypeIcon(k.type),
                        status: k.status,
                        status_text: getStatusText(k.status),
                        latest_chapter: k.latest_chapter,
                        updated_by: k.di_update_nama,
                        cover_url: k.cover
                    }))
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
        }
    });
    
    // 2. SEARCH
    app.get('/anime/komik/search', async (req, res) => {
        try {
            const { q, limit = 20 } = req.query;
            if (!q) {
                return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter q (keyword) wajib diisi' });
            }
            const results = await searchKomik(q, parseInt(limit));
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: {
                    keyword: q,
                    total: results.length,
                    data: results.map(k => ({
                        title: k.title,
                        slug: k.title_slug,
                        type: k.type,
                        type_name: getTypeIcon(k.type),
                        status: k.status,
                        status_text: getStatusText(k.status),
                        latest_chapter: k.latest_chapter,
                        cover_url: k.cover
                    }))
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
        }
    });
    
    // 3. DETAIL
    app.get('/anime/komik/detail', async (req, res) => {
        try {
            const { slug } = req.query;
            if (!slug) {
                return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter slug wajib diisi' });
            }
            const detail = await getDetailKomik(slug);
            res.json({ status: true, creator: 'AxlyDev', result: detail });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
        }
    });
    
    // 4. CHAPTERS
    app.get('/anime/komik/chapters', async (req, res) => {
        try {
            const { slug, limit = 100 } = req.query;
            if (!slug) {
                return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter slug wajib diisi' });
            }
            const chapters = await listChapters(slug, parseInt(limit));
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: {
                    slug: slug,
                    total: chapters.length,
                    chapters: chapters
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
        }
    });
    
    // 5. IMAGES (FIXED - WORKING)
    app.get('/anime/komik/images', async (req, res) => {
        try {
            const { slug, chapter, maxPage = 100 } = req.query;
            if (!slug || !chapter) {
                return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter slug dan chapter wajib diisi' });
            }
            const images = await getChapterImages(slug, chapter, parseInt(maxPage));
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: images
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
        }
    });
    
    // 6. REKOMENDASI
    app.get('/anime/komik/rekomendasi', async (req, res) => {
        try {
            const { limit = 15 } = req.query;
            const rekom = await getRekomendasi(parseInt(limit));
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: rekom.map(k => ({
                    title: k.title,
                    slug: k.title_slug,
                    type: k.type,
                    type_name: getTypeIcon(k.type),
                    status: k.status,
                    status_text: getStatusText(k.status),
                    latest_chapter: k.latest_chapter,
                    cover_url: k.cover
                }))
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
        }
    });
    
};
