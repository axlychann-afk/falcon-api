const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');

async function generateiPhoneIQC(text, options = {}) {
    const { width = 390, height = 844 } = options; // Ukuran iPhone 12/13/14
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Gradient background (seperti wallpaper iPhone)
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Dynamic Island (bagian atas)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 60, 12, 120, 32, 20);
    ctx.fill();
    
    // Notch (pake roundRect)
    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.fill();
    }
    
    // Home indicator (garis bawah)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    roundRect(width / 2 - 60, height - 20, 120, 4, 2);
    ctx.fill();
    
    // Teks utama
    const fontSize = Math.min(42, Math.floor(width / (text.length / 2)));
    ctx.font = `bold ${fontSize}px "Arial", "Helvetica", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Wrap text
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > width - 60 && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    let startY = (height - totalHeight) / 2;
    
    for (const line of lines) {
        ctx.fillText(line, width / 2, startY);
        startY += lineHeight;
    }
    
    // Convert to buffer
    const buffer = canvas.toBuffer('image/png');
    const webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();
    
    return webpBuffer;
}

module.exports = (app) => {
    app.get('/maker/iqc', async (req, res) => {
        const { text } = req.query;

        if (!text) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "text" diperlukan'
            });
        }

        try {
            const imageBuffer = await generateiPhoneIQC(text);
            
            res.setHeader('Content-Type', 'image/webp');
            res.setHeader('Content-Disposition', `attachment; filename="iqc.webp"`);
            res.send(imageBuffer);
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal generate gambar IQC'
            });
        }
    });
};
