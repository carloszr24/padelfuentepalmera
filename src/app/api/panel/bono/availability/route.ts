import { NextResponse } from 'next/server';

export async function GET() {
  // BONO DESACTIVADO TEMPORALMENTE
  return NextResponse.json({ hasBono: false, restantes: 0 });
}

