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
    // Halaman HTML untuk test di browser (upload file)
    app.get('/tools/upload-catbox', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Upload ke Catbox.moe</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f0f2f5; }
                    .container { background: white; border-radius: 16px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h2 { color: #333; margin-top: 0; }
                    p { color: #666; margin-bottom: 20px; }
                    input[type="file"] { padding: 10px; border: 1px solid #ccc; border-radius: 8px; width: 100%; margin-bottom: 20px; background: white; }
                    button { background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; }
                    button:hover { background: #0056b3; }
                    button:disabled { background: #ccc; cursor: not-allowed; }
                    .result { margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 8px; word-break: break-all; }
                    .result a { color: #007bff; text-decoration: none; }
                    .error { color: red; }
                    .loading { color: #007bff; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>📤 Upload File ke Catbox.moe</h2>
                    <p>Support: <strong>Gambar, Video, Dokumen, ZIP</strong> (max 200MB)</p>
                    <form id="uploadForm" enctype="multipart/form-data">
                        <input type="file" name="file" id="file" required>
                        <button type="submit" id="submitBtn">Upload</button>
                    </form>
                    <div id="result" class="result" style="display:none;"></div>
                </div>
                <script>
                    const form = document.getElementById('uploadForm');
                    const resultDiv = document.getElementById('result');
                    const submitBtn = document.getElementById('submitBtn');

                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const fileInput = document.getElementById('file');
                        const file = fileInput.files[0];
                        if (!file) {
                            alert('Pilih file dulu!');
                            return;
                        }

                        resultDiv.style.display = 'block';
                        resultDiv.innerHTML = '<span class="loading">⏳ Uploading... Please wait</span>';
                        resultDiv.classList.remove('error');
                        submitBtn.disabled = true;
                        submitBtn.textContent = 'Uploading...';

                        const formData = new FormData();
                        formData.append('file', file);

                        try {
                            const response = await fetch('/tools/upload-catbox', {
                                method: 'POST',
                                body: formData
                            });
                            const json = await response.json();
                            
                            if (json.status) {
                                resultDiv.innerHTML = \`
                                    ✅ <strong>Upload berhasil!</strong><br>
                                    📁 <strong>Nama:</strong> \${json.result.originalName}<br>
                                    📦 <strong>Ukuran:</strong> \${(json.result.size / 1024).toFixed(2)} KB<br>
                                    🔗 <strong>URL:</strong> <a href="\${json.result.url}" target="_blank">\${json.result.url}</a>
                                \`;
                            } else {
                                resultDiv.innerHTML = \`❌ Gagal: \${json.error}\`;
                                resultDiv.classList.add('error');
                            }
                        } catch (err) {
                            resultDiv.innerHTML = \`❌ Error: \${err.message}\`;
                            resultDiv.classList.add('error');
                        } finally {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Upload';
                        }
                    });
                </script>
            </body>
            </html>
        `);
    });

    // Endpoint POST upload file (buat bot WA / dari form)
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

    // Endpoint GET upload dari URL (path terpisah biar gak bentrok)
    app.get('/tools/upload-catbox-url', async (req, res) => {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "url" diperlukan (URL gambar/file)'
            });
        }

        try {
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
};
