const express = require('express');
const puppeteer = require('puppeteer');

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
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
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
    if (!response.ok || !result.ok) {
      console.error('Telegram sendPhoto failed:', result.description || response.statusText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send image to Telegram:', error);
    return false;
  }
}

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, browser: Boolean(browser) });
});

// Detect and handle captcha
app.post('/detect-captcha', async (req, res) => {
  const { url, selector } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  if (!browser) {
    return res.status(500).json({ error: 'Browser not initialized' });
  }

  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    
    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
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
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
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
