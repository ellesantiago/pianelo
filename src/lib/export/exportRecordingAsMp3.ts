"use client";

// Renders a StoredRecording to MP3 and downloads it, entirely client-side --
// consistent with recordings never leaving the browser (see
// lib/recordings/localStore.ts). Mirrors downloadRecordingAsJson's
// blob-download pattern, just async because rendering + encoding take real
// (if brief) time.

import { renderEventsToAudioBuffer } from "@/lib/audio/offlineRender";
import type { StoredRecording } from "@/lib/recordings/localStore";

interface WorkerResult {
  type: "done" | "error";
  mp3?: Uint8Array;
  message?: string;
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function encodeMp3(pcm: Int16Array, sampleRate: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./mp3Encoder.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<WorkerResult>) => {
      worker.terminate();
      if (e.data.type === "done" && e.data.mp3) {
        resolve(e.data.mp3);
      } else {
        reject(new Error(e.data.message ?? "MP3 encoding failed"));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(e.error ?? new Error("MP3 encoding failed"));
    };
    worker.postMessage({ pcm, sampleRate }, [pcm.buffer]);
  });
}

export async function exportRecordingAsMp3(recording: StoredRecording): Promise<void> {
  const audioBuffer = await renderEventsToAudioBuffer(recording.events);
  const pcm16 = floatTo16BitPCM(audioBuffer.getChannelData(0));
  const mp3Bytes = await encodeMp3(pcm16, audioBuffer.sampleRate);

  // mp3Bytes crosses a postMessage structured-clone boundary, which widens
  // its buffer's type to ArrayBufferLike (ArrayBuffer | SharedArrayBuffer) --
  // it's always a plain ArrayBuffer at runtime (built via `new Uint8Array(n)`
  // in the worker), just not something BlobPart's stricter type reflects.
  const blob = new Blob([mp3Bytes as BlobPart], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${recording.name.replace(/[^\w-]+/g, "_") || "recording"}.mp3`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
