import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

type OfflineAction = {
  idempotency_key: string;
  action_type: string;
  payload: Record<string, unknown>;
  client_updated_at: string;
};

const url = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const { actions } = (await req.json()) as { actions: OfflineAction[] };
    if (!Array.isArray(actions)) {
      return new Response(JSON.stringify({ error: 'actions must be an array' }), { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    const client = createClient(url, serviceRoleKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {}
      }
    });

    const results: Array<{ idempotency_key: string; success: boolean; status: string; conflict?: string }> = [];

    for (const action of actions) {
      const row = {
        user_id: null,
        client_action_id: action.idempotency_key,
        action_type: action.action_type,
        payload: action.payload,
        status: 'processing' as const
      };

      const { data: inserted, error: insertError } = await client.from('sync_queue').insert(row).select('id').single();
      if (insertError) {
        results.push({
          idempotency_key: action.idempotency_key,
          success: false,
          status: 'failed',
          conflict: insertError.message
        });
        continue;
      }

      // Simple conflict strategy: server-wins for stale client timestamps.
      const isConflict = new Date(action.client_updated_at).getTime() < Date.now() - 1000 * 60 * 60 * 24;
      const finalStatus = isConflict ? 'conflict' : 'success';

      await client
        .from('sync_queue')
        .update({
          status: finalStatus,
          processed_at: new Date().toISOString(),
          last_error: isConflict ? 'stale_client_update' : null
        })
        .eq('id', inserted.id);

      results.push({
        idempotency_key: action.idempotency_key,
        success: !isConflict,
        status: finalStatus,
        conflict: isConflict ? 'server_wins_stale_client_update' : undefined
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
