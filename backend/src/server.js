const express = require('express');
const cors = require('cors');

// BÜTÜN ROTALAR TEK MERKEZDEN (index.js) GELİYOR
const scanRoutes = require('./routes/index.js'); 

const app = express();

app.use(cors());
app.use(express.json());

// KAPIYI DUVARA MONTE ET
app.use('/api/scan', scanRoutes); 

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda fırtına gibi çalışıyor!`);
});