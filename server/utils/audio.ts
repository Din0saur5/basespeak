function writeString(buffer: Buffer, offset: number, value: string) {
  buffer.write(value, offset, value.length, 'ascii');
}

function writeInt16(buffer: Buffer, offset: number, value: number) {
  buffer.writeInt16LE(value, offset);
}

function writeInt32(buffer: Buffer, offset: number, value: number) {
  buffer.writeInt32LE(value, offset);
}

export interface FallbackSpeech {
  base64: string;
  durationMs: number;
  mime: string;
}

export function synthesizeFallbackSpeech(text: string): FallbackSpeech {
  const clampedLength = Math.max(1, Math.min(8, Math.ceil(text.length / 40)));
  const durationSec = clampedLength;
  const sampleRate = 16000;
  const totalSamples = durationSec * sampleRate;
  const frequency = 440;
  const amplitude = 0.2 * 32767;

  const wavHeaderSize = 44;
  const dataSize = totalSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(wavHeaderSize + dataSize);

  // RIFF header
  writeString(buffer, 0, 'RIFF');
  writeInt32(buffer, 4, dataSize + 36);
  writeString(buffer, 8, 'WAVE');

  // fmt chunk
  writeString(buffer, 12, 'fmt ');
  writeInt32(buffer, 16, 16);
  writeInt16(buffer, 20, 1); // PCM
  writeInt16(buffer, 22, 1); // mono
  writeInt32(buffer, 24, sampleRate);
  writeInt32(buffer, 28, sampleRate * 2);
  writeInt16(buffer, 32, 2);
  writeInt16(buffer, 34, 16);

  // data chunk
  writeString(buffer, 36, 'data');
  writeInt32(buffer, 40, dataSize);

  for (let i = 0; i < totalSamples; i += 1) {
    const time = i / sampleRate;
    const value = Math.sin(2 * Math.PI * frequency * time) * amplitude;
    writeInt16(buffer, wavHeaderSize + i * 2, value);
  }

  return {
    base64: buffer.toString('base64'),
    durationMs: durationSec * 1000,
    mime: 'audio/wav',
  };
}
