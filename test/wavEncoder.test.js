const test = require('node:test');
const assert = require('node:assert/strict');

const { encodeWav, HEADER_BYTES } = require('../utils/wavEncoder');

// Read a WAV header back with nothing but Buffer methods, so the test does not
// share any code with the encoder.
function parse(wav) {
  return {
    riff: wav.toString('ascii', 0, 4),
    riffSize: wav.readUInt32LE(4),
    wave: wav.toString('ascii', 8, 12),
    fmt: wav.toString('ascii', 12, 16),
    fmtSize: wav.readUInt32LE(16),
    format: wav.readUInt16LE(20),
    channels: wav.readUInt16LE(22),
    sampleRate: wav.readUInt32LE(24),
    byteRate: wav.readUInt32LE(28),
    blockAlign: wav.readUInt16LE(32),
    bitDepth: wav.readUInt16LE(34),
    data: wav.toString('ascii', 36, 40),
    dataSize: wav.readUInt32LE(40)
  };
}

test('writes a valid 16-bit mono PCM header and keeps the samples intact', () => {
  const pcm = Buffer.alloc(48000 * 2);
  for (let i = 0; i < pcm.length; i += 2) pcm.writeInt16LE((i * 7) % 30000, i);

  const wav = encodeWav(pcm, { channels: 1, sampleRate: 48000, bitDepth: 16 });
  const h = parse(wav);

  assert.equal(h.riff, 'RIFF');
  assert.equal(h.wave, 'WAVE');
  assert.equal(h.fmt, 'fmt ');
  assert.equal(h.fmtSize, 16);
  assert.equal(h.format, 1, 'PCM');
  assert.equal(h.channels, 1);
  assert.equal(h.sampleRate, 48000);
  assert.equal(h.byteRate, 96000);
  assert.equal(h.blockAlign, 2);
  assert.equal(h.bitDepth, 16);
  assert.equal(h.data, 'data');
  assert.equal(h.dataSize, pcm.length);
  assert.equal(h.riffSize, wav.length - 8, 'RIFF size counts everything after its own 8 bytes');
  assert.equal(wav.length, HEADER_BYTES + pcm.length);
  assert.ok(wav.subarray(HEADER_BYTES).equals(pcm), 'samples must be copied unchanged');
});

test('derives byte rate and block align from the format', () => {
  const h = parse(encodeWav(Buffer.alloc(2 * 3 * 10), { channels: 2, sampleRate: 44100, bitDepth: 24 }));

  assert.equal(h.channels, 2);
  assert.equal(h.blockAlign, 6);
  assert.equal(h.byteRate, 44100 * 6);
  assert.equal(h.bitDepth, 24);
});

test('an empty buffer is a valid, empty file', () => {
  const wav = encodeWav(Buffer.alloc(0));
  const h = parse(wav);

  assert.equal(wav.length, HEADER_BYTES);
  assert.equal(h.dataSize, 0);
  assert.equal(h.riffSize, HEADER_BYTES - 8);
});

test('rejects input that would write a corrupt file', () => {
  assert.throws(() => encodeWav('not a buffer'), TypeError);
  assert.throws(() => encodeWav(Buffer.alloc(3), { bitDepth: 16 }), /whole number/, 'half a sample');
  assert.throws(() => encodeWav(Buffer.alloc(6), { channels: 2, bitDepth: 16 }), /whole number/, 'partial frame');
  assert.throws(() => encodeWav(Buffer.alloc(2), { channels: 0 }), /channel/);
  assert.throws(() => encodeWav(Buffer.alloc(2), { sampleRate: 0 }), /sample rate/);
  assert.throws(() => encodeWav(Buffer.alloc(2), { bitDepth: 12 }), /bit depth/);
});
