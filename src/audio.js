import {activeTracks,clamp,swingBeat,PRESETS} from './core.js';
import {hasBank,sampleVoice} from './sampler.js';
export const SAMPLE_RATE=44100;
const TAU=Math.PI*2;
const TABLE=4096,SIN=new Float32Array(TABLE+1);
for(let i=0;i<=TABLE;i++)SIN[i]=Math.sin(TAU*i/TABLE);
/** Interpolated sine lookup; `turns` counts cycles (a fractional part is the phase). */
function sinT(turns){const x=(turns-Math.floor(turns))*TABLE,i=x|0;return SIN[i]+(SIN[i+1]-SIN[i])*(x-i);}
/** Deterministic per-note hash; replaces Math.random so renders stay byte-stable. */
function hash(seed,index){let h=(seed^Math.imul(index+1,2654435761))>>>0;h=Math.imul(h^(h>>>15),2246822519);h=Math.imul(h^(h>>>13),3266489917);return (h^(h>>>16))>>>0;}
function rand01(seed,index){return hash(seed,index)/4294967296;}
/** One-pole low-pass coefficient for `hz` at `rate`. */
function pole(hz,rate){return hz>=rate*.49?.99:1-Math.exp(-TAU*hz/rate);}
/**
 * Partial stack for one note: amplitude, inharmonic frequency ratio and a
 * per-partial damping factor. Inharmonicity and high-partial damping are what
 * separate a struck string from a synthetic steady waveform.
 */
function partialStack(s,f,rate){
  const amps=[];let count=16;
  if(s.wave==='custom'&&Array.isArray(s.harmonics)&&s.harmonics.length){count=s.harmonics.length;for(let h=0;h<count;h++)amps.push(s.harmonics[h]||0);}
  else for(let h=1;h<=count;h++)amps.push(s.wave==='sawtooth'?1/h:s.wave==='square'?(h%2?1/h:0):s.wave==='triangle'?(h%2?((h%4===1?1:-1)/(h*h)):0):(h===1?1:0));
  const inh=clamp(s.inharmonic||0,0,.002),damp=clamp(s.damp||0,0,18),out=[],limit=Math.min(20000,rate*.45);
  for(let h=1;h<=count;h++){
    const amp=amps[h-1];if(!amp)continue;
    const fh=f*h*Math.sqrt(1+inh*h*h);if(fh>=limit)continue;
    out.push({ratio:fh/f,amp,decay:damp?Math.exp(-damp*(h-1)/SAMPLE_RATE):0});
  }
  return out;
}
/** Electronic drum kit: layered tone/noise instead of single oscillators. */
function voiceDrums(note,rate){
  const pitch=note.pitch;
  const seconds=pitch===46?.6:pitch===45?.55:pitch===36?.55:pitch===38?.3:pitch===39?.3:.16;
  const out=new Float32Array(Math.ceil(seconds*rate));
  let seed=(pitch*2654435761+Math.round(note.start*1000))>>>0;
  let phase=0,phase2=0,noiseLow=0,noiseBand=0,hpLast=0;
  const metal=[1.31,1.72,2.11,2.57,3.03];
  const noise=pitch===42||pitch===46;
  const nextNoise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
  for(let i=0;i<out.length;i++){
    const t=i/rate;let v=0;
    if(noise){
      const white=nextNoise(),hp=white-hpLast;hpLast=white;
      let ring=0;for(const r of metal)ring+=Math.sin(TAU*5400*r*t)*(.16/r);
      v=(hp*.4+ring*.55)*Math.exp(-t*(pitch===46?7.5:54));
    }else if(pitch===36){
      phase+=(42+78*Math.exp(-t*32))/rate;phase2+=(84+156*Math.exp(-t*32))/rate;
      const click=Math.sin(TAU*3100*t)*Math.exp(-t*110)*.16;
      v=(Math.sin(TAU*phase)*Math.exp(-t*7.5)+Math.sin(TAU*phase2)*Math.exp(-t*11)*.22+click)*1.05;
    }else if(pitch===38){
      const white=nextNoise();
      noiseBand+=(1-Math.exp(-TAU*1900/rate))*(white-noiseBand);
      const body=Math.sin(TAU*180*t)*Math.exp(-t*22)*.3+Math.sin(TAU*330*t)*Math.exp(-t*28)*.22;
      v=noiseBand*.72*Math.exp(-t*16)+body+white*Math.exp(-t*60)*.12;
    }else if(pitch===39){
      const white=nextNoise(),bursts=t<.06?(Math.sin(t*700)**2*.85+.15):1;
      noiseBand+=(1-Math.exp(-TAU*1500/rate))*(white-noiseBand);
      v=noiseBand*bursts*Math.exp(-t*24)*.85+Math.sin(TAU*220*t)*Math.exp(-t*40)*.12;
    }else{
      phase+=(70+70*Math.exp(-t*14))/rate;
      v=Math.sin(TAU*phase)*Math.exp(-t*9)+nextNoise()*Math.exp(-t*70)*.2;
    }
    out[i]=clamp(v*note.velocity*.85,-1.5,1.5);
  }
  return out;
}
/** RBJ peaking EQ: the body/soundboard resonance of an acoustic instrument. */
function peaking(hz,rate,gain){
  if(!hz||!gain||hz>=rate*.45)return {b0:1,b1:0,b2:0,a1:0,a2:0};
  const w=TAU*clamp(hz,20,rate*.45)/rate,cos=Math.cos(w),alpha=Math.sin(w)/2.4,A=10**(12*clamp(gain,0,4)/40),a0=1+alpha/A;
  return {b0:(1+alpha*A)/a0,b1:-2*cos/a0,b2:(1-alpha*A)/a0,a1:-2*cos/a0,a2:(1-alpha/A)/a0};
}
/** RBJ constant-skirt band-pass: the excitation noise of hammer, breath or bow. */
function bandPass(hz,rate,q){
  if(!hz||hz>=rate*.45)return {b0:1,b1:0,b2:0,a1:0,a2:0};
  const w=TAU*clamp(hz,20,rate*.45)/rate,alpha=Math.sin(w)/(2*clamp(q,.2,8)),cos=Math.cos(w),a0=1+alpha;
  return {b0:alpha/a0,b1:0,b2:-alpha/a0,a1:-2*cos/a0,a2:(1-alpha)/a0};
}
/**
 * Render one note. Optional realism knobs (preset-level, all documented in
 * AGENTS.md): `bright` filter envelope, `damp` per-partial decay,
 * `inharmonic` string stretch, `noise`/`noiseDecay`/`noiseTone` attack
 * transient, `breath` sustained air noise, `formant`/`formantGain` body
 * resonance, `vibrato`/`vibratoRate`/`vibratoDelay` and `unison` ensemble
 * spread. Everything is deterministic for a given note and project.
 */
