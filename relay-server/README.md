# WebSocket Relay Server for AI Voice Demo

This is a standalone WebSocket relay server that bridges the browser to OpenAI's Realtime API.

## Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/websocket)

1. Click the button above or go to [Railway](https://railway.app)
2. Create a new project → Deploy from GitHub repo
3. Point to this `relay-server` folder or upload these files
4. Add environment variable: `OPENAI_API_KEY=your-api-key`
5. Railway will auto-detect and run `npm start`
6. Copy the provided URL (e.g., `wss://your-app.up.railway.app`)

## Quick Deploy to Render

1. Go to [Render](https://render.com)
2. Create a new **Web Service**
3. Connect your GitHub repo
4. Set **Root Directory** to `relay-server`
5. Set **Build Command**: `npm install`
6. Set **Start Command**: `npm start`
7. Add environment variable: `OPENAI_API_KEY=your-api-key`
8. Copy the URL (e.g., `wss://your-app.onrender.com`)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `PORT` | No | Server port (default: 3001, auto-set by hosting) |

## After Deployment

Once deployed, update your Vercel environment variables:

```
NEXT_PUBLIC_WS_URL=wss://your-relay-server-url.com
```

Then redeploy your Vercel app.

## Local Development

```bash
npm install
OPENAI_API_KEY=your-key npm start
```

Server runs on `ws://localhost:3001`
