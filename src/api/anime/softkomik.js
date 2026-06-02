// softkomik.js - Scraper Softkomik.co (pake judul, gak perlu slug)
const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const PDFDocument = require('pdfkit');

const CONFIG = {
    baseUrl: 'https://softkomik.co',
    apiUrl: 'https://v2.softdevices.my.id',
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
};

const getCreator = () => {
    return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

// ========== HELPER FUNCTIONS ==========
function getTypeIcon(type) {
    if (type === 'manga') return '🇯🇵 Manga';
    if (type === 'manhwa') return '🇰🇷 Manhwa';
    if (type === 'manhua') return '🇨🇳 Manhua';
    return '📖 Unknown';
}

function getStatusText(status) {
    return status === 'ongoing' ? 'Ongoing 🟢' : 'Completed 🔴';
}

// ========== SEARCH KOMIK ==========
async function searchKomik(query, limit = 20) {
    try {
        const url = `${CONFIG.apiUrl}/search?name=${encodeURIComponent(query)}`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': CONFIG.userAgent }
        });
        return response.data?.data || [];
    } catch (error) {
        console.error('Search error:', error.message);
        return [];
    }
}

// ========== GET DETAIL ==========
async function getKomikByTitle(title) {
    const searchResults = await searchKomik(title, 1);
    if (searchResults.length === 0) {
        throw new Error(`Komik "${title}" tidak ditemukan`);
    }
    
    const slug = searchResults[0].slug;
    const url = `${CONFIG.baseUrl}/${slug}`;
    const response = await axios.get(url, {
        headers: { 'User-Agent': CONFIG.userAgent }
    });
    
    const html = response.data;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match) throw new Error('Data tidak ditemukan');
    
    const jsonData = JSON.parse(match[1]);
    const data = jsonData.props?.pageProps?.data;
    if (!data) throw new Error('Komik tidak ditemukan');
    
    return {
        title: data.title || '-',
        title_alt: data.title_alt || '-',
        slug: slug,
        type: data.type,
        type_name: getTypeIcon(data.type),
        status: data.status,
        status_text: getStatusText(data.status),
        author: data.author || '-',
        genres: data.Genre || [],
        sinopsis: data.sinopsis?.trim() || 'Tidak ada sinopsis',
        latest_chapter: data.latest_chapter || '-',
        total_chapters: data.chapter?.length || 0,
        cover_url: data.cover
    };
}

// ========== GET CHAPTERS ==========
async function getChaptersByTitle(title, limit = 100) {
    const searchResults = await searchKomik(title, 1);
    if (searchResults.length === 0) {
        throw new Error(`Komik "${title}" tidak ditemukan`);
    }
    
    const slug = searchResults[0].slug;
    const url = `${CONFIG.baseUrl}/${slug}`;
    const response = await axios.get(url, {
        headers: { 'User-Agent': CONFIG.userAgent }
    });
    
    const html = response.data;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match) throw new Error('Data tidak ditemukan');
    
    const jsonData = JSON.parse(match[1]);
    const data = jsonData.props?.pageProps?.data;
    if (!data?.chapter) return [];
    
    const chapters = [...data.chapter].reverse();
    return chapters.slice(0, limit).map(ch => ({
        chapter: ch.chapter,
        url: `${CONFIG.baseUrl}/${slug}/chapter/${ch.chapter}`
    }));
}

// ========== GET GAMBAR DARI HALAMAN CHAPTER (SCRAPE LANGSUNG) ==========
async function scrapeImagesFromChapter(title, chapterNum) {
    const searchResults = await searchKomik(title, 1);
    if (searchResults.length === 0) {
        throw new Error(`Komik "${title}" tidak ditemukan`);
    }
    
    const slug = searchResults[0].slug;
    const chapterUrl = `${CONFIG.baseUrl}/${slug}/chapter/${chapterNum}`;
    
    console.log(`[Scrape] Mengambil gambar dari: ${chapterUrl}`);
    
    const response = await axios.get(chapterUrl, {
        headers: { 'User-Agent': CONFIG.userAgent }
    });
    
    const $ = cheerio.load(response.data);
    const images = [];
    
    $('img').each((i, el) => {
        let src = $(el).attr('src');
        if (src && src.includes('softkomik.org')) {
            if (src.startsWith('//')) src = 'https:' + src;
            images.push(src);
        }
    });
    
    if (images.length === 0) {
        throw new Error('Tidak ada gambar ditemukan');
    }
    
    console.log(`[Scrape] Ditemukan ${images.length} gambar`);
    return images;
}

// ========== UPLOAD KE UPLOAD.EE ==========
async function uploadToUploadEe(fileBuffer, filename) {
    const form = new FormData();
    form.append('upfile_0', fileBuffer, { filename: filename });
    form.append('email', '');
    form.append('category', 'cat_file');

    const response = await axios.post('https://www.upload.ee/cgi-bin/ubr_upload.pl', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0'
        },
        timeout: 60000
    });

    const html = response.data;
    const match = html.match(/https:\/\/www\.upload\.ee\/files\/\d+\/[^"'\s]+/);
    if (match) return match[0];
    
    const match2 = html.match(/href="(https:\/\/www\.upload\.ee\/files\/\d+\/[^"]+)"/);
    if (match2) return match2[1];
    
    throw new Error('Upload gagal');
}

