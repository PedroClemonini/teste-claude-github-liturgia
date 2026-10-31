'use server';

import { signOut } from '@/lib/auth.js';

export async function signOutAction() {
  await signOut({ redirectTo: '/entrar' });
}
