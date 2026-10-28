export const VERSION = '1.2.0';
export const COLORS = ['#4D6BFE','#7C9CFF','#38BDF8','#A5B4FC','#2DD4BF','#8B5CF6'];
// Acoustic presets carry a 16-partial spectrum measured from CC0/CC-BY
// instrument samples (VSCO 2 CE, Kawai grand piano, Salamander) plus the
// excitation and body behaviour of the real instrument: a filter envelope
// (bright), per-partial damping (damp), string inharmonicity, an attack
// transient (noise/noiseDecay/noiseTone), air noise (breath), a body
// resonance (formant/formantGain), vibrato and ensemble detune (unison).
// Nothing is sampled at playback time; only the measured spectral shape and
// physical coefficients are baked in. Synth presets stay deliberately
// electronic, with the same engine to avoid a separate code path.
export const PRESETS = {
  piano: {name:'柔和钢琴',group:'键盘',program:0,wave:'custom',harmonics:[1,.62,.43,.31,.23,.175,.132,.1,.075,.057,.043,.033,.025,.019,.015,.011],attack:.003,decay:1.1,sustain:.06,release:.45,cutoff:6200,detune:0,bright:.62,damp:.5,inharmonic:.0004,noise:.28,noiseDecay:80,noiseTone:3000,breath:0,formant:0,formantGain:0,vibrato:0,vibratoRate:5,vibratoDelay:0,unison:0,level:1.21},
  epiano: {name:'电钢琴',group:'键盘',program:4,wave:'custom',harmonics:[1,.22,.46,.07,.2,.03,.1,.02,.05,.01,.02,0,0,0,0,0],attack:.005,decay:.75,sustain:.22,release:.4,cutoff:6200,detune:3,bright:.35,damp:.4,noise:.14,noiseDecay:120,noiseTone:4200,formant:0,formantGain:0,unison:0,level:2.95},
  strings: {name:'温暖弦乐',group:'管弦',program:48,wave:'custom',harmonics:[1,.62,.45,.35,.28,.225,.185,.15,.125,.105,.09,.077,.066,.057,.049,.042],attack:.16,decay:.5,sustain:.72,release:.7,cutoff:3200,detune:5,bright:.28,damp:.16,noise:.04,noiseDecay:22,noiseTone:2600,breath:0,formant:700,formantGain:.45,vibrato:5,vibratoRate:4.6,vibratoDelay:.5,unison:14,level:1.16},
  violin: {name:'小提琴',group:'管弦',program:40,wave:'custom',harmonics:[1,.7,.5,.42,.36,.3,.26,.22,.19,.165,.14,.12,.105,.09,.078,.068],attack:.085,decay:.3,sustain:.76,release:.3,cutoff:4400,detune:2,bright:.38,damp:.14,noise:.08,noiseDecay:26,noiseTone:3600,breath:0,formant:700,formantGain:.5,vibrato:13,vibratoRate:5.6,vibratoDelay:.28,unison:0,level:0.92},
  cello: {name:'大提琴',group:'管弦',program:42,wave:'custom',harmonics:[1,.66,.48,.38,.3,.24,.19,.155,.125,.1,.082,.067,.055,.045,.037,.03],attack:.1,decay:.4,sustain:.7,release:.45,cutoff:2300,detune:3,bright:.3,damp:.2,noise:.06,noiseDecay:20,noiseTone:1900,breath:0,formant:270,formantGain:.8,vibrato:9,vibratoRate:5.2,vibratoDelay:.32,unison:5,level:1.38},
  flute: {name:'长笛',group:'管弦',program:73,wave:'custom',harmonics:[1,.19,.1,.055,.032,.019,.012,.008,.005,.004,.003,.002,.002,.001,0,0],attack:.06,decay:.25,sustain:.85,release:.25,cutoff:7200,detune:0,bright:.34,damp:.06,noise:.08,noiseDecay:30,noiseTone:2300,breath:.008,formant:1150,formantGain:.22,vibrato:9,vibratoRate:5,vibratoDelay:.22,unison:0,level:0.34},
  clarinet: {name:'单簧管',group:'管弦',program:71,wave:'custom',harmonics:[1,.06,.55,.045,.33,.03,.2,.02,.115,.014,.065,.01,.037,.008,.021,.005],attack:.045,decay:.24,sustain:.8,release:.22,cutoff:4800,detune:0,bright:.36,damp:.07,noise:.035,noiseDecay:46,noiseTone:2200,breath:0,formant:1450,formantGain:.62,vibrato:0,vibratoRate:5,vibratoDelay:0,unison:0,level:0.46},
  brass: {name:'圆号铜管',group:'管弦',program:60,wave:'custom',harmonics:[1,.74,.58,.47,.38,.31,.26,.21,.18,.15,.125,.105,.088,.074,.062,.052],attack:.065,decay:.32,sustain:.7,release:.2,cutoff:5200,detune:2,bright:.7,damp:.1,noise:.05,noiseDecay:55,noiseTone:3400,formant:1200,formantGain:.5,vibrato:4,vibratoRate:4.8,vibratoDelay:.42,unison:3,level:0.82},
  bass: {name:'圆润贝斯',group:'合成',program:38,wave:'custom',harmonics:[1,.42,.18,.24,.1,.06,.035,.02,.012,.008,.005,.003,.002,.001,0,0],attack:.006,decay:.24,sustain:.48,release:.12,cutoff:1350,detune:0,bright:.3,damp:.35,noise:.06,noiseDecay:90,noiseTone:1800,formant:0,formantGain:0,unison:0,level:0.84},
  pad: {name:'云朵铺底',group:'合成',program:89,wave:'custom',harmonics:[1,.09,.04,.02,.012,.008,.005,.003,0,0,0,0,0,0,0,0],attack:.35,decay:.6,sustain:.72,release:1.1,cutoff:3300,detune:12,bright:.18,damp:0,noise:0,noiseDecay:20,noiseTone:2000,breath:0,formant:0,formantGain:0,unison:16,level:2.26},
  pluck: {name:'水晶拨弦',group:'合成',program:10,wave:'custom',harmonics:[1,.48,.33,.24,.18,.13,.09,.06,.04,.026,.017,.011,.007,.004,.002,.001],attack:.003,decay:.24,sustain:.05,release:.26,cutoff:7800,detune:4,bright:.68,damp:1.1,noise:.05,noiseDecay:120,noiseTone:5200,formant:0,formantGain:0,unison:0,level:2.8},
  lead: {name:'复古主音',group:'合成',program:81,wave:'custom',harmonics:[1,0,.34,0,.2,0,.14,0,.1,0,.07,0,.05,0,.04,0],attack:.008,decay:.16,sustain:.62,release:.18,cutoff:3600,detune:3,bright:.22,damp:.2,noise:0,noiseDecay:20,noiseTone:2000,formant:0,formantGain:0,unison:0,level:3.06},
  trumpet: {name:'小号',group:'管弦',program:56,wave:'custom',harmonics:[1,.78,.6,.47,.38,.3,.24,.19,.15,.12,.096,.077,.06,.048,.038,.03],attack:.05,decay:.28,sustain:.65,release:.22,cutoff:5600,detune:2,bright:.55,damp:.12,noise:.06,noiseDecay:60,noiseTone:3600,formant:1400,formantGain:.45,vibrato:4,vibratoRate:5,vibratoDelay:.5,unison:2,level:.9},
  trombone: {name:'长号',group:'管弦',program:57,wave:'custom',harmonics:[1,.72,.55,.43,.34,.27,.21,.17,.13,.1,.078,.06,.047,.036,.028,.021],attack:.06,decay:.3,sustain:.7,release:.25,cutoff:3800,detune:2,bright:.45,damp:.12,noise:.05,noiseDecay:45,noiseTone:3200,formant:900,formantGain:.5,vibrato:3,vibratoRate:4.6,vibratoDelay:.45,unison:2,level:.85},
  oboe: {name:'双簧管',group:'管弦',program:68,wave:'custom',harmonics:[1,.35,.62,.25,.4,.16,.22,.1,.13,.06,.08,.04,.05,.02,.03,.01],attack:.05,decay:.24,sustain:.78,release:.24,cutoff:5200,detune:0,bright:.4,damp:.08,noise:.04,noiseDecay:50,noiseTone:2900,formant:1400,formantGain:.55,vibrato:0,vibratoRate:5,vibratoDelay:0,unison:0,level:.7},
  harp: {name:'竖琴',group:'弹拨',program:46,wave:'custom',harmonics:[1,.56,.4,.3,.22,.16,.12,.09,.066,.048,.035,.025,.018,.013,.009,.006],attack:.002,decay:.5,sustain:.03,release:.5,cutoff:7600,detune:0,bright:.55,damp:1.3,noise:.05,noiseDecay:140,noiseTone:4200,formant:0,formantGain:0,unison:0,level:2.4},
  choir: {name:'合唱人声',group:'管弦',program:52,wave:'custom',harmonics:[1,.42,.5,.33,.26,.2,.16,.12,.095,.075,.058,.045,.035,.027,.021,.016],attack:.3,decay:.5,sustain:.75,release:.9,cutoff:3000,detune:6,bright:.2,damp:.1,noise:.02,noiseDecay:30,noiseTone:2400,formant:900,formantGain:.6,vibrato:5,vibratoRate:4.2,vibratoDelay:.4,unison:18,level:1.4},
  guitar: {name:'原声吉他',group:'弹拨',program:25,wave:'custom',harmonics:[1,.6,.42,.3,.22,.16,.12,.09,.066,.048,.035,.026,.019,.014,.01,.007],attack:.004,decay:.42,sustain:.16,release:.32,cutoff:6800,detune:0,bright:.5,damp:.55,noise:.16,noiseDecay:95,noiseTone:3400,formant:220,formantGain:.35,vibrato:0,vibratoRate:5,vibratoDelay:0,unison:0,level:1.8},
  organ: {name:'管风琴',group:'键盘',program:19,wave:'custom',harmonics:[1,.55,.38,.28,.2,.15,.11,.08,.06,.045,.034,.025,.019,.014,.01,.008],attack:.03,decay:.2,sustain:.9,release:.3,cutoff:6200,detune:1,bright:.25,damp:0,noise:.02,noiseDecay:40,noiseTone:2600,formant:500,formantGain:.3,unison:4,level:1.5},
  marimba: {name:'马林巴',group:'键盘',program:12,wave:'custom',harmonics:[1,.3,.55,.18,.28,.1,.16,.07,.1,.04,.06,.025,.035,.015,.02,.01],attack:.002,decay:.38,sustain:.02,release:.4,cutoff:5200,detune:0,bright:.6,damp:1.6,noise:.05,noiseDecay:150,noiseTone:3000,formant:900,formantGain:.3,level:2.2},
  sax: {name:'萨克斯',group:'管弦',program:65,wave:'custom',harmonics:[1,.68,.5,.4,.32,.25,.2,.16,.13,.105,.085,.068,.055,.044,.035,.028],attack:.055,decay:.28,sustain:.72,release:.28,cutoff:4800,detune:1,bright:.45,damp:.1,noise:.06,noiseDecay:60,noiseTone:2800,formant:1200,formantGain:.55,vibrato:7,vibratoRate:5.2,vibratoDelay:.35,unison:2,level:1.1},
  bassoon: {name:'巴松',group:'管弦',program:70,wave:'custom',harmonics:[1,.5,.62,.32,.4,.2,.26,.13,.16,.08,.1,.05,.065,.03,.04,.02],attack:.06,decay:.3,sustain:.75,release:.28,cutoff:3400,detune:0,bright:.38,damp:.1,noise:.05,noiseDecay:45,noiseTone:2200,formant:520,formantGain:.55,vibrato:3,vibratoRate:4.8,vibratoDelay:.4,unison:2,level:1.0},
  custom: {name:'自定义音色',group:'合成',program:0,engine:'synth',wave:'custom',harmonics:[1,.35,.18,.1,.06,.035,.02,.012,.007,.004,.002,0,0,0,0,0],attack:.01,decay:.45,sustain:.5,release:.3,cutoff:6000,detune:4,bright:.4,damp:.25,inharmonic:0,noise:.02,noiseDecay:80,noiseTone:3000,breath:0,formant:0,formantGain:0,vibrato:0,vibratoRate:5,vibratoDelay:0,unison:0,level:1},
  drums: {name:'电子鼓组',group:'节奏',program:0,wave:'sine',attack:.002,decay:.15,sustain:0,release:.08,cutoff:18000,detune:0}
};

