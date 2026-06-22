const express = require('express');
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Telegram bot settings
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Puppeteer browser instance
let browser = null;

// Initialize browser
async function initBrowser() {
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    console.log('Browser initialized');
  } catch (error) {
    console.error('Failed to initialize browser:', error);
  }
}

// Send image to Telegram
async function sendImageToTelegram(imageBuffer, caption = 'Please enter the security code') {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram bot token or chat ID not configured');
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', new Blob([imageBuffer], { type: 'image/png' }), 'captcha.png');
    formData.append('caption', caption);

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error('Failed to send image to Telegram:', error);
    return false;
  }
}

// Detect and handle captcha
app.post('/detect-captcha', async (req, res) => {
  const { url, selector } = req.body;

  if (!browser) {
    return res.status(500).json({ error: 'Browser not initialized' });
  }

  try {
    const page = await browser.newPage();
    
    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Capture captcha image - using a default selector if none provided
    const defaultSelector = 'img[src*="captcha"], img[src*="security"]';
    const targetSelector = selector || defaultSelector;
    const captchaElement = await page.$(targetSelector);
    
    if (!captchaElement) {
      return res.status(404).json({ error: 'Captcha element not found' });
    }

    // Take screenshot
    const imageBuffer = await captchaElement.screenshot();
    
    // Send to Telegram
    const sent = await sendImageToTelegram(imageBuffer);
    
    if (sent) {
      return res.json({ 
        success: true, 
        message: 'Captcha detected and sent to Telegram. Waiting for user input...' 
      });
    } else {
      return res.status(500).json({ error: 'Failed to send captcha to Telegram' });
    }
  } catch (error) {
    console.error('Error detecting captcha:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initBrowser();
});

// Cleanup on shutdown
process.on('SIGINT', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});