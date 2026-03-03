// backend/src/server.js
const app = require('./app'); // Yanındaki app.js'i çağırır

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 AssassinApp Backend Ateşlendi: http://localhost:${PORT}`);
    console.log(`🔗 Scan Endpoint: http://localhost:${PORT}/api/scan/start`);
});