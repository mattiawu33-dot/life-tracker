// Vercel serverless function: GET /api/trainer-status
import { handleStatus } from '../server/trainer/handlers.js'

export function GET(request: Request): Promise<Response> {
  return handleStatus(request)
}
