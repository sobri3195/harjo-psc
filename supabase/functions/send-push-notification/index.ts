import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

type Payload = {
  target_user_ids?: string[];
  target_role?: 'reporter' | 'ambulance_driver' | 'paramedic' | 'doctor' | 'dispatcher' | 'admin' | 'super_admin';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
};

const url = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const payload = (await req.json()) as Payload;
    if ((!payload.target_user_ids || payload.target_user_ids.length === 0) && !payload.target_role) {
      return new Response(JSON.stringify({ error: 'target_user_ids or target_role is required' }), { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    const client = createClient(url, serviceRoleKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {}
      }
    });

    const targetUsers = payload.target_user_ids?.length
      ? payload.target_user_ids
      : (
          await client
            .from('profiles')
            .select('id')
            .eq('role', payload.target_role as string)
        ).data?.map((item) => item.id) ?? [];

    const queueRows = targetUsers.map((userId) => ({
      user_id: userId,
      title: payload.title,
      body: payload.body,
      payload: payload.data ?? {},
      priority: payload.priority ?? 'normal',
      target_role: payload.target_role,
      status: 'pending'
    }));

    const { data, error } = await client.from('notification_queue').insert(queueRows).select('*');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(
      JSON.stringify({
        notification_queue: data,
        delivery_status: 'queued'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
