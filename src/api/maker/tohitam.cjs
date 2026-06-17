const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

const AGENT = 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36';
const SALT = 'hackers_become_a_little_stinkier_every_time_they_hack';

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const reverse = (s) => s.split('').reverse().join('');
const generateRandomIP = () => Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 254)).join('.');

const getMime = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp'
    };
    return mimes[ext] || 'image/jpeg';
};

function genKEY() {
    const r = String(Math.floor(Math.random() * 1e11));
    const h1 = reverse(md5(AGENT + r + SALT));
    const h2 = reverse(md5(AGENT + h1));
    const h3 = reverse(md5(AGENT + h2));
    return `tryit-${r}-${h3}`;
}

async function editImage(fileBuffer, filename, prompt) {
    let lastError = 'request failed';

    for (let i = 0; i < 6; i++) {
        try {
            const form = new FormData();
            form.append('image', fileBuffer, { filename: filename, contentType: getMime(filename) });
            form.append('text', prompt);
            form.append('image_generator_version', 'standard');

            const response = await axios.post('https://api.deepai.org/api/image-editor', form, {
                headers: {
                    ...form.getHeaders(),
                    'accept': '*/*',
                    'origin': 'https://deepai.org',
                    'referer': 'https://deepai.org/',
                    'user-agent': AGENT,
                    'api-key': genKEY(),
                    'x-forwarded-for': generateRandomIP()
                },
                timeout: 60000
            });

            if (response.data?.output_url) {
                const imageResponse = await axios.get(response.data.output_url, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                return Buffer.from(imageResponse.data);
            }

            lastError = response.data?.status || `http ${response.status}`;
        } catch (error) {
            lastError = error.message;
        }
    }

    throw new Error(lastError);
}

const getCreator = () => {
    return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

module.exports = (app) => {
    
    // ==================== GET - LANGSUNG RETURN GAMBAR ====================
    app.get('/maker/tohitam', async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "url" diperlukan (URL gambar)'
            });
        }
        
        try {
            const prompt = "make the character's skin black, dark skin, black complexion, change skin tone to black";
            
            console.log('[ToHitam] Downloading image from:', url);
            
            // Download gambar asli
            const imageResponse = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': AGENT },
                timeout: 30000
            });
            
            const filename = url.split('/').pop() || 'image.jpg';
            
            // Edit gambar dengan AI
            const resultBuffer = await editImage(Buffer.from(imageResponse.data), filename, prompt);
            
            // Langsung return gambar (bukan JSON)
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Disposition', `inline; filename="tohitam_${Date.now()}.jpg"`);
            res.send(resultBuffer);
            
        } catch (error) {
            console.error('[ToHitam Error]', error.message);
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
};
