import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ success: false, error: 'Senha ausente' }, { status: 400 });
    }

    const cleanPass = password.trim().toLowerCase();

    if (cleanPass === 'nugep 123' || cleanPass === 'nugep123') {
      // Gerar um token persistente baseado na senha e um salt
      const token = crypto
        .createHash('sha256')
        .update(`${cleanPass}-nugep-curator-salt-2026`)
        .digest('hex');

      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json({ success: false, error: 'Senha Curatorial Inválida' }, { status: 401 });
  } catch (error: any) {
    console.error('Error logging in:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
