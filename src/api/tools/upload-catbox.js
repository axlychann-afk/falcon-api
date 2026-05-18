const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

async function catboxUpload(fileBuffer, filename) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fileBuffer, { filename: filename });

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    });

    const resultUrl = response.data.trim();
    if (!resultUrl.startsWith('http')) {
        throw new Error('Upload gagal: ' + resultUrl);
    }

    return resultUrl;
}

module.exports = (app) => {
    // Endpoint POST upload file (buat bot WA / form)
    app.post('/tools/upload-catbox', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: false,
                    error: 'Tidak ada file yang diupload. Kirim file dengan key "file"'
                });
            }

            const resultUrl = await catboxUpload(req.file.buffer, req.file.originalname);

            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: {
                    url: resultUrl,
                    originalName: req.file.originalname,
                    size: req.file.size
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });

    // Endpoint GET upload dari URL
    app.get('/tools/upload-catbox', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL gambar/file)'
            });
        }

        try {
            // Download file dari URL
            const imageRes = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const fileBuffer = Buffer.from(imageRes.data);
            const contentType = imageRes.headers['content-type'];
            const ext = contentType.split('/')[1] || 'bin';
            const filename = `upload_${Date.now()}.${ext}`;

            const resultUrl = await catboxUpload(fileBuffer, filename);

            res.json({
                status: true,
                creator: 'FlowFalcon',
                result: {
                    original_url: url,
                    uploaded_url: resultUrl
                }
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    });

    // Halaman HTML untuk test di browser
    app.get('/tools/upload-catbox-test', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Upload ke Catbox</title></head>
            <body style="font-family: sans-serif; max-width: 500px; margin: 50px auto;">
                <h2>Upload ke Catbox.moe</h2>
                <form id="form">
                    <input type="file" id="file" name="file" required>
                    <button type="submit">Upload</button>
                </form>
                <div id="result" style="margin-top:20px; background:#eee; padding:10px;"></div>
                <script>
                    const form = document.getElementById('form');
                    const result = document.getElementById('result');
                    form.onsubmit = async (e) => {
                        e.preventDefault();
                        const formData = new FormData(form);
                        const res = await fetch('/tools/upload-catbox', { method: 'POST', body: formData });
                        const json = await res.json();
                        if (json.status) {
                            result.innerHTML = '✅ URL: <a href="'+json.result.url+'" target="_blank">'+json.result.url+'</a>';
                        } else {
                            result.innerHTML = '❌ Error: '+json.error;
                        }
                    };
                </script>
            </body>
            </html>
        `);
    });
};
