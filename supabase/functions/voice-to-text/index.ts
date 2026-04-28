import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type Payload = {
  audio_base64?: string;
  audio_file_url?: string;
  language?: string;
};

const keywordSeverityMap: Record<string, 'ringan' | 'sedang' | 'berat' | 'kritis'> = {
  pingsan: 'kritis',
  tidak: 'kritis',
  napas: 'berat',
  darah: 'berat',
  kecelakaan: 'berat',
  nyeri: 'sedang',
  demam: 'ringan'
};

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const payload = (await req.json()) as Payload;
    if (!payload.audio_base64 && !payload.audio_file_url) {
      return new Response(JSON.stringify({ error: 'audio_file_url or audio_base64 is required' }), { status: 400 });
    }

    // Placeholder transcription; plug your ASR provider (Whisper/GCP/etc) using env key.
    const transcription =
      'Korban kecelakaan lalu lintas, mengalami sesak napas dan perdarahan di area kepala.';

    const lowered = transcription.toLowerCase();
    const detectedSeverity = Object.entries(keywordSeverityMap).reduce<'ringan' | 'sedang' | 'berat' | 'kritis'>(
      (acc, [keyword, severity]) => (lowered.includes(keyword) ? severity : acc),
      'sedang'
    );

    const detectedType = lowered.includes('kecelakaan') ? 'trauma' : lowered.includes('napas') ? 'respiratory' : 'general';

    return new Response(
      JSON.stringify({
        transcription,
        detected_emergency_type: detectedType,
        detected_severity: detectedSeverity,
        confidence_score: 0.79,
        language: payload.language ?? 'id-ID'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
