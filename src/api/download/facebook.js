const axios = require('axios');
const crypto = require('crypto');
const forge = require('node-forge');

const HITUBE_API = "https://api.hitube.io";
const HITUBE_WEB = "https://www.hitube.io";
const PUBLIC_KEY = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCAdf/EyIbLBxjGqmh7qLU6/CPCzru+75+82OSPZ+nf4BFvg88drpZ6KigNW0J8TNgxe6Yms1irCZNVDyu+RXsl4y/7c2KOHc4OGTzHB5fUMiMasFUvcEs2P70e6yA/sKHZfBLG1XPhlb84Ibs3nhD3W5e2SuC+4EuVkaqzN08LQIDAQAB";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function createSessionId() {
    const random = crypto.randomBytes(6).toString("base64url").slice(0, 10);
    return `hitube.io_${random}_${Date.now()}`;
}

function createSecureMessage() {
    const pem = `-----BEGIN PUBLIC KEY-----\n${PUBLIC_KEY.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;
    const publicKey = forge.pki.publicKeyFromPem(pem);
    const encrypted = publicKey.encrypt(Date.now().toString(), "RSAES-PKCS1-V1_5");
    return forge.util.encode64(encrypted);
}

async function facebookDownloader(url) {
    const sessionid = createSessionId();
    
    try {
        console.log(`[Facebook Download] Processing: ${url}`);
        
        const response = await axios.get(`${HITUBE_API}/st-tik-video/fb/dl`, {
            params: { url, sessionid },
            headers: {
                "x-secure-message": createSecureMessage(),
                "accept": "application/json, text/plain, */*",
                "origin": HITUBE_WEB,
                "referer": `${HITUBE_WEB}/`,
                "user-agent": UA
            },
            timeout: 30000
        });

        console.log(`[Facebook Download] Response status: ${response.status}, code: ${response.data?.code}`);

        if (response.status !== 200 || response.data?.code !== 200) {
            throw new Error(response.data?.msg || 'Gagal mengambil data dari hitube.io');
        }

        const list = response.data?.result?.fbBos || [];
        if (list.length === 0) {
            throw new Error('Tidak ada media yang ditemukan');
        }

        const videos = [];
        const images = [];

        for (const item of list) {
            const mediaUrl = item.url ? `${HITUBE_API}/st-tik-video/token/${encodeURIComponent(item.url)}?sessionid=${sessionid}&wh=www.hitube.io` : null;
            
            if (!mediaUrl) continue;

            if (item.type === 'video') {
                videos.push({
                    quality: item.tag || 'SD',
                    url: mediaUrl,
                    size: item.size || null
                });
            } else if (item.type === 'photo') {
                images.push({
                    url: mediaUrl,
                    size: item.size || null
                });
            }
        }

        // Ambil thumbnail kalo ada
        let thumbnail = null;
        if (response.data?.result?.fbCover) {
            thumbnail = `${HITUBE_API}/st-tik-video/token/${encodeURIComponent(response.data.result.fbCover)}?sessionid=${sessionid}&wh=www.hitube.io`;
        }

        return {
            status: true,
            title: response.data?.result?.title || "Facebook Media",
            thumbnail: thumbnail,
            videos: videos,
            images: images,
            audio: null
        };

    } catch (error) {
        console.error(`[Facebook Download Error] ${error.message}`);
        return {
            status: false,
            error: error.message
        };
    }
}

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

        // Validasi URL Facebook
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
                    title: result.title,
                    thumbnail: result.thumbnail,
                    videos: result.videos,
                    images: result.images,
                    audio: result.audio
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                creator: 'AxlyChann',
                error: error.message || 'Gagal download Facebook media'
            });
        }
    });

    // Support POST method juga
    app.post('/download/facebook', async (req, res) => {
        const { url } = req.body;

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
                    title: result.title,
                    thumbnail: result.thumbnail,
                    videos: result.videos,
                    images: result.images,
                    audio: result.audio
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                creator: 'AxlyChann',
                error: error.message || 'Gagal download Facebook media'
            });
        }
    });
};
