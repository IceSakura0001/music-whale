// Minimal SoundFont 2 (SF2) reader used only at build time to bake the
// compact sample bank in assets/. It resolves presets to playable zones:
// key/velocity ranges, samples, tuning, attenuation, pan and volume envelope.
import { readFileSync } from 'node:fs';

const timecentsToSeconds = tc => (tc <= -32768 ? 0 : 2 ** (tc / 1200));
const centibelsToGain = cb => 10 ** (-cb / 200);

function readChunks(buf, listType) {
  const out = new Map();
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'LIST' && buf.toString('ascii', body, body + 4) === listType) {
      let sub = body + 4;
      while (sub + 8 <= body + size) {
        const subId = buf.toString('ascii', sub, sub + 4);
        const subSize = buf.readUInt32LE(sub + 4);
        out.set(subId, buf.subarray(sub + 8, sub + 8 + subSize));
        sub += 8 + subSize + (subSize % 2);
      }
    }
    pos = body + size + (size % 2);
  }
  return out;
}

function records(chunk, size, fields) {
  const list = [];
  for (let pos = 0; pos + size <= chunk.length; pos += size) {
    const record = {};
    for (const [name, type, offset] of fields) {
      record[name] = type === 's'
        ? chunk.toString('ascii', pos + offset, pos + offset + 20).replace(/\0.*$/, '')
        : chunk[type](pos + offset);
    }
    list.push(record);
  }
  return list;
}

function decodeGenerators(raw) {
  const list = [];
  for (let pos = 0; pos + 4 <= raw.length; pos += 4) {
    list.push({ oper: raw.readUInt16LE(pos), amount: raw.readInt16LE(pos + 2) });
  }
  return list;
}

function zoneGens(gens, from, to) {
  const zone = {};
  for (const gen of gens.slice(from, to)) {
    if (gen.oper === 43) zone.keyRange = [gen.amount & 255, (gen.amount >> 8) & 255];
    else if (gen.oper === 44) zone.velRange = [gen.amount & 255, (gen.amount >> 8) & 255];
    else zone[gen.oper] = gen.amount;
  }
  return zone;
}

export function parseSf2(path) {
  const buf = readFileSync(path);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'sfbk') throw new Error('not an SF2');
  const hydra = readChunks(buf, 'pdta');
  const sdta = readChunks(buf, 'sdta');
  const pcm = sdta.get('smpl');
  if (!pcm) throw new Error('no smpl chunk');

  const presets = records(hydra.get('phdr'), 38, [
    ['name', 's', 0], ['program', 'readUInt16LE', 20], ['bank', 'readUInt16LE', 22], ['bag', 'readUInt16LE', 24],
  ]).slice(0, -1);
  const pbag = records(hydra.get('pbag'), 4, [['gen', 'readUInt16LE', 0]]);
  const pgens = decodeGenerators(hydra.get('pgen'));
  const insts = records(hydra.get('inst'), 22, [['name', 's', 0], ['bag', 'readUInt16LE', 20]]).slice(0, -1);
  const ibag = records(hydra.get('ibag'), 4, [['gen', 'readUInt16LE', 0]]);
  const igens = decodeGenerators(hydra.get('igen'));
  const sampleHeaders = records(hydra.get('shdr'), 46, [
    ['name', 's', 0], ['start', 'readUInt32LE', 20], ['end', 'readUInt32LE', 24],
    ['loopStart', 'readUInt32LE', 28], ['loopEnd', 'readUInt32LE', 32], ['sampleRate', 'readUInt32LE', 36],
    ['rootKey', 'readUInt8', 40], ['correction', 'readInt8', 41], ['sampleType', 'readUInt16LE', 44],
  ]).slice(0, -1);
  const samples = sampleHeaders.map((header) => ({
    ...header,
    pcm: new Int16Array(pcm.buffer, pcm.byteOffset + header.start * 2, header.end - header.start),
  }));

  const presetZones = new Map();
  for (let i = 0; i < presets.length; i++) {
    const preset = presets[i];
    const from = preset.bag;
    const to = i + 1 < presets.length ? presets[i + 1].bag : pbag.length - 1;
    const zones = [];
    for (let b = from; b < to; b++) {
      zones.push(zoneGens(pgens, pbag[b].gen, b + 1 < pbag.length ? pbag[b + 1].gen : pgens.length));
    }
    presetZones.set(`${preset.bank}:${preset.program}`, { name: preset.name, preset, zones });
  }

  const instrumentZones = insts.map((inst, i) => {
    const from = inst.bag;
    const to = i + 1 < insts.length ? insts[i + 1].bag : ibag.length - 1;
    const zones = [];
    for (let b = from; b < to; b++) {
      zones.push(zoneGens(igens, ibag[b].gen, b + 1 < ibag.length ? ibag[b + 1].gen : igens.length));
    }
    return zones;
  });

  const instruments = insts.map((inst, i) => ({ name: inst.name, zones: instrumentZones[i] }));
  return { presets, presetZones, instruments, samples, timecentsToSeconds, centibelsToGain };
}