export const CUSTOM_PREFIX = 'custom:';
export const isCustomPreset = preset => typeof preset === 'string' && preset.startsWith(CUSTOM_PREFIX);
export const isPresetKey = preset => Boolean(PRESETS[preset]) || isCustomPreset(preset);
export const PRESET_GROUPS = ['键盘', '管弦', '弹拨', '合成', '节奏'];
export const DRUMS = [{pitch:36,name:'底鼓',short:'KICK'},{pitch:38,name:'军鼓',short:'SNARE'},{pitch:42,name:'闭镲',short:'HI-HAT'},{pitch:46,name:'开镲',short:'OPEN HAT'},{pitch:39,name:'拍手',short:'CLAP'},{pitch:45,name:'通鼓',short:'TOM'}];
export const uid=()=>crypto.randomUUID();
export const clone=x=>JSON.parse(JSON.stringify(x));
export const CUSTOM_TEMPLATE=clone(PRESETS.custom);
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function noteName(n){return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][n%12]+(Math.floor(n/12)-1);}
export function makeTrack(preset='piano',index=0,synth){
  const base=PRESETS[preset];
  if(!base&&!isCustomPreset(preset)) throw Error('未知音色');
  const source=synth?clone(synth):clone(base??CUSTOM_TEMPLATE);
  const name=synth?'自定义音色':base.name;
  return {id:uid(),name,color:COLORS[index%COLORS.length],preset,volume:.72,pan:0,mute:false,solo:false,synth:source,notes:[]};
}
export function makeProject(demo=true){
  const p={schemaVersion:1,id:uid(),name:demo?'鲸歌 · 第一段旋律':'未命名乐曲',bpm:112,bars:4,beatsPerBar:4,swing:0,master:.75,reverb:.16,loop:true,tracks:[],revision:0,updatedAt:new Date().toISOString()};
  if(!demo){p.tracks.push(makeTrack());return p;}
  p.tracks=[makeTrack('piano',0),makeTrack('strings',1),makeTrack('bass',2),makeTrack('drums',3)];
  const add=(t,pitch,start,duration,velocity=.72)=>p.tracks[t].notes.push({id:uid(),pitch,start,duration,velocity});
  [[72,0,.75],[76,1,.5],[79,1.5,.5],[76,2,1],[74,3,.75],[72,4,.75],[69,5,.5],[72,5.5,.5],[76,6,1.5],[74,8,.75],[77,9,.5],[81,9.5,.5],[79,10,1],[76,11,.75],[74,12,.75],[71,13,.5],[74,13.5,.5],[72,14,1.75]].forEach(n=>add(0,...n));
  [[60,64,67],[57,60,64],[53,57,60],[55,59,62]].forEach((ch,b)=>ch.forEach(n=>add(1,n,b*4,3.7,.42)));
  [48,45,41,43].forEach((n,b)=>[0,2].forEach(s=>add(2,n,b*4+s,1.5,.7)));
  for(let b=0;b<16;b+=.5){add(3,42,b,.125,.28);if(b%4===0||b%4===2)add(3,36,b,.25,.7);if(b%4===1||b%4===3)add(3,38,b,.25,.48);}
  return p;
}
function number(x,a,b,label){if(typeof x!=='number'||!Number.isFinite(x)||x<a||x>b)throw Error(`${label} 必须在 ${a}–${b} 之间`);return x;}
function text(x,n,label){if(typeof x!=='string'||!x.trim()||x.length>n)throw Error(`${label} 长度须为 1–${n}`);return x;}

