// softkomik.js - Scraper Softkomik.co (Manga/Manhwa/Manhua Indonesia)
const axios = require('axios');
const crypto = require('crypto');

const CONFIG = {
    baseUrl: 'https://softkomik.co',
    apiUrl: 'https://v2.softdevices.my.id',
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
};

const getHeaders = () => ({
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'origin': CONFIG.baseUrl,
    'referer': CONFIG.baseUrl,
    'user-agent': CONFIG.userAgent,
    'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"'
});

// Ekstrak data dari __NEXT_DATA__
async function fetchPageData(url) {
    const response = await axios.get(url, {
        headers: {
            'user-agent': CONFIG.userAgent,
            'accept': 'text/html,application/xhtml+xml',
            'accept-language': 'id-ID,id;q=0.9'
        },
        timeout: CONFIG.timeout
    });
    
    const html = response.data;
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    
    if (nextDataMatch && nextDataMatch[1]) {
        return JSON.parse(nextDataMatch[1]);
    }
    return null;
}

// Format type icon
function getTypeIcon(type) {
    if (type === 'manga') return '🇯🇵 Manga';
    if (type === 'manhwa') return '🇰🇷 Manhwa';
    if (type === 'manhua') return '🇨🇳 Manhua';
    return '📖 Unknown';
}

// Format status
function getStatusText(status) {
    return status === 'ongoing' ? 'Ongoing 🟢' : 'Completed 🔴';
}

// ========== 1. LATEST KOMIK ==========
async function getLatestKomik(limit = 20) {
    const jsonData = await fetchPageData(CONFIG.baseUrl);
    
    if (!jsonData?.props?.pageProps?.data) {
        throw new Error('Gagal mengambil data');
    }
    
    const komikData = jsonData.props.pageProps.data;
    const newKomik = (komikData.newKomik || []).slice(0, limit);
    const updateKomik = (komikData.updateNonProject || []).slice(0, limit);
    
    return { newKomik, updateKomik };
}

// ========== 2. SEARCH KOMIK ==========
async function searchKomik(query, limit = 20) {
    const url = `${CONFIG.baseUrl}/?s=${encodeURIComponent(query)}`;
    const jsonData = await fetchPageData(url);
    
    if (!jsonData?.props?.pageProps?.data) {
        return [];
    }
    
    const results = jsonData.props.pageProps.data.slice(0, limit);
    return results;
}

// ========== 3. DETAIL KOMIK ==========
async function getDetailKomik(slug) {
    const url = `${CONFIG.baseUrl}/${slug}`;
    const jsonData = await fetchPageData(url);
    
    if (!jsonData?.props?.pageProps?.data) {
        throw new Error('Komik tidak ditemukan');
    }
    
    const data = jsonData.props.pageProps.data;
    
    return {
        title: data.title,
        title_alt: data.title_alt || '-',
        slug: data.title_slug,
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
        rating: data.rating?.value ? {
            value: data.rating.value,
            member: data.rating.member
        } : null,
        cover_url: data.cover
    };
}

// ========== 4. DAFTAR CHAPTER ==========
async function listChapters(slug, limit = 9999) {
    const apiUrl = `${CONFIG.apiUrl}/komik/${slug}/chapter?limit=${limit}`;
    
    const response = await axios.get(apiUrl, {
        headers: getHeaders(),
        timeout: CONFIG.timeout
    });
    
    const data = response.data;
    
    if (!data?.chapter || data.chapter.length === 0) {
        return [];
    }
    
    // Reverse biar dari chapter terbaru
    const chapters = [...data.chapter].reverse();
    
    return chapters.map(ch => ({
        chapter: ch.chapter,
        url: `${CONFIG.baseUrl}/${slug}/chapter/${ch.chapter}`
    }));
}

// ========== 5. DAPATKAN GAMBAR CHAPTER ==========
async function getChapterImages(slug, chapterNum) {
    const apiUrl = `${CONFIG.apiUrl}/komik/${slug}/chapter/${chapterNum}/imgs`;
    
    const response = await axios.get(apiUrl, {
        headers: getHeaders(),
        timeout: CONFIG.timeout
    });
    
    const data = response.data;
    
    if (!data?.imageSrc || data.imageSrc.length === 0) {
        throw new Error('Gambar tidak ditemukan');
    }
    
    const images = data.imageSrc.map(img => ({
        url: `https://v2.softdevices.my.id/${img}`,
        page: parseInt(img.match(/(\d+)\.webp$/)?.[1]) || 0
    }));
    
    return {
        total: images.length,
        images: images
    };
}

// ========== 6. REKOMENDASI ==========
async function getRekomendasi(limit = 15) {
    const jsonData = await fetchPageData(CONFIG.baseUrl);
    
    if (!jsonData?.props?.pageProps?.data) {
        throw new Error('Gagal mengambil data');
    }
    
    const komikData = jsonData.props.pageProps.data;
    const allKomik = [...(komikData.newKomik || []), ...(komikData.updateNonProject || [])];
    
    // Hapus duplikat berdasarkan slug
    const unique = [];
    const seen = new Set();
    for (const komik of allKomik) {
        if (komik.title_slug && !seen.has(komik.title_slug)) {
            seen.add(komik.title_slug);
            unique.push(komik);
        }
    }
    
    // Acak
    for (let i = unique.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unique[i], unique[j]] = [unique[j], unique[i]];
    }
    
    return unique.slice(0, limit);
}

// ========== EXPRESS ENDPOINT ==========
module.exports = (app) => {
    
    // 1. GET /anime/komik/latest?limit=20
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
                        updated_at: k.updated_at,
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
                        updated_at: k.updated_at,
                        updated_by: k.di_update_nama,
                        cover_url: k.cover
                    }))
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
        }
    });
    
    // 2. GET /anime/komik/search?q=keyword&limit=20
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
    
    // 3. GET /anime/komik/detail?slug=xxx
    app.get('/anime/komik/detail', async (req, res) => {
        try {
            const { slug } = req.query;
            
            if (!slug) {
                return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter slug wajib diisi' });
            }
            
            const detail = await getDetailKomik(slug);
            
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: detail
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
        }
    });
    
    // 4. GET /anime/komik/chapters?slug=xxx&limit=100
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
    
    // 5. GET /anime/komik/images?slug=xxx&chapter=001
    app.get('/anime/komik/images', async (req, res) => {
        try {
            const { slug, chapter } = req.query;
            
            if (!slug || !chapter) {
                return res.status(400).json({ status: false, creator: 'AxlyDev', error: 'Parameter slug dan chapter wajib diisi' });
            }
            
            const images = await getChapterImages(slug, chapter);
            
            res.json({
                status: true,
                creator: 'AxlyDev',
                result: {
                    slug: slug,
                    chapter: chapter,
                    total: images.total,
                    images: images.images
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: 'AxlyDev', error: error.message });
        }
    });
    
    // 6. GET /anime/komik/rekomendasi?limit=15
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
