const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const fileType = require('file-type');

const upload = multer({ storage: multer.memoryStorage() });

async function uploadToUguu(fileBuffer, filename) {
    // Deteksi tipe file dari buffer
    const type = await fileType.fromBuffer(fileBuffer);
    const ext = type ? type.ext : 'bin';
    
    const form = new FormData();
    form.append('files[]', fileBuffer, { filename: `data.${ext}` });

    const response = await axios.post('https://uguu.se/upload.php', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 60000
    });

    if (response.data && response.data.files && response.data.files[0]) {
        return response.data.files[0].url;
    }
    throw new Error('Upload gagal: ' + JSON.stringify(response.data));
}

module.exports = (app) => {
    // POST - upload file langsung
    app.post('/tools/upload', upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ status: false, error: 'Tidak ada file' });
        }

        try {
            const url = await uploadToUguu(req.file.buffer, req.file.originalname);
            res.json({ status: true, creator: 'AxlyChann', result: { url: url, original_name: req.file.originalname, size: req.file.size } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, error: error.message });
        }
    });

    // GET - upload dari URL
    app.get('/tools/upload', async (req, res) => {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, error: 'Parameter "url" diperlukan' });

        try {
            const imageRes = await axios.get(url, { responseType: 'arraybuffer' });
            const resultUrl = await uploadToUguu(Buffer.from(imageRes.data), `upload_${Date.now()}.jpg`);
            res.json({ status: true, creator: 'AxlyChann', result: { original_url: url, uploaded_url: resultUrl } });
        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    });
};
