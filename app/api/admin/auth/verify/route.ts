import { NextResponse } from 'next/server';
import crypto from 'crypto';

const EXPECTED_TOKENS = [
  crypto.createHash('sha256').update('nugep123-nugep-curator-salt-2026').digest('hex'),
  crypto.createHash('sha256').update('nugep 123-nugep-curator-salt-2026').digest('hex')
];

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token ausente' }, { status: 400 });
    }

    if (EXPECTED_TOKENS.includes(token)) {
      return NextResponse.json({ success: true, authorized: true });
    }

    return NextResponse.json({ success: false, authorized: false, error: 'Token inválido' }, { status: 401 });
  } catch (error: any) {
    console.error('Error verifying token:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
