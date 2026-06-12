/**
 * Updated /api/status endpoint dengan persistent stats
 * 
 * Ganti endpoint /api/status yang lama dengan ini
 */

const stats = require('./api_stats_persistent'); // import dari file di atas

module.exports = function (app) {

    function listRoutes() {
        let routes = app._router.stack
            .filter(layer => layer.route)
            .map(layer => ({
                method: Object.keys(layer.route.methods).join(', ').toUpperCase(),
                path: layer.route.path
            }));        
        return routes.length - 1
    }

    function runtime(uptime) {
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const secs = Math.floor(uptime % 60);
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h ${minutes}m`;
        }
        return `${hours}h ${minutes}m ${secs}s`;
    }

    app.get('/api/status', async (req, res) => {
        try {
            const currentStats = stats.getStats();
            const uptime = process.uptime();

            res.status(200).json({
                status: true,
                result: {
                    status: "Aktif",
                    totalrequest: currentStats.totalRequests.toString(),
                    totalfitur: `${listRoutes()}`,
                    runtime: runtime(uptime),
                    domain: req.hostname,
                    // Add these untuk dashboard
                    startTime: new Date(currentStats.startTime).toISOString(),
                    lastUpdated: new Date(currentStats.lastUpdated).toISOString()
                }
            });
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
    });

    // Endpoint untuk manual save (optional)
    app.post('/api/stats/save', (req, res) => {
        stats.save();
        res.json({ status: true, message: 'Stats saved' });
    });

    // Endpoint untuk get raw stats (optional)
    app.get('/api/stats/raw', (req, res) => {
        res.json({
            status: true,
            data: stats.getStats()
        });
    });
}
