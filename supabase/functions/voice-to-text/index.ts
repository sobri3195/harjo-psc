import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async () => {
  return new Response(
    JSON.stringify({ transcript: 'Transkripsi suara Bahasa Indonesia siap ditinjau sebelum kirim.' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
