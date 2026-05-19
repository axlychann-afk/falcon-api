const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");

const BASE = "https://spotmate.online";
const UA = "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/137 Mobile Safari/537.36";

const jar = new CookieJar();
const client = wrapper(
    axios.create({
        jar,
        withCredentials: true,
        headers: {
            "user-agent": UA,
            accept: "*/*"
        }
    })
);

async function getXsrf() {
    await client.get(`${BASE}/en1`);
    const cookies = await jar.getCookies(BASE);
    const xsrf = cookies.find(c => c.key === "XSRF-TOKEN");
    if (!xsrf) throw new Error("XSRF-TOKEN not found");
    return decodeURIComponent(xsrf.value);
}

async function convertSpotify(url) {
    const xsrf = await getXsrf();

    await client.post(
        `${BASE}/getTrackData`,
        { spotify_url: url },
        {
            headers: {
                "content-type": "application/json",
                "x-xsrf-token": xsrf,
                origin: BASE,
                referer: `${BASE}/en1`
            }
        }
    );

    const convertRes = await client.post(
        `${BASE}/convert`,
        { urls: url },
        {
            headers: {
                "content-type": "application/json",
                "x-xsrf-token": xsrf,
                origin: BASE,
                referer: `${BASE}/en1`
            }
        }
    );

    // Ambil data dari response convert
    const d = convertRes.data;
    
    // Ambil metadata dari response pertama (trackRes) sebenernya gak kepake, 
    // tapi kita pake data dari convertRes aja udah cukup
    return {
        title: d.title || "Unknown",
        artist: d.artist || "Unknown",
        download_url: d.url,
        thumbnail: d.thumbnail || null
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

        try {
            const result = await convertSpotify(url);
            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: result
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.response?.data || error.message || 'Gagal download lagu'
            });
        }
    });
};
