// backend/src/app.js
const express = require('express');
const cors = require('cors');
const routes = require('./routes/index'); // src/routes/index.js'e gider

const app = express();

// CORS ayarını biraz daha genişletelim ki OPTIONS hatası kökten çözülsün
// backend/src/app.js içinde
app.use(cors({
  origin: '*', // Her yerden gelen isteğe izin ver
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rotaları bağla
app.use('/api', routes);

module.exports = app;