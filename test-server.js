const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is working',
    telegramToken: process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set'
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
}); 