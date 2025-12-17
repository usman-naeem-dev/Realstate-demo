import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { voice, prompt, agentSpeaksFirst } = body;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: 'LiveKit credentials not configured' },
        { status: 500 }
      );
    }

    // Create a unique room name for this session
    const roomName = `voice-session-${Date.now()}`;
    const participantName = `user-${Math.random().toString(36).substring(2, 8)}`;

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    // Store session metadata (voice, prompt, etc.) - this would be used by your LiveKit agent
    // In a real implementation, you'd pass this to your LiveKit agent server
    const metadata = {
      voice: voice || 'alloy',
      prompt: prompt || 'You are a helpful assistant.',
      agentSpeaksFirst: agentSpeaksFirst || false,
    };

    return NextResponse.json({
      token,
      wsUrl,
      roomName,
      participantName,
      metadata,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
