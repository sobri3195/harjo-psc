import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

type Payload = {
  ambulance_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
};

const url = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const payload = (await req.json()) as Payload;
    if (!payload.ambulance_id || !payload.latitude || !payload.longitude) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    const client = createClient(url, serviceRoleKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {}
      }
    });

    const { data, error } = await client
      .from('ambulance_tracking')
      .insert({
        ambulance_id: payload.ambulance_id,
        status: 'en_route',
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy_meters: payload.accuracy,
        speed_kph: payload.speed,
        heading: payload.heading
      })
      .select('*')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(
      JSON.stringify({
        saved_tracking_record: data,
        realtime_event: {
          channel: 'ambulance_tracking',
          event: 'INSERT',
          ambulance_id: payload.ambulance_id
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
