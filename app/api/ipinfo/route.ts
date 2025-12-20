// File: app/api/ipinfo/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await axios.get('https://ipapi.co/json/');
    const data = response.data;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch IP info' }, { status: 500 });
  }
}
