// The only file that imports @breezystack/lamejs -- keeps the encoder out of
// the main app bundle entirely (Next.js code-splits worker entry points), so
// it's only ever fetched when a user actually exports a recording to MP3.

import { Mp3Encoder } from "@breezystack/lamejs";

const ENCODE_BLOCK_SAMPLES = 1152;
const BITRATE_KBPS = 128;

interface EncodeRequest {
  pcm: Int16Array;
  sampleRate: number;
}

self.onmessage = (e: MessageEvent<EncodeRequest>) => {
  try {
    const { pcm, sampleRate } = e.data;
    const encoder = new Mp3Encoder(1, sampleRate, BITRATE_KBPS);
    const chunks: Uint8Array[] = [];

    for (let i = 0; i < pcm.length; i += ENCODE_BLOCK_SAMPLES) {
      const block = encoder.encodeBuffer(pcm.subarray(i, i + ENCODE_BLOCK_SAMPLES));
      if (block.length > 0) chunks.push(block);
    }
    const tail = encoder.flush();
    if (tail.length > 0) chunks.push(tail);

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const mp3 = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      mp3.set(chunk, offset);
      offset += chunk.length;
    }

    self.postMessage({ type: "done", mp3 });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "MP3 encoding failed",
    });
  }
};
