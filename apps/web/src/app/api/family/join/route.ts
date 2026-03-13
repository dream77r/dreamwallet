import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  // Redirect to dashboard family page with token for client-side joining
  return NextResponse.redirect(new URL(`/dashboard/family?invite=${token}`, req.url))
}
