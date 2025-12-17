import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable strict mode to prevent double-mount in development
  // (which causes WebSocket connection issues)
  reactStrictMode: false,
  
  // Allow audio/video features and configure CSP for ngrok
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'microphone=self',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://ngrok.com https://*.ngrok.com https://*.ngrok-free.app; font-src 'self' data:; connect-src 'self' wss: https: data:; media-src 'self' blob:; frame-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
