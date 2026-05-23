const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToLitterbox(fileBuffer, filename) {
    const form = new FormData();
    form.append('file', fileBuffer, { filename: filename });
    form.append('expiration', '1 hour'); // 1 hour, 1 day, 3 days, 1 week, 1 month

    const response = await axios.post('https://litterbox.catbox.moe/resources.php', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 60000
    });

    const html = response.data;
    const urlMatch = html.match(/https:\/\/litterbox\.catbox\.moe\/[a-zA-Z0-9]+/);
    if (urlMatch) {
        return urlMatch[0];
    }
    throw new Error('Upload gagal: ' + html);
}

module.exports = (app) => {
    // POST upload file
    app.post('/tools/upload-catbox', upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ status: false, error: 'Tidak ada file' });
        }

        try {
            const url = await uploadToLitterbox(req.file.buffer, req.file.originalname);
            res.json({ status: true, creator: 'AxlyChann', result: { url: url, original_name: req.file.originalname, size: req.file.size } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message });
        }
    });

    // GET dari URL
    app.get('/tools/upload-catbox', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, error: 'Parameter "url" diperlukan' });

        try {
            const imageRes = await axios.get(url, { responseType: 'arraybuffer' });
            const resultUrl = await uploadToLitterbox(Buffer.from(imageRes.data), `upload_${Date.now()}.jpg`);
            res.json({ status: true, creator: 'AxlyChann', result: { original_url: url, uploaded_url: resultUrl } });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
