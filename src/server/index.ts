/**
 * Standalone WebSocket server entry point
 * Run with: npx ts-node --project tsconfig.server.json src/server/index.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { startWebSocketServer } from './ws-relay';

const port = parseInt(process.env.WS_PORT || '3001', 10);
startWebSocketServer(port);
