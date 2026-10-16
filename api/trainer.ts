// Vercel serverless function: POST /api/trainer
// All logic lives in server/trainer so it can be tested and run locally.
import { handleTrainer } from '../server/trainer/handlers.js'

export function POST(request: Request): Promise<Response> {
  return handleTrainer(request)
}
