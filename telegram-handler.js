// telegram-handler.js
// This script handles incoming messages from Telegram and processes captcha responses

const TelegramBot = require('node-telegram-bot-api');

// Telegram Bot setup
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Store pending captcha requests
const pendingRequests = new Map();

// Listen for messages
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Check if this is a captcha response
  if (pendingRequests.has(chatId)) {
    const requestId = pendingRequests.get(chatId);
    console.log(`Received captcha response "${text}" for request ${requestId}`);
    
    // Here you would typically send the captcha response back to your main booking system
    // This is a simplified example
    handleCaptchaResponse(requestId, text);
    
    // Remove from pending requests
    pendingRequests.delete(chatId);
    
    bot.sendMessage(chatId, `Received captcha code: ${text}. Processing...`);
  }
});

function handleCaptchaResponse(requestId, captchaCode) {
  // In a real implementation, you would:
  // 1. Look up the original request details
  // 2. Inject the captcha code back into the booking process
  // 3. Continue with the reservation
  console.log(`Processing captcha response for request ${requestId}: ${captchaCode}`);
}

// Function to register a pending captcha request
function registerPendingRequest(chatId, requestId) {
  pendingRequests.set(chatId, requestId);
  
  // Optionally notify the user that we're waiting for captcha input
  bot.sendMessage(chatId, 'Please enter the captcha code you see in the image.');
}

module.exports = {
  registerPendingRequest
};