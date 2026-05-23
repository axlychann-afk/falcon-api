const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToPixhost(fileBuffer, filename) {
    const form = new FormData();
    form.append('file', fileBuffer, { filename: filename });
    form.append('content_type', '1'); // 1 = gambar biasa

    const response = await axios.post('https://api.pixhost.to/api/images', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Origin': 'https://pixhost.to',
            'Referer': 'https://pixhost.to/'
        },
        timeout: 30000
    });

    if (response.data?.success === true && response.data?.image?.url) {
        return response.data.image.url;
    }
    throw new Error('Upload gagal: ' + JSON.stringify(response.data));
}

module.exports = (app) => {
    // POST upload file
    app.post('/tools/upload-catbox', upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ status: false, error: 'Tidak ada file' });
        }

        try {
            const url = await uploadToPixhost(req.file.buffer, req.file.originalname);
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
            const resultUrl = await uploadToPixhost(Buffer.from(imageRes.data), `upload_${Date.now()}.jpg`);
            res.json({ status: true, creator: 'AxlyChann', result: { original_url: url, uploaded_url: resultUrl } });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