export function voice(track,note,bpm,rate=SAMPLE_RATE){
  const engine=track.synth?.engine||'auto';
  if(engine!=='synth'&&hasBank()){
    const sampled=sampleVoice(track.preset,note,bpm,rate);
    if(sampled)return sampled;
  }
  if(track.preset==='drums')return voiceDrums(note,rate);
  const s={...(PRESETS[track.preset]||{}),...track.synth};
  const dur=note.duration*60/bpm,f=440*2**((note.pitch-69)/12);
  const seed=(note.pitch*1717+Math.round(note.start*1000)+Math.round(note.velocity*97))>>>0;
  const spread=clamp(s.unison||0,0,40)*.5,detune=clamp(s.detune||0,0,30)*.5;
  const voices=spread||detune?2:1;
  const offsets=[spread-detune,-(spread+detune)];
  const stacks=[],phases=[],damps=[];
  for(let v=0;v<voices;v++){
    const vf=f*2**(offsets[v]/1200),stack=partialStack(s,vf,rate);
    stacks.push(stack);damps.push(stack.map(p=>p.decay));
    phases.push(stack.map((p,h)=>rand01(seed,h+v*23+1)));
  }
  const gainJitter=.94+.12*rand01(seed,99);
  const bright=clamp(s.bright||0,0,1),cutoffBase=clamp(s.cutoff||8000,120,19500);
  const cutoffStart=clamp(cutoffBase*(1+3*bright),200,19500);
  const kCut=1/Math.max(.05,(s.decay||.3)*.55);
  const norm=stacks[0].reduce((a,p)=>a+Math.abs(p.amp),0)||1;
  const ampScale=(voices>1?.78:1)/Math.max(1,norm*.7);
  const vib=clamp(s.vibrato||0,0,80),vibRate=clamp(s.vibratoRate||5,1,9),vibDelay=clamp(s.vibratoDelay||0,0,3);
  const noiseAmt=clamp(s.noise||0,0,1),noiseDecay=clamp(s.noiseDecay||60,2,400),noiseTone=clamp(s.noiseTone||2500,100,16000);
  const breath=clamp(s.breath||0,0,1);
  const formant=clamp(s.formant||0,0,8000),formantGain=clamp(s.formantGain||0,0,4);
  const body=peaking(formant,rate,formantGain),grain=bandPass(noiseTone,rate,1.1);
  const attack=Math.max(.001,s.attack||.004),decay=Math.max(.01,s.decay||.3),sustain=clamp(s.sustain??.5,0,1),release=Math.max(.02,s.release||.3);
  const decayStep=Math.exp(-4/(decay*rate));
  const seconds=dur+release,length=Math.ceil(seconds*rate),out=new Float32Array(length);
  let env=0,held=0,t=0,low=0,breathLow=0;
  let gx1=0,gx2=0,gy1=0,gy2=0,fx1=0,fx2=0,fy1=0,fy2=0;
  let vibPhase=rand01(seed,17);
  const breathF=pole(Math.min(noiseTone*.55,6000),rate);
  let noiseSeed=seed;
  for(let i=0;i<length;i++){
    t=i/rate;
    const vibDepth=vib&&t>vibDelay?vib*(1-Math.exp(-(t-vibDelay)*6)):0;
    const pitchMod=1+(vibDepth/1200)*sinT(vibPhase);
    vibPhase+=vibRate/rate;
    let ampEnv;
    if(t<=attack)ampEnv=attack>0?t/attack:1;
    else if(t<=dur)ampEnv=sustain+(env-sustain)*decayStep;
    else ampEnv=held*Math.max(0,1-(t-dur)/release)**2;
    env=ampEnv;
    if(i===Math.max(0,Math.round(dur*rate)-1))held=Math.max(ampEnv,1e-6);
    let sum=0;
    for(let v=0;v<voices;v++){
      const stack=stacks[v],phase=phases[v],dec=damps[v];
      for(let h=0;h<stack.length;h++){
        const p=stack[h];
        phase[h]+=p.ratio*f*pitchMod/rate;
        sum+=p.amp*sinT(phase[h]);
        if(dec[h])p.amp*=dec[h];
      }
    }
    let v=sum*ampScale*gainJitter*ampEnv;
    const alpha=pole(cutoffBase+(cutoffStart-cutoffBase)*Math.exp(-t*kCut),rate);
    low+=alpha*(v-low);v=low;
    if(breath){
      noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;
      const white=noiseSeed/2147483648-1;
      breathLow+=breathF*(white-breathLow);
      v+=(white-breathLow)*breath*(.35+.65*Math.min(1,ampEnv));
    }
    if(noiseAmt&&t<.15){
      noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;
      const white=noiseSeed/2147483648-1;
      const y=grain.b0*white+grain.b1*gx1+grain.b2*gx2-grain.a1*gy1-grain.a2*gy2;
      gx2=gx1;gx1=white;gy2=gy1;gy1=y;
      v+=y*noiseAmt*Math.exp(-t*noiseDecay)*2.4;
    }
    if(formantGain){
      const y=body.b0*v+body.b1*fx1+body.b2*fx2-body.a1*fy1-body.a2*fy2;
      fx2=fx1;fx1=v;fy2=fy1;fy1=y;v=y;
    }
    out[i]=v*note.velocity*.5*(s.level??1);
  }
  return out;
}
export function wavBytes(left,right,rate=SAMPLE_RATE){
  const buffer=new ArrayBuffer(44+left.length*4),v=new DataView(buffer),str=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  str(0,'RIFF');v.setUint32(4,36+left.length*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,left.length*4,true);
  for(let i=0;i<left.length;i++){v.setInt16(44+i*4,Math.round(clamp(left[i],-1,1)*32767),true);v.setInt16(46+i*4,Math.round(clamp(right[i],-1,1)*32767),true);}return new Uint8Array(buffer);
}
export function renderWav(p,{rate=SAMPLE_RATE,normalize=true}={}){
  const seconds=p.bars*4*60/p.bpm+3.5,length=Math.ceil(seconds*rate),left=new Float32Array(length),right=new Float32Array(length);
  const tracks=activeTracks(p);let cost=0;
  for(const t of tracks)for(const n of t.notes)cost+=(t.preset==='drums'?.6:n.duration*60/p.bpm+(t.synth?.release??PRESETS[t.preset]?.release??.3))*rate;
  if(cost>22e6)throw Error('乐曲音符过于密集，请缩短音符或分轨导出（合成上限 2200 万采样点）');
  for(const t of tracks){const l=Math.cos((t.pan+1)*Math.PI/4)*t.volume*p.master,r=Math.sin((t.pan+1)*Math.PI/4)*t.volume*p.master;
    for(const n of t.notes){const data=voice(t,n,p.bpm,rate),start=Math.round(swingBeat(n.start,p.swing)*60/p.bpm*rate);for(let i=0;i<data.length&&start+i<length;i++){left[start+i]+=data[i]*l;right[start+i]+=data[i]*r;}}
  }
  applyRoom(left,right,p.reverb,rate);
  let peak=0;for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
  const gain=normalize&&peak>.00001?.92/peak:1;for(let i=0;i<length;i++){left[i]=Math.tanh(left[i]*gain);right[i]=Math.tanh(right[i]*gain);}
  return {bytes:wavBytes(left,right,rate),seconds,peak,gain};
}
export function applyRoom(left,right,wet,rate){if(!wet)return;for(const [delay,gain]of [[.113,.4],[.181,.28],[.307,.18]]){const d=Math.round(delay*rate);for(let i=left.length-1;i>=d;i--){left[i]+=left[i-d]*wet*gain;right[i]+=right[i-d]*wet*gain;}}}
const u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
const u16=n=>[(n>>>8)&255,n&255];
const ascii=s=>[...s].map(c=>c.charCodeAt(0));
function variable(n){let b=[n&127];while(n>>=7)b.unshift((n&127)|128);return b;}
export function midiBytes(p){
  if(activeTracks(p).filter(t=>t.preset!=='drums').length>15)throw Error('标准 MIDI 最多容纳 15 个独立旋律通道，请静音一轨或使用导出 WAV');
  const chunk=events=>{events.sort((a,b)=>a.time-b.time||a.order-b.order);let last=0,body=[];for(const e of events){body.push(...variable(e.time-last),...e.data);last=e.time;}body.push(0,255,47,0);return [...ascii('MTrk'),...u32(body.length),...body];};
  const tempo=Math.round(60e6/p.bpm),end=p.bars*4*480;
  const chunks=[chunk([{time:0,order:0,data:[255,81,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255]},{time:0,order:0,data:[255,88,4,4,2,24,8]},{time:end,order:2,data:[255,1,0]}])];
  const tracks=activeTracks(p);let melodic=0;
  for(const t of tracks){const ch=t.preset==='drums'?9:(melodic++%15>=9?(melodic-1)%15+1:(melodic-1)%15);const title=[...new TextEncoder().encode(t.name)];
    const events=[{time:0,order:0,data:[255,3,...variable(title.length),...title]},{time:0,order:0,data:[192+ch,PRESETS[t.preset]?.program??0]},{time:0,order:0,data:[176+ch,7,Math.round(t.volume*p.master*127)]},{time:0,order:0,data:[176+ch,10,Math.round((t.pan+1)*63.5)]},{time:end,order:2,data:[255,1,0]}];
    for(const n of t.notes){const start=Math.round(swingBeat(n.start,p.swing)*480);events.push({time:start,order:1,data:[144+ch,n.pitch,Math.round(n.velocity*127)]},{time:Math.round(start+n.duration*480),order:0,data:[128+ch,n.pitch,0]});}chunks.push(chunk(events));
  }return new Uint8Array([...ascii('MThd'),...u32(6),...u16(1),...u16(chunks.length),...u16(480),...chunks.flat()]);
}
