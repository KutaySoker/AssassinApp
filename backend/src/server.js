const express = require('express');
const cors = require('cors');
const scanRoutes = require('./routes/index.js'); // 1. KAPIYI GETİR

const app = express();

app.use(cors());
app.use(express.json());

// 2. KAPIYI DUVARA MONTE ET
app.use('/api/scan', scanRoutes); 

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda fırtına gibi çalışıyor!`);
});