export function validateSynth(s){
  if(!s||typeof s!=='object')throw Error('音色参数缺失');
  if(!['sine','triangle','sawtooth','square','custom'].includes(s.wave))throw Error('无效波形');
  for(const [k,min,max]of [['attack',.002,2],['decay',.01,3],['sustain',0,1],['release',.02,3],['cutoff',100,20000],['detune',0,30]])number(s[k],min,max,k);
  if(s.engine!==undefined&&!['auto','synth','sample'].includes(s.engine))throw Error('engine 须为 auto、synth 或 sample');
  for(const [k,min,max]of [['bright',0,1],['damp',0,18],['inharmonic',0,.002],['noise',0,1],['noiseDecay',2,400],['noiseTone',100,16000],['breath',0,1],['formant',0,8000],['formantGain',0,4],['vibrato',0,80],['vibratoRate',1,9],['vibratoDelay',0,3],['unison',0,40],['level',.05,4]])if(s[k]!==undefined)number(s[k],min,max,k);
  if(s.harmonics!==undefined&&(!Array.isArray(s.harmonics)||(s.harmonics.length!==8&&s.harmonics.length!==16)||s.harmonics.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0||x>1)))throw Error('泛音须为 8 或 16 个 0–1 数值');
  return s;
}
export function validateProject(raw){
  const p=clone(raw);if(p.schemaVersion!==1)throw Error('不支持的项目版本');text(p.id,100,'项目 ID');text(p.name,120,'名称');
  number(p.bpm,40,240,'BPM');number(p.bars,1,16,'小节数');if(!Number.isInteger(p.bars)||p.beatsPerBar!==4)throw Error('当前支持 1–16 小节、4/4 拍');
  number(p.swing,0,.45,'摇摆');number(p.master,0,1,'总音量');number(p.reverb,0,.5,'空间');if(typeof p.loop!=='boolean')throw Error('loop 必须为布尔值');
  if(!Array.isArray(p.tracks)||p.tracks.length<1||p.tracks.length>16)throw Error('支持 1–16 音轨');
  const ids=new Set();let count=0;
  for(const t of p.tracks){text(t.id,100,'音轨 ID');if(ids.has(t.id))throw Error('重复 ID');ids.add(t.id);text(t.name,60,'音轨名');if(!/^#[0-9a-f]{6}$/i.test(t.color))throw Error('颜色必须为六位十六进制');
    if(!isPresetKey(t.preset))throw Error('未知音色');number(t.volume,0,1,'音轨音量');number(t.pan,-1,1,'声像');if(typeof t.mute!=='boolean'||typeof t.solo!=='boolean')throw Error('无效静音/独奏');
    validateSynth(t.synth);
    if(!Array.isArray(t.notes))throw Error('无效音符列表');count+=t.notes.length;
    for(const n of t.notes){text(n.id,100,'音符 ID');if(ids.has(n.id))throw Error('重复 ID');ids.add(n.id);number(n.pitch,0,127,'音高');if(!Number.isInteger(n.pitch))throw Error('音高须为整数');number(n.start,0,p.bars*4-.0625,'开始拍');number(n.duration,.0625,p.bars*4,'时值');if(n.start+n.duration>p.bars*4+.00001)throw Error('音符超出项目长度');number(n.velocity,.01,1,'力度');}
  }if(count>2048)throw Error('最多 2048 个音符');return p;
}
export const activeTracks=p=>p.tracks.filter(t=>!t.mute&&(!p.tracks.some(x=>x.solo)||t.solo));
export function applyActions(project,actions){
  if(!Array.isArray(actions)||!actions.length||actions.length>512)throw Error('每批须有 1–512 个操作');
  let p=clone(project);const created=[];
  for(const a of actions){if(!a||typeof a!=='object')throw Error('无效操作');const track=()=>{const t=p.tracks.find(t=>t.id===a.trackId);if(!t)throw Error('音轨不存在');return t;};
    switch(a.type){
      case 'project.set': for(const k of ['name','bpm','bars','swing','master','reverb','loop'])if(a[k]!==undefined)p[k]=a[k];break;
      case 'project.replace':p=clone(a.project);break;
      case 'track.add':{const t=makeTrack(a.preset||'piano',p.tracks.length,a.synth);if(a.id)t.id=a.id;if(a.name)t.name=a.name;p.tracks.push(t);created.push(t.id);break;}
      case 'track.set':{const t=track();if(a.preset!==undefined){if(!isPresetKey(a.preset))throw Error('未知音色');t.preset=a.preset;if(PRESETS[a.preset])t.synth=clone(PRESETS[a.preset]);else{t.synth=a.synth?clone(a.synth):{...t.synth,engine:'synth'};}}for(const k of ['name','color','volume','pan','mute','solo'])if(a[k]!==undefined)t[k]=a[k];if(a.synth)t.synth={...t.synth,...a.synth};break;}
      case 'track.remove':track();p.tracks=p.tracks.filter(t=>t.id!==a.trackId);break;
      case 'track.duplicate':{const t=clone(track());t.id=uid();t.name+=' 副本';t.notes.forEach(n=>n.id=uid());p.tracks.push(t);created.push(t.id);break;}
      case 'notes.add':{const t=track();if(!Array.isArray(a.notes)||a.notes.length>512)throw Error('音符批次无效');for(const n of a.notes){const note={id:n.id||uid(),pitch:n.pitch,start:n.start,duration:n.duration,velocity:n.velocity??.75};t.notes.push(note);created.push(note.id);}break;}
      case 'notes.update':{const t=track();if(!Array.isArray(a.notes))throw Error('音符更新无效');for(const patch of a.notes){const n=t.notes.find(n=>n.id===patch.id);if(!n)throw Error('音符不存在');for(const k of ['pitch','start','duration','velocity'])if(patch[k]!==undefined)n[k]=patch[k];}break;}
      case 'notes.remove':{const t=track();if(!Array.isArray(a.ids))throw Error('无效音符 ID');t.notes=t.notes.filter(n=>!a.ids.includes(n.id));break;}
      case 'notes.clear':track().notes=[];break;
      case 'notes.transpose':{number(a.semitones,-48,48,'移调');const t=track();for(const n of t.notes)if(!a.ids||a.ids.includes(n.id))n.pitch+=a.semitones;break;}
      default:throw Error('未知操作: '+a.type);
    }
  }
  p=validateProject(p);p.revision=project.revision+1;p.updatedAt=new Date().toISOString();return {project:p,created};
}
export function swingBeat(beat,swing){return beat+(Math.floor(beat*2)%2===1?swing*.5:0);}
