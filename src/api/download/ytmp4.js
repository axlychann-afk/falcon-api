const { execFile } = require("child_process");
const https = require("https");
const path = require("path");

// bin/yt-dlp is at <project-root>/bin/yt-dlp
// __dirname here is <project-root>/src/api/download  →  ../../../ = project root
const YTDLP_BIN = path.join(__dirname, "../../../bin/yt-dlp");

function getYtInfo(url) {
  return new Promise((resolve, reject) => {
    execFile(
      YTDLP_BIN,
      ["--dump-json", "--no-playlist", "--no-warnings", url],
      { timeout: 90000 },
      (err, stdout) => {
        if (err) return reject(new Error("yt-dlp gagal: " + err.message));
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error("Gagal parse output yt-dlp"));
        }
      }
    );
  });
}

function checkDMCA(url) {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "dmca.ytmp3.gg",
        path: "/api/check?url=" + encodeURIComponent(url),
        method: "GET",
        headers: { Accept: "application/json" },
        timeout: 8000,
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            resolve({ blocked: false });
          }
        });
      }
    );
    req.on("error", () => resolve({ blocked: false }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ blocked: false });
    });
    req.end();
  });
}

function pickVideoUrl(formats, heightTarget) {
  const candidates = formats.filter(
    (f) => f.vcodec !== "none" && f.ext === "mp4" && f.height === heightTarget
  );
  const withAudio = candidates.find((f) => f.acodec !== "none");
  return (withAudio || candidates[0] || null)?.url || null;
}

function buildVideoFormats(formats) {
  const targets = [
    { label: "MP4 1080P", height: 1080 },
    { label: "MP4 720P", height: 720 },
    { label: "MP4 480P", height: 480 },
    { label: "MP4 360P", height: 360 },
    { label: "MP4 144P", height: 144 },
  ];
  return targets.map((t) => {
    const url = pickVideoUrl(formats, t.height);
    return { format: t.label, status: !!url, download_url: url };
  });
}

module.exports = (app) => {
  app.get("/download/ytmp4", async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "Parameter url (link YouTube) wajib diisi",
        });
      }
      if (!url.includes("youtu.be") && !url.includes("youtube.com")) {
        return res.status(400).json({
          status: false,
          error: "URL harus dari YouTube",
        });
      }

      const [dmca, info] = await Promise.all([checkDMCA(url), getYtInfo(url)]);

      if (dmca.blocked) {
        return res.status(403).json({
          status: false,
          error: "Video kena DMCA, tidak bisa didownload.",
        });
      }

      res.json({
        status: true,
        result: {
          judul: info.title || "-",
          channel: info.uploader || info.channel || "-",
          thumbnail: info.thumbnail || "-",
          duration: info.duration || null,
          format: buildVideoFormats(info.formats || []),
        },
      });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
};
