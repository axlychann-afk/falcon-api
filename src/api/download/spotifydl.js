const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const BASE = "https://spotmate.online";
const UA = "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/137 Mobile Safari/537.36";

// Setup cookie jar
const jar = new CookieJar();
const client = wrapper(
    axios.create({
        jar,
        withCredentials: true,
        timeout: 30000,
        headers: {
            "User-Agent": UA,
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive"
        }
    })
);

async function getXsrf() {
    try {
        // Hit halaman utama dulu
        const response = await client.get(`${BASE}/en1`, {
            headers: {
                'User-Agent': UA,
                'Referer': 'https://www.google.com/'
            }
        });
        
        // Ambil cookie XSRF-TOKEN
        const cookies = await jar.getCookies(BASE);
        const xsrfCookie = cookies.find(c => c.key === "XSRF-TOKEN");
        
        if (!xsrfCookie) {
            // Coba dari response headers
            const setCookie = response.headers['set-cookie'];
            if (setCookie) {
                const xsrfMatch = setCookie.join('').match(/XSRF-TOKEN=([^;]+)/);
                if (xsrfMatch) {
                    return decodeURIComponent(xsrfMatch[1]);
                }
            }
            throw new Error("XSRF-TOKEN tidak ditemukan");
        }
        
        return decodeURIComponent(xsrfCookie.value);
    } catch (error) {
        throw new Error(`Gagal mengambil XSRF token: ${error.message}`);
    }
}

async function convertSpotify(url) {
    const xsrf = await getXsrf();
    
    // Request pertama: getTrackData
    await client.post(
        `${BASE}/getTrackData`,
        { spotify_url: url },
        {
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": xsrf,
                "Origin": BASE,
                "Referer": `${BASE}/en1`
            }
        }
    );
    
    // Request kedua: convert
    const convertRes = await client.post(
        `${BASE}/convert`,
        { urls: url },
        {
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": xsrf,
                "Origin": BASE,
                "Referer": `${BASE}/en1`
            }
        }
    );
    
    const data = convertRes.data;
    
    if (!data || !data.url) {
        throw new Error('Gagal mendapatkan download URL');
    }
    
    return {
        title: data.title || 'Unknown',
        artist: data.artist || 'Unknown',
        download_url: data.url,
        thumbnail: data.thumbnail || null
    };
}

module.exports = (app) => {
    app.get('/download/spotify', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL Spotify)'
            });
        }
        
        // Validasi URL
        if (!url.includes('spotify.com/track/')) {
            return res.status(400).json({
                status: false,
                error: 'URL harus berupa link track Spotify'
            });
        }
        
        try {
            const result = await convertSpotify(url);
            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: result
            });
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal download lagu'
            });
        }
    });
};
