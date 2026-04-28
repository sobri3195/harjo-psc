import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.4';

type Payload = {
  emergency_report_id: string;
  latitude: number;
  longitude: number;
  severity: 'ringan' | 'sedang' | 'berat' | 'kritis';
};

const url = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const payload = (await req.json()) as Payload;
    if (!payload.emergency_report_id || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude) || !payload.severity) {
      return json({ error: 'Invalid payload' }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing bearer token' }, 401);
    }

    const client = createClient(url, serviceRoleKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const nearestPreview = await client.rpc('nearest_available_ambulance_realtime', {
      p_latitude: payload.latitude,
      p_longitude: payload.longitude,
      p_limit: 1,
      p_max_distance_km: payload.severity === 'kritis' ? 50 : 30
    });

    if (nearestPreview.error) {
      return json({ error: nearestPreview.error.message }, 400);
    }

    if (!nearestPreview.data?.length) {
      return json({ error: 'No ambulance available in realtime radius' }, 404);
    }

    const { data, error } = await client.rpc('dispatch_nearest_ambulance', {
      p_emergency_report_id: payload.emergency_report_id,
      p_latitude: payload.latitude,
      p_longitude: payload.longitude,
      p_severity: payload.severity
    });

    if (error) {
      return json({ error: error.message }, 400);
    }

    const first = data?.[0];
    return json({
      dispatch_id: first?.dispatch_id,
      ambulance_id: first?.ambulance_id,
      eta_minutes: first?.eta_minutes,
      distance_km: first?.distance_km,
      status: first?.status
    });
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
