# Premier Properties - AI Real Estate Assistant

An AI-powered real estate sales assistant demo using LiveKit and OpenAI GPT-4o Realtime API.

## Features

- 🏠 **Real Estate AI Agent** - Talk to Sarah, your AI real estate assistant
- 🎙️ **Real-time Voice Conversation** - Natural phone-style conversations
- 🎨 **Configurable Voice** - Choose from 8 different AI voices
- 📝 **Custom System Prompt** - Customize the agent's behavior
- 📜 **Live Transcript** - See the conversation transcribed in real-time
- 💰 **Cost Estimation** - Track estimated costs in real-time
- 🔒 **Secure** - API keys stay on the server, never exposed to the browser

## Demo Property Listings

The AI agent knows about these sample properties:

1. **Sunset Villa** - $750,000 - 4 bed/3 bath, 2,800 sq ft, Modern kitchen, pool
2. **Downtown Loft** - $425,000 - 2 bed/2 bath, 1,400 sq ft, Open concept, rooftop access
3. **Family Haven** - $550,000 - 3 bed/2.5 bath, 2,200 sq ft, Great schools, large backyard
4. **Luxury Penthouse** - $1,200,000 - 3 bed/3 bath, 3,500 sq ft, City views, concierge
5. **Starter Home** - $320,000 - 2 bed/1 bath, 1,100 sq ft, Recently renovated

## Architecture

```
┌─────────────────┐                   ┌─────────────────┐                   ┌─────────────────┐
│                 │     LiveKit       │                 │     OpenAI        │                 │
│     Browser     │ ◄───────────────► │  LiveKit Agent  │ ◄───────────────► │  OpenAI API     │
│   (Next.js)     │     WebRTC        │   (Python)      │     Realtime      │  (GPT-4o)       │
│                 │                   │                 │                   │                 │
└─────────────────┘                   └─────────────────┘                   └─────────────────┘
```

## Prerequisites

- Node.js 18+ 
- Python 3.9+
- LiveKit Cloud account or self-hosted LiveKit server
- OpenAI API key with access to the Realtime API
- Modern browser with WebRTC support

## Setup

### 1. Clone and install dependencies:

```bash
cd realstate-demo
npm install
```

### 2. Configure environment variables:

Copy `.env.local.example` to `.env.local` and add your keys:

```bash
# .env.local
OPENAI_API_KEY=sk-your-openai-api-key-here
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
```

### 3. Set up the LiveKit Agent:

```bash
cd livekit-agent
pip install -r requirements.txt
```

Create a `.env` file in the livekit-agent directory:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
```

### 4. Run the servers:

Start the LiveKit agent:

```bash
cd livekit-agent
python agent.py dev
```

Start the Next.js dev server:

```bash
npm run dev
```

### 5. Open in browser:

Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Select a voice** from the dropdown (Shimmer recommended for real estate)
2. **Customize the system prompt** if needed
3. **Click "Call Agent"** to start talking to Sarah
4. **Ask about properties** - pricing, features, neighborhoods
5. **Request viewings** - the agent can help schedule appointments
6. **Click "End Call"** when done

## Sample Conversation Starters

- "Hi, I'm looking for a family home under $600,000"
- "What properties do you have with a pool?"
- "Can you tell me about the Downtown Loft?"
- "I'd like to schedule a viewing for this weekend"
- "What's the market like in the Westside neighborhood?"

## Project Structure

```
realstate-demo/
├── src/
│   ├── app/
│   │   ├── api/livekit/token/     # LiveKit token endpoint
│   │   ├── globals.css            # Global styles
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Main call interface
│   ├── components/
│   │   ├── CallControls.tsx       # Settings and call buttons
│   │   ├── MetricsPanel.tsx       # Duration and cost display
│   │   └── TranscriptPanel.tsx    # Live transcript view
│   ├── lib/
│   │   ├── audio.ts               # Audio capture and playback
│   │   ├── constants.ts           # Config constants
│   │   ├── realtime-client.ts     # WebSocket client
│   │   └── recording.ts           # Recording utilities
│   ├── server/
│   │   ├── index.ts               # Server entry point
│   │   └── ws-relay.ts            # WebSocket relay to OpenAI
│   └── types/
│       └── index.ts               # TypeScript types
├── .env.local                     # Environment variables (create this)
├── package.json
└── README.md
```

## Troubleshooting

### "Could not access microphone"
- Ensure your browser has microphone permissions
- Check that no other app is using the microphone
- Try using HTTPS or localhost (required for getUserMedia)

### "WebSocket connection failed"
- Ensure the relay server is running (`npm run dev:server`)
- Check that port 3001 is available
- Verify your firewall settings

### "Connection to AI failed"
- Verify your OpenAI API key is correct in `.env.local`
- Ensure your API key has Realtime API access
- Check the server logs for detailed errors

## Security Notes

- **Never commit `.env.local`** - it contains your API key
- The relay server keeps your API key secure on the server side
- For production, add authentication and rate limiting

## License

MIT
# gpt-realtime-demo-2026
# Realstate-demo
