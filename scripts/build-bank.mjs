// Build the compact FluidR3 sample bank used by the app.
//
//   node scripts/build-bank.mjs [path/to/FluidR3_GM.sf2]
//
// The SF2 itself is never shipped: this extracts the zones the built-in
// presets need, mixes them to mono, resamples to 44.1 kHz with two velocity
// layers and writes assets/fluid-lite.bank (magic + JSON manifest + Int16 PCM).
// Per-preset loudness is calibrated after the first pass so every sampled
// instrument sits at the same reference RMS. FluidR3 GM is MIT licensed
// (Frank Wen, Toby Smithe); the bank is a derived work.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSf2, resolveZones } from './sf2.mjs';
import { setBank, sampleVoice } from '../src/sampler.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SF2 = process.argv[2] || process.env.FLUIDR3_SF2 || 'C:/Users/89561/AppData/Local/Temp/sf2/FluidR3_GM.sf2';
const RATE = 44100;
const LAYERS = [{ velocity: 40 }, { velocity: 96 }];
const REFERENCE_PITCH = {
  piano: 60, epiano: 64, strings: 60, violin: 72, cello: 48, flute: 72, clarinet: 64,
  brass: 60, trumpet: 67, trombone: 55, oboe: 72, harp: 60, choir: 60, bass: 43,
  pad: 60, pluck: 72, lead: 64, drums: 36,
};

// Muse Grid preset -> General MIDI bank/program.
const PRESET_MAP = {
  piano: { bank: 0, program: 0 },
  epiano: { bank: 0, program: 4 },
  strings: { bank: 0, program: 48 },
  violin: { bank: 0, program: 40 },
  cello: { bank: 0, program: 42 },
  flute: { bank: 0, program: 73 },
  clarinet: { bank: 0, program: 71 },
  brass: { bank: 0, program: 60 },
  trumpet: { bank: 0, program: 56 },
  trombone: { bank: 0, program: 57 },
  oboe: { bank: 0, program: 68 },
  harp: { bank: 0, program: 46 },
  guitar: { bank: 0, program: 25 },
  organ: { bank: 0, program: 19 },
  marimba: { bank: 0, program: 12 },
  sax: { bank: 0, program: 65 },
  bassoon: { bank: 0, program: 70 },
  choir: { bank: 0, program: 52 },
  bass: { bank: 0, program: 58 },
  pad: { bank: 0, program: 89 },
  pluck: { bank: 0, program: 45 },
  lead: { bank: 0, program: 80 },
  drums: { bank: 128, program: 0 },
};

const parsed = parseSf2(SF2);
const samples = [];
const sampleIndex = new Map();
const pcmChunks = [];

function resample(source, from, to, sourceRate) {
  const length = Math.max(2, Math.round((to - from) * RATE / sourceRate));
  const out = new Int16Array(length);
  const step = (to - from) / length;
  for (let i = 0; i < length; i++) {
    const pos = from + i * step;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = source[Math.min(idx, source.length - 1)];
    const b = source[Math.min(idx + 1, source.length - 1)];
    out[i] = Math.round(a + (b - a) * frac);
  }
  return out;
}

const isRightChannel = (sample) => sample.sampleType === 2 || /\(R\)\s*$/.test(sample.name);

