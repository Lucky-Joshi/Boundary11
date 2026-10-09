import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

let anonClient = null;
let serviceClient = null;

function anon() {
  if (!anonClient) anonClient = createClient(env.supabase.url, env.supabase.anonKey);
  return anonClient;
}

function service() {
  if (!serviceClient) serviceClient = createClient(env.supabase.url, env.supabase.serviceRoleKey, { auth: { persistSession: false } });
  return serviceClient;
}

function publicUser({ id, email, fullName, role, createdAt }) {
  return { id, email, fullName, role, createdAt };
}

function sessionToResult(user, session) {
  return {
    token: session?.access_token ?? null,
    expiresAt: session?.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user,
  };
}

/**
 * Supabase-backed auth provider.
 *
 * Uses Supabase Auth for credentials and sessions, and the `profiles` table
 * for app-level role/status data. Not exercisable without live credentials —
 * unit-testable only via the demo provider.
 */
export function createSupabaseAuthProvider() {
  return {
    mode: 'supabase',

    async login({ email, password }) {
      const { data, error } = await anon().auth.signInWithPassword({ email, password });
      if (error || !data?.user) throw ApiError.unauthorized('Incorrect email or password.');

      let profile = null;
      try {
        const { data: rows } = await service().from('profiles').select('*').eq('id', data.user.id).limit(1).maybeSingle();
        profile = rows;
      } catch {
        profile = null;
      }

      const status = profile?.status || 'active';
      if (status !== 'active') throw ApiError.forbidden('This account has been disabled.');

      const user = publicUser({
        id: data.user.id,
        email: data.user.email ?? email,
        fullName: profile?.full_name || data.user.user_metadata?.full_name || data.user.email,
        role: profile?.role || 'customer',
        createdAt: profile?.created_at || data.user.created_at,
      });
      return sessionToResult(user, data.session);
    },

    async register(input) {
      const email = String(input.email).toLowerCase();
      const { data: created, error } = await service().auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: input.fullName },
      });
      if (error) {
        if (/already.*exist|already registered/i.test(String(error.message))) {
          throw ApiError.conflict('An account with this email already exists.');
        }
        throw ApiError.internal(`Auth error: ${error.message}`);
      }

      await service().from('profiles').upsert(
        { id: created.user.id, email, full_name: input.fullName, role: 'customer', status: 'active' },
        { onConflict: 'id' },
      );

      const user = publicUser({
        id: created.user.id,
        email,
        fullName: input.fullName,
        role: 'customer',
        createdAt: created.user.created_at,
      });

      // Issue a session now that the account exists.
      const { data: sessionRes } = await anon().auth.signInWithPassword({ email, password: input.password });
      return sessionToResult(user, sessionRes.session);
    },

    async resolveSession(token) {
      if (!token) return { error: 'invalid' };
      const { data, error } = await anon().auth.getUser(token);
      if (error || !data?.user) {
        const expired =
          String(error?.message ?? '').match(/expired|jwt|session/i) || error?.status === 401;
        return { error: expired ? 'expired' : 'invalid' };
      }

      let profile = null;
      try {
        const { data: rows } = await service().from('profiles').select('*').eq('id', data.user.id).limit(1).maybeSingle();
        profile = rows;
      } catch {
        profile = null;
      }
      if (profile && profile.status !== 'active') return { error: 'disabled' };

      return {
        user: publicUser({
          id: data.user.id,
          email: data.user.email,
          fullName: profile?.full_name || data.user.user_metadata?.full_name || data.user.email,
          role: profile?.role || 'customer',
          createdAt: profile?.created_at || data.user.created_at,
        }),
      };
    },

    async revokeSession(token) {
      if (!token) return false;
      try {
        await service().auth.admin.signOut(token);
        return true;
      } catch {
        return false;
      }
    },
  };
}