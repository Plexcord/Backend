export function GET() {
  return Response.json({ clientId: process.env.CLIENT_ID, redirectUri: process.env.REDIRECT_URI });
}
