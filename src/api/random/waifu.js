const axios = require('axios');

async function searchPinterest(query, limit = 10) {
    const ip = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
    const userAgent = "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36";

    const initResponse = await axios.get("https://au.pinterest.com/", {
        headers: { "x-forwarded-for": ip, "x-real-ip": ip, "User-Agent": userAgent }
    });

    let cookieString = initResponse.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';
    const csrfMatch = cookieString.match(/csrftoken=([^;]+)/);
    const csrfToken = csrfMatch ? csrfMatch[1] : "";

    const requestData = {
        options: { query: query, scope: "pins", rs: "typed", redux_normalize_feed: true },
        context: {}
    };

    const targetUrl = `https://au.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/pins/?q=${encodeURIComponent(query)}&data=${encodeURIComponent(JSON.stringify(requestData))}&_=${Date.now()}`;

    const searchResponse = await axios.get(targetUrl, {
        headers: {
            "User-Agent": userAgent,
            "X-CSRFToken": csrfToken,
            "Cookie": cookieString,
            "x-forwarded-for": ip,
            "x-real-ip": ip
        }
    });

    const results = searchResponse.data?.resource_response?.data?.results || [];
    const images = results
        .map(pin => pin.images?.orig?.url || pin.images?.["736x"]?.url)
        .filter(url => url);

    return images;
}

module.exports = (app) => {
    app.get('/random/waifu', async (req, res) => {
        try {
            const images = await searchPinterest('waifu anime girl', 20);
            if (!images.length) throw new Error('Gambar tidak ditemukan');

            const randomImage = images[Math.floor(Math.random() * images.length)];
            res.redirect(randomImage);

        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
