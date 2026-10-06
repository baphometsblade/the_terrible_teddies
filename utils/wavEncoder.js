// Minimal PCM WAV encoder.
//
// scripts/generateSoundEffects.js used to require the `wav` package, which was
// never listed in package.json, so the script crashed on a clean install. All
// it did with the package was put a 44-byte RIFF header in front of raw
// samples, which is not worth a dependency.

const HEADER_BYTES = 44;

/**
 * Wrap raw little-endian PCM samples in a WAV container.
 *
 * @param {Buffer} pcm  interleaved samples, `bitDepth` bits each
 * @param {{channels?: number, sampleRate?: number, bitDepth?: number}} [format]
 * @returns {Buffer}
 */
function encodeWav(pcm, { channels = 1, sampleRate = 44100, bitDepth = 16 } = {}) {
  if (!Buffer.isBuffer(pcm)) {
    throw new TypeError('encodeWav: pcm must be a Buffer');
  }
  if (!Number.isInteger(channels) || channels < 1 || channels > 0xffff) {
    throw new RangeError(`encodeWav: invalid channel count ${channels}`);
  }
  if (!Number.isInteger(sampleRate) || sampleRate < 1) {
    throw new RangeError(`encodeWav: invalid sample rate ${sampleRate}`);
  }
  if (![8, 16, 24, 32].includes(bitDepth)) {
    throw new RangeError(`encodeWav: unsupported bit depth ${bitDepth}`);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  if (pcm.length % blockAlign !== 0) {
    throw new RangeError(`encodeWav: ${pcm.length} bytes is not a whole number of ${blockAlign}-byte frames`);
  }
  if (pcm.length > 0xffffffff - (HEADER_BYTES - 8)) {
    throw new RangeError('encodeWav: audio is too long for a WAV file');
  }

  const header = Buffer.alloc(HEADER_BYTES);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(HEADER_BYTES - 8 + pcm.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // size of the fmt chunk
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28); // byte rate
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

module.exports = { encodeWav, HEADER_BYTES };
