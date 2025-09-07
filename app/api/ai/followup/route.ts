import { NextRequest } from 'next/server'
import { handleFollowupPOST, handleFollowupGET } from '@/app/ai/followup/route'

export async function GET(req: NextRequest) {
  return handleFollowupGET(req)
}

export async function POST(req: NextRequest) {
  return handleFollowupPOST(req)
}
