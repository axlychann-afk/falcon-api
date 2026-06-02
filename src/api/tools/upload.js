const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { fromBuffer } = require('file-type');

const upload = multer({ storage: multer.memoryStorage() });

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

// Pake 0x0.st (paling stabil)
async function uploadTo0x0(fileBuffer, filename) {
    const form = new FormData();
    form.append('file', fileBuffer, filename);

    const response = await axios.post('https://0x0.st', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0'
        },
        timeout: 30000
    });

    if (response.data && response.data.startsWith('https://')) {
        return response.data.trim();
    }
    throw new Error('Upload gagal: ' + response.data);
}

// Pake Catbox (alternatif)
async function uploadToCatbox(fileBuffer, filename) {
    const type = await fromBuffer(fileBuffer);
    const ext = type ? type.ext : 'bin';
    
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fileBuffer, { filename: `file.${ext}` });

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0'
        },
        timeout: 30000
    });

    if (response.data && response.data.startsWith('https://')) {
        return response.data;
    }
    throw new Error('Upload gagal: ' + response.data);
}

module.exports = (app) => {
    
    // GET - upload dari URL
    app.get('/tools/upload', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "url" diperlukan'
            });
        }

        try {
            const imageRes = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const filename = url.split('/').pop() || 'file.jpg';
            const resultUrl = await uploadTo0x0(Buffer.from(imageRes.data), filename);
            
            res.json({
                status: true,
                creator: getCreator(),
                result: {
                    original_url: url,
                    uploaded_url: resultUrl,
                    size: imageRes.data.length
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ status: false, creator: getCreator(), error: error.message });
        }
    });

    // POST - upload file langsung
    app.post('/tools/upload', upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Tidak ada file. Kirim file dengan key "file"'
            });
        }

        // Batasi ukuran file (max 10MB)
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'File terlalu besar. Maksimal 10MB'
            });
        }

        try {
            // Coba upload ke 0x0.st dulu
            let resultUrl;
            try {
                resultUrl = await uploadTo0x0(req.file.buffer, req.file.originalname);
            } catch (err) {
                console.log('0x0.st error, fallback ke catbox');
                resultUrl = await uploadToCatbox(req.file.buffer, req.file.originalname);
            }
            
            res.json({
                status: true,
                creator: getCreator(),
                result: {
                    url: resultUrl,
                    original_name: req.file.originalname,
                    size: req.file.size
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
};
