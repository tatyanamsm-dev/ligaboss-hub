import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'edge'

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
