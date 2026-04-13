import fp from 'fastify-plugin';
import { createClient } from '@supabase/supabase-js';
import type { FastifyInstance } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient;
  }
}

/**
 * Creates a Proxy-based stub that returns { data: null, error } for any query chain.
 * Handles any method call pattern (from().select().eq().order().single() etc.)
 */
function createSupabaseStub(): SupabaseClient {
  const NOT_CONFIGURED = { message: 'Supabase not configured' };
  const terminalResult = { data: null, error: NOT_CONFIGURED, count: 0 };

  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      // Terminal methods that return data
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => terminalResult;
      }
      // then/catch for async compatibility
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return Promise.resolve(terminalResult)[prop as keyof Promise<any>].bind(
          Promise.resolve(terminalResult)
        );
      }
      // Any other method returns the proxy for chaining
      return () => new Proxy({}, handler);
    },
  };

  return new Proxy({}, handler) as unknown as SupabaseClient;
}

const supabasePlugin = fp(async (fastify: FastifyInstance) => {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    fastify.log.warn('Supabase not configured — using stub');
    fastify.decorate('supabase', createSupabaseStub());
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  fastify.decorate('supabase', supabase);
  fastify.log.info('Supabase client initialized');
});

export default supabasePlugin;
