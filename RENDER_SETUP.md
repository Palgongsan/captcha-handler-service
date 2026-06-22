# Deploying to Render

This guide explains how to deploy the Captcha Handler Service to Render.

## Prerequisites

1. A Render account (https://render.com)
2. This GitHub repository

## Steps

1. Log in to your Render account
2. Click on "New +" and select "Web Service"
3. Connect your GitHub account and select this repository
4. Configure the following settings:
   - Environment: Docker
   - Root Directory: repository root
   - Dockerfile Path: `Dockerfile`
   - Branch: main
   - Region: Choose your preferred region
   - Plan: Free (or your preferred plan)
5. Add the following environment variables:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
   - `TELEGRAM_CHAT_ID`: Chat ID where captcha images will be sent
6. Click "Create Web Service"

## Environment Variables

Make sure to set these environment variables in your Render dashboard:

- `TELEGRAM_BOT_TOKEN`: The token for your Telegram bot (get this from @BotFather)
- `TELEGRAM_CHAT_ID`: The chat ID where you want to receive captcha images

## Using the Service

Once deployed, your service will be available at the URL provided by Render. You can send POST requests to `/detect-captcha` endpoint to detect captchas and send them to Telegram.

Example request:

```bash
curl -X POST https://your-render-service-url.onrender.com/detect-captcha \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/page-with-captcha",
    "selector": "img#captcha-image"
  }'
```

## Important Notes

- The service will only work with publicly accessible URLs
- Make sure your Telegram bot has permission to send photos
- The service runs Puppeteer in headless mode, which requires specific Chrome flags for Render
- The production Next.js app still lives in `web/` and should be deployed to Vercel, not Render.
