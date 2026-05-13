/**
 * Folksonomia Digital 2.0 — Guard de Autenticação para Rotas Admin
 * 
 * Verifica se a requisição possui autenticação válida antes de permitir
 * acesso a rotas administrativas e de ML.
 * 
 * Métodos suportados:
 * 1. Bearer token (ADMIN_SECRET via env)
 * 2. Supabase Auth session (futuro)
 */

import { NextRequest, NextResponse } from 'next/server';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  role?: string;
  error?: string;
}

/**
 * Verifica autenticação para rotas admin.
 * Retorna AuthResult com status e informações do usuário.
 */
export async function verifyAdminAuth(req: NextRequest): Promise<AuthResult> {
  // 1. Verificar Bearer token (ADMIN_SECRET)
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get('authorization');

  if (adminSecret && authHeader) {
    if (authHeader === `Bearer ${adminSecret}`) {
      return {
        authenticated: true,
        userId: 'admin',
        role: 'admin'
      };
    }
  }

  // 2. Verificar cookie de sessão Supabase (quando implementado)
  const supabaseToken = req.cookies.get('sb-access-token')?.value;
  if (supabaseToken) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      const { data: { user }, error } = await supabase.auth.getUser(supabaseToken);
      if (user && !error) {
        return {
          authenticated: true,
          userId: user.id,
          role: 'admin' // TODO: verificar role no profiles
        };
      }
    } catch {
      // Supabase auth falhou, continuar para próximo método
    }
  }

  // 3. Em desenvolvimento, permitir acesso se não há ADMIN_SECRET configurado
  if (!adminSecret && process.env.NODE_ENV === 'development') {
    return {
      authenticated: true,
      userId: 'dev-mode',
      role: 'admin'
    };
  }

  return {
    authenticated: false,
    error: 'Autenticação necessária. Envie Bearer token ou configure ADMIN_SECRET.'
  };
}

/**
 * Helper: retorna 401 se não autenticado.
 * Uso: const auth = await requireAdmin(req); if (auth) return auth;
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const result = await verifyAdminAuth(req);
  if (!result.authenticated) {
    return NextResponse.json(
      { error: result.error || 'Não autorizado' },
      { status: 401 }
    );
  }
  return null; // Autenticado, continuar
}
