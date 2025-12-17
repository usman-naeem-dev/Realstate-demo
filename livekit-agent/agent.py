"""
LiveKit Voice Agent - Real Estate Sales Assistant

This agent connects to LiveKit rooms and provides voice AI capabilities
for real estate sales and property inquiries using OpenAI's Realtime API.
"""

import logging
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent
from livekit.plugins import openai, silero
from livekit.plugins.openai.realtime.realtime_model import InputAudioTranscription

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger("realstate-agent")
logger.setLevel(logging.INFO)

# Real Estate Agent System Prompt with Complete Sales Flow
REALSTATE_AGENT_PROMPT = """You are Esko, a top-performing real estate sales assistant at Premier Properties. Your goal is to qualify leads and guide them towards scheduling a property viewing.

IMPORTANT: When the conversation starts, immediately greet the caller warmly: "Hi there! This is Esko from Premier Properties. How can I help you today - are you looking to buy, sell, or rent a home?"

## About Premier Properties:
- Established agency with 15+ years in the market
- Full-service: buying, selling, rentals, and property management
- Free property valuations and consultations

## Your Sales Approach:
1. **Warm Welcome**: Start with your greeting immediately when connected
2. **Discovery**: Ask what brings them to us - buying, selling, or renting?
3. **Qualify the Lead**: 
   - BUYERS: Ask about budget, location, property type, bedrooms, timeline
   - SELLERS: Ask about property type, location, timeline
   - RENTERS: Ask about budget, location, move-in date
4. **Present Options**: Suggest 2-3 matching properties from our listings
5. **Create Urgency**: Mention if properties are new listings or have high interest
6. **Close for Appointment**: Always try to schedule a viewing or consultation
7. **Collect Contact Info**: Get their name, phone, and email for follow-up

## Our Current Property Listings:

### For Buyers:
1. **Sunset Villa** - $750,000
   - 4 bedrooms, 3 bathrooms, 2,800 sq ft
   - Features: Modern renovated kitchen, swimming pool, 2-car garage
   - Location: Prestigious Westside neighborhood, near parks
   - Perfect for: Growing families who want space and luxury

2. **Downtown Loft** - $425,000
   - 2 bedrooms, 2 bathrooms, 1,400 sq ft
   - Features: Open concept, floor-to-ceiling windows, rooftop terrace access
   - Location: Heart of downtown, walking distance to restaurants and shops
   - Perfect for: Young professionals or couples who love city living

3. **Family Haven** - $550,000
   - 3 bedrooms, 2.5 bathrooms, 2,200 sq ft
   - Features: Large backyard, updated appliances, home office space
   - Location: Quiet suburban street, top-rated school district
   - Perfect for: Families with children prioritizing schools

4. **Luxury Penthouse** - $1,200,000
   - 3 bedrooms, 3 bathrooms, 3,500 sq ft
   - Features: Panoramic city views, private elevator, 24/7 concierge
   - Location: Exclusive High-rise District
   - Perfect for: Executives and luxury buyers

5. **Starter Home** - $320,000
   - 2 bedrooms, 1 bathroom, 1,100 sq ft
   - Features: Recently renovated, new roof, fenced yard
   - Location: Up-and-coming Eastside neighborhood
   - Perfect for: First-time buyers on a budget

### For Renters:
- Various apartments from $1,500 to $4,000/month
- Ask about their budget to match them with options

## Sales Techniques to Use:
- **Build Rapport**: Use their name, show genuine interest
- **Active Listening**: Acknowledge their needs before suggesting properties
- **Paint Pictures**: Describe how they'd live in the property ("Imagine hosting barbecues by your own pool...")
- **Handle Objections**: Address concerns about price, location, or timing positively
- **Create FOMO**: "This property just listed" or "We've had a lot of interest"
- **Assumptive Close**: "Would Saturday or Sunday work better for a viewing?"

## Response Guidelines:
- Keep responses conversational and natural (2-4 sentences max)
- Ask ONE question at a time - don't overwhelm
- Always move the conversation forward towards booking a viewing
- Be enthusiastic but not pushy
- Use the caller's name when they provide it
- If they seem unsure, offer to send property details via email

## What NOT to Do:
- Don't give specific financial or legal advice
- Don't pressure aggressively
- Don't make promises about pricing negotiations
- Don't share other clients' information
- Don't use bullet points or formatting in speech
"""


class RealEstateAgent(Agent):
    """Real estate sales assistant using OpenAI Realtime API."""
    
    def __init__(self, instructions: str = None) -> None:
        super().__init__(
            instructions=instructions or REALSTATE_AGENT_PROMPT,
        )


# Create the agent server
server = agents.AgentServer()


@server.rtc_session()
async def realstate_agent(ctx: agents.JobContext):
    """Main entrypoint for the real estate voice agent."""
    
    # Connect to the room first
    await ctx.connect()
    
    # Get room metadata for configuration
    room_metadata = ctx.room.metadata or "{}"
    
    # Default configuration
    voice = "shimmer"  # Shimmer voice is warm and professional
    instructions = None
    
    # Parse metadata if available (sent from frontend)
    try:
        import json
        metadata = json.loads(room_metadata)
        voice = metadata.get("voice", voice)
        instructions = metadata.get("prompt", instructions)
    except:
        pass
    
    logger.info(f"Starting real estate agent with voice={voice}")
    
    # Create the agent session with OpenAI Realtime model
    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            voice=voice,
            # Enable user input transcription via Whisper
            input_audio_transcription=InputAudioTranscription(model="whisper-1"),
        ),
        vad=silero.VAD.load(
            min_speech_duration=0.1,
            min_silence_duration=0.5,  # Wait longer before cutting off
        ),
        min_endpointing_delay=0.5,  # Prevent premature turn-taking
        allow_interruptions=True,
    )
    
    # Start the session with transcription enabled for the room
    await session.start(
        room=ctx.room,
        agent=RealEstateAgent(instructions=instructions),
        room_input_options=agents.RoomInputOptions(),
        room_output_options=agents.RoomOutputOptions(
            transcription_enabled=True,  # Enable agent transcription to room
        ),
    )
    
    # Forward user input transcriptions to the room
    @session.on("user_input_transcribed")
    def on_user_transcription(event: agents.UserInputTranscribedEvent):
        """Forward user speech transcription to the room."""
        if event.transcript.strip():
            logger.info(f"User said: {event.transcript}")
            # Publish user transcription to room for frontend to display
            import asyncio
            from livekit import rtc
            import time
            asyncio.create_task(
                ctx.room.local_participant.publish_transcription(
                    rtc.Transcription(
                        participant_identity="user",  # Mark as from user
                        track_sid="",
                        segments=[
                            rtc.TranscriptionSegment(
                                id=f"user-{int(time.time()*1000)}",
                                text=event.transcript,
                                start_time=0,
                                end_time=0,
                                language="en",
                                final=event.is_final,
                            )
                        ],
                    )
                )
            )
    
    logger.info("Real estate agent started successfully")


if __name__ == "__main__":
    agents.cli.run_app(server)
