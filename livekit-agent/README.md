# LiveKit Voice Agent

This is a LiveKit Agent that connects to OpenAI's Realtime API to provide voice AI capabilities.

## Prerequisites

- Python 3.9+
- OpenAI API Key
- LiveKit Cloud account (or self-hosted LiveKit server)

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

4. Run the agent:
```bash
python agent.py dev
```

## Deployment

For production deployment, see the [LiveKit Agents Deployment Guide](https://docs.livekit.io/agents/deployment/).

### Deploy to Railway/Render

1. Push this folder to a GitHub repository
2. Connect to Railway/Render
3. Set environment variables
4. Deploy
