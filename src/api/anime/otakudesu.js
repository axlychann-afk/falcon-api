// otakudesu.js - Scraper Otakudesu (Search, Detail, Stream)
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://otakudesu.blog';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': BASE_URL
};

// Fungsi fetch page dengan redirect handling
async function fetchPage(url) {
  const response = await axios.get(url, {
    headers: HEADERS,
    timeout: 30000,
    maxRedirects: 5
  });
  return response.data;
}

// ========== 1. SEARCH ANIME ==========
async function searchAnime(query) {
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=anime`;
  const html = await fetchPage(searchUrl);
  const $ = cheerio.load(html);
  
  const results = [];
  
  $('.venz').each((i, el) => {
    const link = $(el).find('h2 a').attr('href');
    const title = $(el).find('h2 a').text().trim();
    const image = $(el).find('img').attr('src');
    const rating = $(el).find('.rating').text().trim();
    const status = $(el).find('.status').text().trim();
    const genres = [];
    
    $(el).find('.genre a').each((j, genreEl) => {
      genres.push($(genreEl).text().trim());
    });
    
    if (title && link) {
      results.push({
        title: title,
        url: link,
        image: image || null,
        rating: rating || null,
        status: status || null,
        genres: genres
      });
    }
  });
  
  return {
    status: true,
    creator: 'AxlyDev',
    data: {
      keyword: query,
      totalResults: results.length,
      results: results
    }
  };
}

// ========== 2. DETAIL ANIME ==========
async function getAnimeDetail(animeUrl) {
  const html = await fetchPage(animeUrl);
  const $ = cheerio.load(html);
  
  const title = $('h1.entry-title').text().trim();
  const image = $('.thumb img').attr('src');
  
  // Ambil info detail
  const info = {};
  $('.info-content p').each((i, el) => {
    const text = $(el).text().trim();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      info[key] = value;
    }
  });
  
  // Ambil genre
  const genres = [];
  $('.genres a').each((i, el) => {
    genres.push($(el).text().trim());
  });
  
  // Ambil sinopsis
  const sinopsis = $('.entry-content p').eq(0).text().trim();
  
  // Ambil daftar episode
  const episodes = [];
  $('.eplist li').each((i, el) => {
    const episodeLink = $(el).find('a').attr('href');
    const episodeNum = $(el).find('.episode-num').text().trim();
    const episodeTitle = $(el).find('.episode-title').text().trim();
    const date = $(el).find('.date').text().trim();
    
    if (episodeLink) {
      episodes.push({
        episode: episodeNum,
        title: episodeTitle,
        url: episodeLink,
        date: date
      });
    }
  });
  
  return {
    status: true,
    creator: 'AxlyDev',
    data: {
      title: title,
      url: animeUrl,
      image: image || null,
      info: info,
      genres: genres,
      sinopsis: sinopsis.substring(0, 500) + (sinopsis.length > 500 ? '...' : ''),
      totalEpisodes: episodes.length,
      episodes: episodes.reverse()
    }
  };
}

// ========== 3. STREAM LINK ==========
async function getEpisodeStream(episodeUrl) {
  const html = await fetchPage(episodeUrl);
  const $ = cheerio.load(html);
  
  const title = $('h1.entry-title').text().trim();
  
  // Ambil semua link dari iframe (hosting video)
  const streamUrls = [];
  $('iframe').each((i, el) => {
    const src = $(el).attr('src');
    if (src && !src.includes('disqus') && !src.includes('facebook')) {
      streamUrls.push({
        provider: getProviderName(src),
        url: src,
        type: 'iframe'
      });
    }
  });
  
  // Coba cari link langsung (mirror/download)
  $('a[href*="mp4upload"], a[href*="streamtape"], a[href*="drive.google"]').each((i, el) => {
    const url = $(el).attr('href');
    streamUrls.push({
      provider: getProviderName(url),
      url: url,
      type: 'direct'
    });
  });
  
  return {
    status: true,
    creator: 'AxlyDev',
    data: {
      title: title,
      url: episodeUrl,
      streamUrls: streamUrls,
      totalStreams: streamUrls.length,
      note: "Gunakan link dari provider yang support (Mp4Upload, Google Drive, Streamtape)"
    }
  };
}

// Helper: Deteksi provider dari URL
function getProviderName(url) {
  if (url.includes('mp4upload')) return 'Mp4Upload';
  if (url.includes('streamtape')) return 'Streamtape';
  if (url.includes('drive.google')) return 'Google Drive';
  if (url.includes('microsoft') || url.includes('sharepoint')) return 'Microsoft Stream';
  if (url.includes('ok.ru')) return 'Ok.ru';
  return 'Unknown Provider';
}

// ========== RANDOM ANIME (Bonus) ==========
async function randomAnime() {
  const keywords = ['action', 'fantasy', 'romance', 'comedy', 'adventure', 'drama', 'horror', 'isekai', 'magic', 'sports'];
  const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(randomKeyword)}&post_type=anime`;
  const html = await fetchPage(searchUrl);
  const $ = cheerio.load(html);
  
  const results = [];
  $('.venz').each((i, el) => {
    const link = $(el).find('h2 a').attr('href');
    const title = $(el).find('h2 a').text().trim();
    if (title && link) {
      results.push({ title, url: link });
    }
  });
  
  if (results.length === 0) {
    return { status: false, error: 'Gak dapet anime random' };
  }
  
  const randomIndex = Math.floor(Math.random() * results.length);
  const randomAnime = results[randomIndex];
  const detail = await getAnimeDetail(randomAnime.url);
  
  return {
    status: true,
    creator: 'AxlyDev',
    data: {
      random: true,
      keywordUsed: randomKeyword,
      result: detail.data
    }
  };
}

// ========== EXPORT ENDPOINT UNTUK EXPRESS ==========
module.exports = (app) => {
  
  // Endpoint 1: Search Anime
  app.get('/anime/otakudesu/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ status: false, error: 'Parameter q (keyword) wajib diisi' });
      }
      const result = await searchAnime(q);
      res.json(result);
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
  
  // Endpoint 2: Detail Anime
  app.get('/anime/otakudesu/detail', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ status: false, error: 'Parameter url (link detail anime) wajib diisi' });
      }
      const result = await getAnimeDetail(url);
      res.json(result);
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
  
  // Endpoint 3: Stream Link (iframe dari episode)
  app.get('/anime/otakudesu/stream', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ status: false, error: 'Parameter url (link episode) wajib diisi' });
      }
      const result = await getEpisodeStream(url);
      res.json(result);
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
  
  // Bonus: Random Anime
  app.get('/anime/otakudesu/random', async (req, res) => {
    try {
      const result = await randomAnime();
      res.json(result);
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
};
