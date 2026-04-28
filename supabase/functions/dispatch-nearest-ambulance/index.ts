import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req) => {
  const { emergencyId } = await req.json();
  return new Response(
    JSON.stringify({ success: true, emergencyId, message: 'Ambulans terdekat ditugaskan.' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
