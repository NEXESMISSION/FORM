import { NextResponse } from 'next/server'

// In development, always return a stable id so the update checker never triggers a refresh loop
const DEV_BUILD_ID = 'development'

let cachedBuildId: string | null = null

export async function GET() {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({ buildId: DEV_BUILD_ID, version: DEV_BUILD_ID })
  }
  if (!cachedBuildId) {
    cachedBuildId = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      process.env.BUILD_ID ||
      process.env.NEXT_PUBLIC_BUILD_ID ||
      `build-${Date.now()}`
  }
  return NextResponse.json({ buildId: cachedBuildId, version: cachedBuildId })
}
