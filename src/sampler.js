// Runtime reader for the baked FluidR3 sample bank (assets/fluid-lite.bank).
// The bank holds mono 32 kHz PCM plus a JSON manifest of playable zones; this
// module turns it into note buffers with the same shape as the synth engine so
// browser playback and offline WAV export share one path.
//
// FluidR3 GM is MIT licensed (Frank Wen, Toby Smithe). Only the derived
// compact bank is shipped; the original SoundFont is not.

const MAGIC = 'MGB1';
let bank = null;

/** Parse a bank ArrayBuffer (browser) or Buffer (server). */
export function setBank(buffer) {
  const bytes = new Uint8Array(buffer);
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== MAGIC) throw new Error('不是有效的采样库文件');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const manifestLength = view.getUint32(4, true);
  const manifestText = new TextDecoder().decode(bytes.subarray(8, 8 + manifestLength));
  const manifest = JSON.parse(manifestText);
  let pcmOffset = 8 + manifestLength;
  if (pcmOffset % 2) pcmOffset++;
  bank = {
    rate: manifest.rate,
    presets: manifest.presets,
    samples: manifest.samples,
    pcm: new Int16Array(bytes.buffer, bytes.byteOffset + pcmOffset, Math.floor((bytes.byteLength - pcmOffset) / 2)),
    source: manifest.source,
    license: manifest.license,
  };
  return info();
}

export function hasBank() {
  return bank !== null;
}

export function info() {
  if (!bank) return { ready: false };
  return {
    ready: true,
    rate: bank.rate,
    presets: Object.keys(bank.presets),
    source: bank.source,
    license: bank.license,
  };
}

export function clearBank() {
  bank = null;
}

const velocityGain = (velocity) => (velocity ** 1.4) * 1.15;

function sampleData(index) {
  const entry = bank.samples[index];
  return bank.pcm.subarray(entry.offset, entry.offset + entry.length);
}

/**
 * Render one note with the sampled preset, or null when the bank has no such
 * preset (the caller then falls back to the synthesizer).
 */
export function sampleVoice(preset, note, bpm, rate = 44100) {
  if (!bank) return null;
  const entry = bank.presets[preset];
  if (!entry) return null;
  const duration = note.duration * 60 / bpm;
  const velocity = Math.round(note.velocity * 127);
  const zones = entry.zones.filter((zone) => note.pitch >= zone.keyLow && note.pitch <= zone.keyHigh && velocity >= zone.velLow && velocity <= zone.velHigh);
  if (zones.length === 0) return null;
  const length = Math.ceil((duration + 0.9) * rate);
  const out = new Float32Array(length);
  for (const zone of zones) {
    renderZone(out, zone, note, duration, rate, bank.rate / rate, entry.gain);
  }
  return out;
}

function renderZone(out, zone, note, duration, rate, rateRatio, presetGain) {
  const pcm = sampleData(zone.sample);
  const noteSamples = duration * rate;
  const ratio = 2 ** ((note.pitch - zone.rootKey + zone.tune / 100) / 12);
  const step = rateRatio * ratio;
  const { attack, hold, decay, sustain, release, delay } = zone.env;
  const attackSamples = attack * rate, holdSamples = hold * rate, decaySamples = decay * rate;
  const releaseSamples = Math.max(1, release * rate);
  const gain = 10 ** (-zone.attenuation / 20) * velocityGain(note.velocity) * presetGain;
  const looped = zone.loop;
  const loopStart = Math.max(0, Math.min(zone.loopStart, pcm.length - 2));
  const loopEnd = Math.max(loopStart + 2, Math.min(zone.loopEnd, pcm.length - 1));
  let pos = 0, gainNow = 0, heldGain;
  for (let i = 0; i < out.length; i++) {
    const t = i - delay * rate;
    if (!looped || i < noteSamples) {
      if (t < 0) gainNow = 0;
      else if (t < attackSamples) gainNow = attackSamples > 0 ? t / attackSamples : 1;
      else if (t < attackSamples + holdSamples) gainNow = 1;
      else if (t < attackSamples + holdSamples + decaySamples) {
        const p = (t - attackSamples - holdSamples) / Math.max(1, decaySamples);
        gainNow = sustain ** p;
      } else gainNow = sustain;
    } else {
      if (heldGain === undefined) heldGain = Math.max(gainNow, 1e-5);
      const p = Math.min(1, (i - noteSamples) / releaseSamples);
      gainNow = heldGain * (1e-5 / heldGain) ** p;
    }
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = pcm[Math.min(idx, pcm.length - 1)] / 32768;
    const b = pcm[Math.min(idx + 1, pcm.length - 1)] / 32768;
    out[i] += (a + (b - a) * frac) * gainNow * gain;
    pos += step;
    if (looped && i < noteSamples) {
      if (pos >= loopEnd) pos = loopStart + ((pos - loopStart) % (loopEnd - loopStart));
    } else if (pos >= pcm.length - 1) {
      pos = pcm.length - 1;
    }
  }
}
