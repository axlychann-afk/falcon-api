const { createCanvas } = require('canvas');
const sharp = require('sharp');

async function generateBratImage(text, size = 1000) {
    const SIZE = size;
    const PADDING = 50;
    
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');
    
    // Background putih
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    
    // Text hitam
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    
    function wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let current = '';
        for (const word of words) {
            const test = current ? `${current} ${word}` : word;
            if (ctx.measureText(test).width > maxWidth && current) {
                lines.push(current);
                current = word;
            } else {
                current = test;
            }
        }
        if (current) lines.push(current);
        return lines;
    }
    
    let fontSize = 220;
    let lines;
    while (fontSize > 20) {
        ctx.font = `bold ${fontSize}px "Arial", "Helvetica", sans-serif`;
        lines = wrapText(ctx, text, SIZE - PADDING * 2);
        const totalHeight = lines.length * (fontSize * 1.15);
        if (totalHeight <= SIZE - PADDING * 2) break;
        fontSize -= 8;
    }
    
    let y = PADDING;
    for (const line of lines) {
        ctx.fillText(line, PADDING, y);
        y += fontSize * 1.15;
    }
    
    const buffer = canvas.toBuffer('image/png');
    
    // Konversi ke WebP
    const webpBuffer = await sharp(buffer)
        .webp({ quality: 92 })
        .toBuffer();
    
    return webpBuffer;
}

module.exports = (app) => {
    app.get('/tools/brat', async (req, res) => {
        const { text, size } = req.query;

        if (!text) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "text" diperlukan'
            });
        }

        const imageSize = parseInt(size) || 1000;
        if (imageSize < 100 || imageSize > 2000) {
            return res.status(400).json({
                status: false,
                error: 'Parameter "size" harus antara 100-2000'
            });
        }

        try {
            const imageBuffer = await generateBratImage(text, imageSize);
            
            res.setHeader('Content-Type', 'image/webp');
            res.setHeader('Content-Disposition', `attachment; filename="brat.webp"`);
            res.send(imageBuffer);
            
        } catch (error) {
            console.error(error);
            res.status(500).json({
                status: false,
                error: error.message || 'Gagal generate gambar brat'
            });
        }
    });
};
