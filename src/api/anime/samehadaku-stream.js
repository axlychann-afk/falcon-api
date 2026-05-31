const puppeteerCore = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');

const CHROMIUM_URL = 'https://github.com/Sparticuz/chromium/releases/download/v132.0.0/chromium-v132.0.0-pack.tar';

async function getBrowser() {
    if (process.env.VERCEL_ENV === 'production') {
        // Vercel production: pake @sparticuz/chromium
        const executablePath = await chromium.executablePath(CHROMIUM_URL);
        return await puppeteerCore.launch({
            args: [
                ...chromium.args,
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu'
            ],
            defaultViewport: { width: 1280, height: 720 },
            executablePath,
            headless: 'shell', // wajib pake 'shell' biar ga error [citation:1]
        });
    } else {
        // Local development: pake Chrome yang terinstall
        const puppeteer = require('puppeteer');
        return await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
}

async function getDirectMp4(episodeUrl) {
    let browser = null;
    try {
        browser = await getBrowser();
        const page = await browser.newPage();
        
        // Set user agent biar ga kena block
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
        
        // Buka halaman episode
        await page.goto(episodeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Cari iframe filedon
        const filedonUrl = await page.evaluate(() => {
            const iframe = document.querySelector('iframe[src*="filedon.co"]');
            return iframe ? iframe.src : null;
        });
        
        if (!filedonUrl) throw new Error('Link filedon tidak ditemukan');
        
        // Konversi ke embed
        let embedUrl = filedonUrl;
        if (embedUrl.includes('/view/')) {
            embedUrl = embedUrl.replace('/view/', '/embed/');
        }
        
        // Buka halaman embed
        await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Ambil MP4 URL
        const mp4Url = await page.evaluate(() => {
            const video = document.querySelector('video');
            return video ? video.src : null;
        });
        
        if (!mp4Url) throw new Error('MP4 URL tidak ditemukan');
        
        const title = await page.evaluate(() => {
            const h1 = document.querySelector('h1.entry-title');
            return h1 ? h1.innerText.trim() : 'Episode';
        });
        
        await browser.close();
        
        return {
            success: true,
            title: title,
            mp4_url: mp4Url
        };
        
    } catch (error) {
        if (browser) await browser.close();
        return { success: false, error: error.message };
    }
}

module.exports = (app) => {
    app.get('/anime/samehadaku/stream', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: 'AxlyDev',
                error: 'Parameter "url" diperlukan'
            });
        }
        
        const result = await getDirectMp4(url);
        
        if (!result.success) {
            return res.status(500).json({
                status: false,
                creator: 'AxlyDev',
                error: result.error
            });
        }
        
        res.json({
            status: true,
            creator: 'AxlyDev',
            result: {
                title: result.title,
                mp4_url: result.mp4_url
            }
        });
    });
};