// Volume envelope generators are additive between preset and instrument level;
// when a level omits one its default applies once, after the layers are merged.
const TIMECENT_DEFAULTS = { 33: -12000, 34: -12000, 35: -12000, 36: -12000, 37: 0, 38: -12000, 56: 100 };
const ADDITIVE = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  45, 48, 49, 50, 51, 52, 56]);

const fillDefaults = (gens) => {
  for (const [key, value] of Object.entries(TIMECENT_DEFAULTS)) {
    if (gens[key] === undefined) gens[key] = value;
  }
  return gens;
};

function combineGens(base, extra, defaults = {}) {
  const out = { ...base };
  for (const [rawKey, value] of Object.entries(extra)) {
    if (rawKey === 'keyRange' || rawKey === 'velRange') {
      out[rawKey] = out[rawKey]
        ? [Math.max(out[rawKey][0], value[0]), Math.min(out[rawKey][1], value[1])]
        : value;
      continue;
    }
    const key = Number(rawKey);
    if (ADDITIVE.has(key)) out[key] = (out[key] ?? defaults[key] ?? 0) + value;
    else out[key] = value;
  }
  return out;
}

const DEFAULT_ENV = { delay: 0, attack: 0.001, hold: 0, decay: 0, sustain: 1, release: 0.05 };

function buildZone(parsed, presetGens, instZone) {
  const merged = combineGens(instZone, presetGens);
  const sampleId = merged[53];
  if (sampleId === undefined) return null;
  const sample = parsed.samples[sampleId];
  if (!sample) return null;
  return {
    keyRange: merged.keyRange ?? [0, 127],
    velRange: merged.velRange ?? [0, 127],
    sample,
    rootKey: merged[58] ?? sample.rootKey,
    tune: (merged[51] ?? 0) * 100 + (merged[52] ?? 0) + sample.correction,
    attenuation: (merged[48] ?? 0) / 10,
    pan: Math.max(-1, Math.min(1, (merged[17] ?? 0) / 500)),
    env: {
      ...DEFAULT_ENV,
      delay: parsed.timecentsToSeconds(merged[33] ?? -12000),
      attack: parsed.timecentsToSeconds(merged[34] ?? -12000),
      hold: parsed.timecentsToSeconds(merged[35] ?? -12000),
      decay: parsed.timecentsToSeconds(merged[36] ?? -12000),
      sustain: parsed.centibelsToGain(merged[37] ?? 0),
      release: parsed.timecentsToSeconds(merged[38] ?? -12000),
    },
    loop: ((merged[54] ?? 0) & 1) === 1,
    loopStart: Math.max(0, sample.loopStart - sample.start + (merged[2] ?? 0) + (merged[45] ?? 0) * 32768),
    loopEnd: Math.max(1, sample.loopEnd - sample.start + (merged[3] ?? 0) + (merged[50] ?? 0) * 32768),
    sampleModes: merged[54] ?? 0,
  };
}

/** Playable zones for one bank/program. */
export function resolveZones(parsed, bank, program) {
  const entry = parsed.presetZones.get(`${bank}:${program}`);
  if (!entry) return [];
  const hasSample = zone => zone[53] !== undefined;
  const presetGlobal = entry.zones.find(zone => zone[41] === undefined) ?? {};
  const zones = [];
  for (const pz of entry.zones) {
    if (pz[41] === undefined) continue;
    const instrument = parsed.instruments[pz[41]];
    if (!instrument) continue;
    const instGlobal = instrument.zones.find(zone => !hasSample(zone)) ?? {};
    const instZones = instrument.zones.filter(zone => hasSample(zone));
    const presetGens = combineGens(combineGens({}, presetGlobal), pz);
    delete presetGens[41];
    for (const iz of instZones) {
      const instGens = fillDefaults(combineGens(combineGens({}, instGlobal), iz));
      const zone = buildZone(parsed, presetGens, instGens);
      if (zone) zones.push(zone);
    }
  }
  return zones;
}
