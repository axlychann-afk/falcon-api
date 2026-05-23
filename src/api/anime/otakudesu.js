// otakudesu.js - Scraper Otakudesu (Search, Detail, Stream) - FIXED
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://otakudesu.blog';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': BASE_URL
};

async function fetchPage(url) {
  const response = await axios.get(url, {
    headers: HEADERS,
    timeout: 30000,
    maxRedirects: 5
  });
  return response.data;
}

// ========== 1. SEARCH ANIME (FIXED) ==========
async function searchAnime(query) {
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=anime`;
  const html = await fetchPage(searchUrl);
  const $ = cheerio.load(html);
  
  const results = [];
  
  // Selector yang bener buat otakudesu.blog
  $('.col-md-3, .col-sm-4, .item').each((i, el) => {
    const link = $(el).find('a').first().attr('href');
    const title = $(el).find('a').first().attr('title') || $(el).find('h2, h3').text().trim();
    const image = $(el).find('img').attr('src');
    const rating = $(el).find('.rating, .score').text().trim();
    const status = $(el).find('.status, .completed, .ongoing').text().trim();
    
    if (link && link.includes('/anime/')) {
      results.push({
        title: title || 'Unknown',
        url: link,
        image: image || null,
        rating: rating || null,
        status: status || null
      });
    }
  });
  
  // Fallback: cari dari blok venz
  if (results.length === 0) {
    $('.venz').each((i, el) => {
      const link = $(el).find('h2 a').attr('href');
      const title = $(el).find('h2 a').text().trim();
      const image = $(el).find('img').attr('src');
      
      if (link && title) {
        results.push({ title, url: link, image, rating: null, status: null });
      }
    });
  }
  
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
  
  const title = $('h1.entry-title').text().trim() || $('h1').first().text().trim();
  const image = $('.thumb img, .foto img, img.attachment-large').attr('src');
  
  const info = {};
  $('.info-content p, .infox p, .info p').each((i, el) => {
    const text = $(el).text().trim();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      info[key] = value;
    }
  });
  
  const genres = [];
  $('.genres a, .genre a').each((i, el) => {
    genres.push($(el).text().trim());
  });
  
  const sinopsis = $('.entry-content p, .sinopsis p').first().text().trim();
  
  const episodes = [];
  $('.eplist li, .list-episode li, .episodelist li').each((i, el) => {
    const episodeLink = $(el).find('a').attr('href');
    const episodeNum = $(el).find('.episode, .episode-num, .eps').text().trim();
    const episodeTitle = $(el).find('.title, .episode-title').text().trim();
    
    if (episodeLink) {
      episodes.push({
        episode: episodeNum || `Episode ${i+1}`,
        title: episodeTitle || '-',
        url: episodeLink
      });
    }
  });
  
  return {
    status: true,
    creator: 'AxlyDev',
    data: {
      title: title || 'Unknown',
      url: animeUrl,
      image: image || null,
      info: info,
      genres: genres,
      sinopsis: sinopsis ? sinopsis.substring(0, 500) : 'Tidak ada sinopsis',
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
  
  const streamUrls = [];
  
  // Ambil semua iframe
  $('iframe').each((i, el) => {
    const src = $(el).attr('src');
    if (src && src.startsWith('http')) {
      streamUrls.push({
        provider: getProviderName(src),
        url: src,
        type: 'iframe'
      });
    }
  });
  
  // Ambil link download langsung
  $('a[href*="mp4upload"], a[href*="streamtape"], a[href*="drive.google"], a[href$=".mp4"]').each((i, el) => {
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
      title: title || 'Unknown Episode',
      url: episodeUrl,
      streamUrls: streamUrls,
      totalStreams: streamUrls.length
    }
  };
}

function getProviderName(url) {
  if (url.includes('mp4upload')) return 'Mp4Upload';
  if (url.includes('streamtape')) return 'Streamtape';
  if (url.includes('drive.google')) return 'Google Drive';
  if (url.includes('.mp4')) return 'Direct MP4';
  return 'Unknown';
}

async function randomAnime() {
  const keywords = ['action', 'fantasy', 'romance', 'comedy', 'adventure'];
  const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  const result = await searchAnime(randomKeyword);
  
  if (result.data.totalResults === 0) {
    return { status: false, error: 'Gak dapet anime random' };
  }
  
  const randomIndex = Math.floor(Math.random() * result.data.results.length);
  const randomAnime = result.data.results[randomIndex];
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

module.exports = (app) => {
  
  app.get('/anime/otakudesu/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ status: false, error: 'Parameter q wajib diisi' });
      const result = await searchAnime(q);
      res.json(result);
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
  
  app.get('/anime/otakudesu/detail', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, error: 'Parameter url wajib diisi' });
      const result = await getAnimeDetail(url);
      res.json(result);
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
  
  app.get('/anime/otakudesu/stream', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ status: false, error: 'Parameter url wajib diisi' });
      const result = await getEpisodeStream(url);
      res.json(result);
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
  
  app.get('/anime/otakudesu/random', async (req, res) => {
    try {
      const result = await randomAnime();
      res.json(result);
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
};
