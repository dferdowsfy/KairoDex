import { NextRequest } from 'next/server'
import { handleChatPOST } from '@/app/ai/chat/route'

export async function POST(req: NextRequest) {
  return handleChatPOST(req)
}
