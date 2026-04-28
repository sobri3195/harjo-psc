import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (req) => {
  const body = await req.json();
  return new Response(JSON.stringify({ delivered: true, body }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