for (const [presetName, preset] of Object.entries(PRESET_MAP)) {
  const zones = resolveZones(parsed, preset.bank, preset.program);
  const kept = new Map();
  for (const layer of LAYERS) {
    const candidates = zones.filter((zone) => zone.velRange[0] <= layer.velocity && zone.velRange[1] >= layer.velocity);
    for (const zone of candidates) {
      if (isRightChannel(zone.sample)) continue;
      const key = `${zone.keyRange.join('-')}:${zone.velRange.join('-')}`;
      if (kept.has(key)) continue;
      const source = zone.sample;
      const sourceRate = source.sampleRate || 44100;
      const looped = zone.loop && zone.loopEnd > zone.loopStart;
      const keepTo = Math.min(source.pcm.length, looped ? zone.loopEnd + Math.round(.35 * sourceRate) : Math.round(3 * sourceRate));
      if (keepTo < 64) continue;
      const data = resample(source.pcm, 0, keepTo, sourceRate);
      const length = data.length;
      const sampleKey = length + ':' + looped + ':' + Math.round((zone.loopStart * RATE) / sourceRate);
      let index = sampleIndex.get(sampleKey);
      if (index === undefined) {
        index = samples.length;
        samples.push({ offset: 0, length });
        pcmChunks.push(data);
        sampleIndex.set(sampleKey, index);
      }
      kept.set(key, {
        sample: index,
        keyLow: zone.keyRange[0],
        keyHigh: zone.keyRange[1],
        velLow: zone.velRange[0],
        velHigh: zone.velRange[1],
        rootKey: zone.rootKey,
        tune: Math.round(zone.tune * 100) / 100,
        attenuation: zone.attenuation,
        env: {
          delay: +zone.env.delay.toFixed(4),
          attack: +zone.env.attack.toFixed(4),
          hold: +zone.env.hold.toFixed(4),
          decay: +zone.env.decay.toFixed(3),
          sustain: +zone.env.sustain.toFixed(5),
          release: +zone.env.release.toFixed(3),
        },
        loop: looped,
        loopStart: looped ? Math.round((zone.loopStart * RATE) / sourceRate) : 0,
        loopEnd: looped ? Math.round((zone.loopEnd * RATE) / sourceRate) : 0,
        sampleModes: zone.sampleModes ?? 0,
      });
    }
  }
  preset.zones = [...kept.values()];
  preset.gain = 1;
  console.log(presetName.padEnd(9), 'program', String(preset.program).padStart(3), 'zones', String(kept.size).padStart(3));
}

let totalFrames = 0;
for (const chunk of pcmChunks) totalFrames += chunk.length;
const pcm = new Int16Array(totalFrames);
let cursor = 0;
for (let i = 0; i < pcmChunks.length; i++) {
  samples[i].offset = cursor;
  pcm.set(pcmChunks[i], cursor);
  cursor += pcmChunks[i].length;
}

function encode(manifest) {
  const manifestBytes = Buffer.from(JSON.stringify(manifest), 'utf8');
  const padded = (8 + manifestBytes.length) % 2 ? manifestBytes.length + 1 : manifestBytes.length;
  const header = Buffer.alloc(8 + padded);
  header.write('MGB1', 0, 'ascii');
  header.writeUInt32LE(manifestBytes.length, 4);
  manifestBytes.copy(header, 8);
  return Buffer.concat([header, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)]);
}

const manifest = {
  version: 2,
  rate: RATE,
  source: 'FluidR3 GM (FluidR3_GM.sf2, Debian fluid-soundfont-gm 3.1-6)',
  license: 'MIT — Copyright 2000-2002, 2008 Frank Wen; 2008 Toby Smithe',
  presets: Object.fromEntries(Object.entries(PRESET_MAP).map(([name, preset]) => [name, {
    program: preset.program,
    gain: preset.gain,
    zones: preset.zones,
  }])),
  samples,
};

// Calibrate: render a reference note per preset through the very sampler that
// will play it, then trim each preset so C4-ish notes sit at the same RMS.
setBank(encode(manifest));
for (const name of Object.keys(manifest.presets)) {
  if (name === 'drums') continue;
  const pitch = REFERENCE_PITCH[name] ?? 60;
  const buffer = sampleVoice(name, { pitch, start: 0, duration: 1, velocity: .75 }, 60, RATE);
  if (!buffer) continue;
  const from = Math.round(.1 * RATE), to = Math.min(buffer.length, Math.round(.4 * RATE));
  let sum = 0;
  for (let i = from; i < to; i++) sum += buffer[i] * buffer[i];
  const rms = Math.sqrt(sum / Math.max(1, to - from)) || 1e-6;
  manifest.presets[name].gain = Math.max(.15, Math.min(4, Math.round((.07 / rms) * 100) / 100));
}
const bytes = encode(manifest);
const outDir = resolve(root, 'assets');
mkdirSync(outDir, { recursive: true });
const file = resolve(outDir, 'fluid-lite.bank');
writeFileSync(file, bytes);
const zones = Object.values(manifest.presets).reduce((n, preset) => n + preset.zones.length, 0);
console.log('wrote', file, 'zones', zones, 'samples', samples.length,
  'pcm', (pcm.byteLength / 1048576).toFixed(1), 'MB', 'total', (bytes.length / 1048576).toFixed(1), 'MB');
void readFileSync;
