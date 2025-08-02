// src/pages/middleware/withAuth.js
import { NextResponse } from 'next/server';

export function middleware(req) {
  const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.split(' ')[1];

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Only match protected routes
export const config = {
  matcher: ['/home/:path*', '/settings'],
};
