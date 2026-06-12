const axios = require('axios');
const fs = require('fs');
const path = require('path');

const getCreator = () => {
    return (global.apikey && global.apikey[0]) ? global.apikey[0] : 'AxlyDev';
};

const SESSION_DIR = path.join(__dirname, '../../data/sessions');
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

const SYSTEM_MESSAGE = "Kamu adalah MRCL AI. Asisten yang bisa membantu apa saja. Pembuatmu adalah Marcellino Ferdian Abimanyu. Jika ada yang bertanya kepadamu, tolong berikan bahasa seperti barudak bandung/jaksel yang identik dengan Gue, Lo, Siape, Peduli Apa.";
const DEFAULT_ASSISTANT_MESSAGE = "Hi, I'm FeelBetterBot — I'm here to listen and help you carry whatever feels heavy, without judgment.";

function makeMemoryId() {
    const animals = ["owl", "fox", "cat", "wolf", "bear", "lion", "deer", "bird"];
    const words = ["safe", "calm", "soft", "kind", "warm", "bright", "gentle"];
    const word = words[Math.floor(Math.random() * words.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const number = Math.floor(1000 + Math.random() * 9000);
    return `${word}-${animal}-${number}`;
}

async function loadSession(memoryId) {
    const sessionFile = path.join(SESSION_DIR, `${memoryId}.json`);
    try {
        const raw = await fs.promises.readFile(sessionFile, 'utf8');
        return JSON.parse(raw);
    } catch {
        return {
            memoryId: memoryId,
            messages: [
                { role: "assistant", content: DEFAULT_ASSISTANT_MESSAGE }
            ]
        };
    }
}

async function saveSession(session) {
    const sessionFile = path.join(SESSION_DIR, `${session.memoryId}.json`);
    await fs.promises.writeFile(sessionFile, JSON.stringify(session, null, 2), 'utf8');
}

function parseChunk(line) {
    let data = line.trim();
    if (!data) return "";
    if (data === "[DONE]") return "";
    if (data.startsWith("data:")) data = data.slice(5).trim();
    if (!data || data === "[DONE]") return "";

    try {
        const json = JSON.parse(data);
        if (typeof json === "string") return json;
        if (typeof json.content === "string") return json.content;
        if (typeof json.text === "string") return json.text;
        if (typeof json.delta === "string") return json.delta;
        if (typeof json.message === "string") return json.message;
        if (typeof json.response === "string") return json.response;
        if (typeof json.answer === "string") return json.answer;
        
        const openAiContent = json.choices?.[0]?.delta?.content;
        if (typeof openAiContent === "string") return openAiContent;
        
        return "";
    } catch {
        return data;
    }
}

async function askQuestion(prompt, sessionId = null) {
    if (!sessionId) sessionId = makeMemoryId();
    
    const session = await loadSession(sessionId);
    
    const userMessage = { role: "user", content: prompt };
    
    const body = {
        messages: [
            { role: "system", content: SYSTEM_MESSAGE },
            ...session.messages,
            userMessage
        ]
    };
    
    const headers = {
        "sec-ch-ua-platform": `"Android"`,
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
        "content-type": "application/json",
        "sec-ch-ua-mobile": "?1",
        "accept": "*/*",
        "origin": "https://feelbetterbot.com",
        "referer": "https://feelbetterbot.com/",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cookie": `feelbet-memory=${sessionId}`,
        "priority": "u=1, i"
    };
    
    const response = await axios.post('https://feelbetterbot.com/', body, {
        headers,
        responseType: 'stream',
        timeout: 60000
    });
    
    return new Promise((resolve, reject) => {
        let answer = "";
        let buffer = "";
        
        response.data.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const rawLine of lines) {
                const chunkText = parseChunk(rawLine);
                if (chunkText) answer += chunkText;
            }
        });
        
        response.data.on('end', async () => {
            if (buffer.trim()) {
                const chunkText = parseChunk(buffer);
                if (chunkText) answer += chunkText;
            }
            
            session.messages.push(userMessage);
            if (answer) {
                session.messages.push({ role: "assistant", content: answer });
            }
            await saveSession(session);
            
            resolve({
                status: true,
                session_id: sessionId,
                question: prompt,
                answer: answer
            });
        });
        
        response.data.on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = (app) => {
    
    // ==================== FEELBETTER AI (PAKE ?text=) ====================
    app.get('/ai/feelbetter', async (req, res) => {
        const { text, sid } = req.query;
        
        if (!text) {
            return res.status(400).json({
                status: false,
                creator: getCreator(),
                error: 'Parameter "text" diperlukan (contoh: ?text=halo)'
            });
        }
        
        try {
            const result = await askQuestion(text, sid);
            res.json({
                status: true,
                creator: getCreator(),
                result: {
                    session_id: result.session_id,
                    question: result.question,
                    answer: result.answer
                }
            });
        } catch (error) {
            console.error('[FeelBetter Error]', error.message);
            res.status(500).json({
                status: false,
                creator: getCreator(),
                error: error.message
            });
        }
    });
};
