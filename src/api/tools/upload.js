const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const getCreator = () => {
  return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

// Upload ke Telegra.ph (paling stabil)
async function uploadToTelegraph(fileBuffer, filename) {
    const form = new FormData();
    form.append('file', fileBuffer, filename);

    const response = await axios.post('https://telegra.ph/upload', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0'
        },
        timeout: 30000
    });

    if (response.data && response.data[0]?.src) {
        return `https://telegra.ph${response.data[0].src}`;
    }
    throw new Error('Upload gagal');
}

module.exports = (app) => {
    
    // POST - upload file langsung
    app.post('/tools/upload', upload.single('file'), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Tidak ada file. Kirim file dengan key "file"'
            });
        }

        // Batasi ukuran file (max 5MB biar aman di Vercel)
        if (req.file.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'File terlalu besar. Maksimal 5MB'
            });
        }

        try {
            const resultUrl = await uploadToTelegraph(req.file.buffer, req.file.originalname);
            
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
