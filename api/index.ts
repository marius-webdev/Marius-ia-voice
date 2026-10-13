import app from '../server.ts';

// Vercel Serverless Function entrypoint wrapping the Express application
export default function handler(req: any, res: any) {
  return app(req, res);
}
