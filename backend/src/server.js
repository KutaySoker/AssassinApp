const express = require('express');
const cors = require('cors');
const scanRoutes = require('./routes/index');

const app = express();

app.use(cors());
app.use(express.json());

// API Rotalarını bağla
app.use('/api/scan', scanRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda fırtına gibi çalışıyor!`);
});