// ========== BUAT PDF DARI GAMBAR ==========
async function createPDFFromImages(imageUrls, title, chapter) {
    const chunks = [];
    const doc = new PDFDocument({ autoFirstPage: false });
    
    doc.on('data', chunk => chunks.push(chunk));
    
    const pdfPromise = new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
    
    let pageCount = 0;
    
    for (let i = 0; i < imageUrls.length; i++) {
        try {
            const imgResponse = await axios.get(imageUrls[i], {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            const imgBuffer = Buffer.from(imgResponse.data);
            const imgBase64 = `data:image/webp;base64,${imgBuffer.toString('base64')}`;
            
            doc.addPage();
            doc.image(imgBase64, 0, 0, {
                width: doc.page.width,
                height: doc.page.height,
                fit: [doc.page.width, doc.page.height]
            });
            pageCount++;
            
        } catch (err) {
            console.error(`Halaman ${i + 1} gagal:`, err.message);
        }
    }
    
    if (pageCount === 0) {
        throw new Error('Tidak ada gambar yang berhasil diunduh');
    }
    
    doc.end();
    return await pdfPromise;
}

// ========== LATEST ==========
async function getLatestKomik(limit = 20) {
    const response = await axios.get(CONFIG.baseUrl, {
        headers: { 'User-Agent': CONFIG.userAgent }
    });
    const html = response.data;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match) throw new Error('__NEXT_DATA__ tidak ditemukan');
    
    const jsonData = JSON.parse(match[1]);
    const data = jsonData.props?.pageProps?.data;
    if (!data) throw new Error('Gagal mengambil data');
    
    return {
        newKomik: (data.newKomik || []).slice(0, limit),
        updateKomik: (data.updateNonProject || []).slice(0, limit)
    };
}

// ========== REKOMENDASI ==========
async function getRekomendasi(limit = 15) {
    const response = await axios.get(CONFIG.baseUrl, {
        headers: { 'User-Agent': CONFIG.userAgent }
    });
    const html = response.data;
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match) throw new Error('__NEXT_DATA__ tidak ditemukan');
    
    const jsonData = JSON.parse(match[1]);
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
    // Acak
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
                creator: getCreator(),
                result: {
                    new_komik: data.newKomik.map(k => ({
                        title: k.title,
                        type: k.type,
                        type_name: getTypeIcon(k.type),
                        status: k.status,
                        status_text: getStatusText(k.status),
                        latest_chapter: k.latest_chapter,
                        cover_url: k.cover
                    })),
                    update_komik: data.updateKomik.map(k => ({
                        title: k.title,
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
            res.status(500).json({ status: false, creator: getCreator(), error: error.message });
        }
    });
    
    // 2. SEARCH & DETAIL
    app.get('/anime/komik/search', async (req, res) => {
        try {
            const { q } = req.query;
            if (!q) {
                return res.status(400).json({ status: false, creator: getCreator(), error: 'Parameter q wajib diisi' });
            }
            const detail = await getKomikByTitle(q);
            res.json({ status: true, creator: getCreator(), result: detail });
        } catch (error) {
            res.status(500).json({ status: false, creator: getCreator(), error: error.message });
        }
    });
    
    // 3. CHAPTERS
    app.get('/anime/komik/chapters', async (req, res) => {
        try {
            const { title, limit = 100 } = req.query;
            if (!title) {
                return res.status(400).json({ status: false, creator: getCreator(), error: 'Parameter title wajib diisi' });
            }
            const chapters = await getChaptersByTitle(title, parseInt(limit));
            res.json({ status: true, creator: getCreator(), result: { title, total: chapters.length, chapters } });
        } catch (error) {
            res.status(500).json({ status: false, creator: getCreator(), error: error.message });
        }
    });
    
    // 4. IMAGES -> PDF LINK (INI YANG KAMU MAU)
    app.get('/anime/komik/images', async (req, res) => {
        const { title, chapter } = req.query;
        
        if (!title || !chapter) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "title" dan "chapter" wajib diisi'
            });
        }
        
        try {
            console.log(`[PDF] Membuat PDF untuk: ${title} chapter ${chapter}`);
            
            // 1. Scrape gambar dari halaman chapter
            const imageUrls = await scrapeImagesFromChapter(title, chapter);
            
            // 2. Buat PDF dari gambar
            const pdfBuffer = await createPDFFromImages(imageUrls, title, chapter);
            
            // 3. Upload ke upload.ee
            const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
            const filename = `${safeTitle}_chapter_${chapter}.pdf`;
            const pdfUrl = await uploadToUploadEe(pdfBuffer, filename);
            
            // 4. Return link PDF
            res.json({
                status: true,
                creator: getCreator(),
                result: {
                    title: title,
                    chapter: chapter,
                    total_pages: imageUrls.length,
                    pdf_url: pdfUrl,
                    note: 'Link PDF aktif selama 30 hari (Upload.ee)'
                }
            });
            
        } catch (error) {
            console.error('[PDF Error]', error.message);
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
    
    // 5. REKOMENDASI
    app.get('/anime/komik/rekomendasi', async (req, res) => {
        try {
            const { limit = 15 } = req.query;
            const rekom = await getRekomendasi(parseInt(limit));
            res.json({
                status: true,
                creator: getCreator(),
                result: rekom.map(k => ({
                    title: k.title,
                    type: k.type,
                    type_name: getTypeIcon(k.type),
                    status: k.status,
                    status_text: getStatusText(k.status),
                    latest_chapter: k.latest_chapter,
                    cover_url: k.cover
                }))
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: getCreator(), error: error.message });
        }
    });
    
};
