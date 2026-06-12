/**
 * Persistent API Statistics
 * Simpan ke file agar tidak hilang saat restart/reload
 * 
 * Usage:
 * const stats = require('./');
 * stats.init();
 * stats.incrementRequest();
 */

const fs = require('fs');
const path = require('path');

// File untuk menyimpan stats
const STATS_FILE = path.join(__dirname, 'data', 'api_stats.json');

// Ensure data directory exists
function ensureDataDir() {
    const dataDir = path.dirname(STATS_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// Load stats dari file
function loadStats() {
    ensureDataDir();
    
    try {
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.warn('Error loading stats file, using defaults:', error.message);
    }
    
    // Default stats jika file tidak ada
    return {
        totalRequests: 0,
        totalFeaturesCreated: 0,
        startTime: Date.now(),
        lastUpdated: Date.now()
    };
}

// Save stats ke file
function saveStats(stats) {
    ensureDataDir();
    
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
        console.log('[Stats] Saved to file');
    } catch (error) {
        console.error('Error saving stats file:', error);
    }
}

// Initialize (load existing stats)
let stats = loadStats();

// Middleware untuk increment request count
function requestCounterMiddleware(req, res, next) {
    stats.totalRequests++;
    stats.lastUpdated = Date.now();
    
    // Save setiap 50 requests (untuk performa)
    if (stats.totalRequests % 50 === 0) {
        saveStats(stats);
    }
    
    next();
}

// Get current stats
function getStats() {
    return {
        totalRequests: stats.totalRequests,
        totalFeatures: stats.totalFeaturesCreated,
        startTime: stats.startTime,
        lastUpdated: stats.lastUpdated,
        uptime: Date.now() - stats.startTime
    };
}

// Manual increment
function incrementRequest() {
    stats.totalRequests++;
    stats.lastUpdated = Date.now();
}

// Manual save
function save() {
    saveStats(stats);
}

// Reset stats (gunakan dengan hati-hati!)
function reset() {
    stats = {
        totalRequests: 0,
        totalFeaturesCreated: 0,
        startTime: Date.now(),
        lastUpdated: Date.now()
    };
    saveStats(stats);
    console.log('[Stats] Reset to zero');
}

// Export
module.exports = {
    requestCounterMiddleware,
    incrementRequest,
    getStats,
    save,
    reset,
    init: () => {
        console.log('[Stats] Loaded from file:', stats.totalRequests, 'requests');
        return stats;
    }
};

