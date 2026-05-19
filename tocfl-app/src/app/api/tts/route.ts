import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get('text');
  if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });

  const MAX_CHUNK = 180;
  if (text.length <= MAX_CHUNK) return await fetchTTS(text);

  // Cắt text dài thành đoạn nhỏ
  const chunks = splitText(text, MAX_CHUNK);
  try {
    const buffers: ArrayBuffer[] = [];
    for (const chunk of chunks) {
      const r = await fetchTTSRaw(chunk);
      if (!r) throw new Error('Chunk failed');
      buffers.push(await r.arrayBuffer());
    }
    const total = buffers.reduce((s, b) => s + b.byteLength, 0);
    const merged = new Uint8Array(total);
    let off = 0;
    for (const b of buffers) { merged.set(new Uint8Array(b), off); off += b.byteLength; }
    return new NextResponse(merged.buffer, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return NextResponse.json({ error: 'TTS failed' }, { status: 502 });
  }
}

function splitText(text: string, max: number): string[] {
  const chunks: string[] = [];
  let r = text;
  while (r.length > 0) {
    if (r.length <= max) { chunks.push(r); break; }
    let cut = max;
    for (const p of ['。', '！', '？', '；', '，', '、']) {
      const pos = r.lastIndexOf(p, max);
      if (pos > max * 0.6) { cut = pos + 1; break; }
    }
    chunks.push(r.substring(0, cut));
    r = r.substring(cut);
  }
  return chunks;
}

async function fetchTTSRaw(text: string) {
  const h = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
  for (const url of [
    `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-TW&client=gtx&q=${encodeURIComponent(text)}`,
    `https://dict.moe.gov.tw/tts/tw/read.php?code=0&text=${encodeURIComponent(text)}`,
  ]) {
    try { const r = await fetch(url, { headers: h }); if (r.ok) return r; } catch {}
  }
  return null;
}

async function fetchTTS(text: string) {
  const r = await fetchTTSRaw(text);
  if (!r) return NextResponse.json({ error: 'TTS failed' }, { status: 502 });
  return new NextResponse(await r.arrayBuffer(), {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
  });
}
