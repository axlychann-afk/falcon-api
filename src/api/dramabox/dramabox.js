const axios = require('axios');

const getCreator = () => {
    return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

const buildId = "dramabox_prod_20260523";

// ==================== SEARCH ====================
async function searchDrama(query) {
    try {
        const { data } = await axios.get(`https://www.dramabox.com/_next/data/${buildId}/in/search.json`, {
            params: { searchValue: query },
            headers: {
                "x-nextjs-data": "1",
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
                "Referer": `https://www.dramabox.com/in/search?searchValue=${encodeURIComponent(query)}`
            },
            timeout: 15000
        });

        const books = data?.pageProps?.bookList || [];
        return books.map(v => ({
            id: v.bookId,
            title: v.bookName,
            titleEn: v.bookNameEn,
            cover: v.coverWap,
            description: v.introduction,
            chapters: v.totalChapterNum,
            freeChapters: v.freeChapterNum,
            views: v.clickNum,
            rating: v.commentScore,
            url: `https://www.dramabox.com/in/drama/${v.bookId}/${v.bookNameEn}`
        }));
    } catch (err) {
        console.error('[Search Error]', err.message);
        return [];
    }
}

// ==================== DETAIL ====================
async function getDetail(bookId, slug) {
    try {
        const { data } = await axios.get(`https://www.dramabox.com/_next/data/${buildId}/in/drama/${bookId}/${slug}.json`, {
            params: { bookId, bookNameEn: slug },
            headers: {
                "x-nextjs-data": "1",
                "referer": `https://www.dramabox.com/in/drama/${bookId}/${slug}`,
                "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36"
            },
            timeout: 15000
        });

        const book = data.pageProps.bookInfo;
        return {
            id: book.bookId,
            title: book.bookName,
            slug: book.bookNameEn,
            cover: book.cover,
            views: book.viewCount,
            followers: book.followCount,
            chapters: book.chapterCount,
            language: book.language,
            labels: book.labels,
            tags: book.tags,
            performers: book.performerList?.map(v => ({
                id: v.performerId,
                name: v.performerName,
                avatar: v.performerAvatar
            })) || [],
            description: book.introduction,
            episodes: data.pageProps.chapterList.map(ch => ({
                id: ch.id,
                episode: ch.index + 1,
                title: ch.name,
                unlock: ch.unlock,
                duration: ch.duration,
                cover: ch.cover,
                mp4: ch.mp4 || null,
                m3u8: ch.m3u8Url || null
            }))
        };
    } catch (err) {
        console.error('[Detail Error]', err.message);
        return null;
    }
}

// ==================== GET STREAM URL ====================
async function getStreamUrl(bookId, episodeIndex) {
    try {
        const { data } = await axios.get(`https://www.dramabox.com/_next/data/${buildId}/in/drama/${bookId}/episode/${episodeIndex + 1}.json`, {
            headers: {
                "x-nextjs-data": "1",
                "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36"
            },
            timeout: 15000
        });
        
        return data.pageProps?.mp4 || data.pageProps?.m3u8Url || null;
    } catch (err) {
        console.error('[Stream Error]', err.message);
        return null;
    }
}

// ==================== ENDPOINTS ====================
module.exports = (app) => {
    
    // 1. SEARCH
    app.get('/dramabox/search', async (req, res) => {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "q" diperlukan'
            });
        }
        
        try {
            const results = await searchDrama(q);
            res.json({
                status: true,
                creator: getCreator(),
                total: results.length,
                results: results
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: getCreator(), error: error.message });
        }
    });
    
    // 2. DETAIL
    app.get('/dramabox/detail', async (req, res) => {
        const { id, slug } = req.query;
        
        if (!id || !slug) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "id" dan "slug" diperlukan'
            });
        }
        
        try {
            const detail = await getDetail(id, slug);
            if (!detail) {
                return res.status(404).json({ status: false, creator: getCreator(), error: 'Drama tidak ditemukan' });
            }
            res.json({
                status: true,
                creator: getCreator(),
                result: detail
            });
        } catch (error) {
            res.status(500).json({ status: false, creator: getCreator(), error: error.message });
        }
    });
    
    // 3. VIDEO LANGSUNG (RETURN MP4)
    app.get('/dramabox/video', async (req, res) => {
        const { id, episode } = req.query;
        
        if (!id || !episode) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "id" dan "episode" diperlukan'
            });
        }
        
        try {
            const videoUrl = await getStreamUrl(id, parseInt(episode) - 1);
            
            if (!videoUrl) {
                return res.status(404).json({
                    status: false,
                    creator: getCreator(),
                    error: 'Link video tidak ditemukan'
                });
            }
            
            // Download dan pipe video
            const videoResponse = await axios.get(videoUrl, {
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.dramabox.com/'
                },
                timeout: 60000
            });
            
            res.setHeader('Content-Type', videoResponse.headers['content-type'] || 'video/mp4');
            res.setHeader('Content-Disposition', `inline; filename="drama_${id}_ep${episode}.mp4"`);
            videoResponse.data.pipe(res);
            
        } catch (error) {
            console.error('[Video Error]', error.message);
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
};
