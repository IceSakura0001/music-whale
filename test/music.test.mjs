import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,makeTrack,applyActions,validateProject,clone,activeTracks,PRESETS,swingBeat,CUSTOM_TEMPLATE} from '../src/core.js';
import {renderWav,voice,midiBytes} from '../src/audio.js';
import {createService,TOOLS} from '../src/service.js';
function memoryStorage(){let data=null,etag=0;const exports=new Map();return {async read(){return data?{data:clone(data),etag}:null;},async write(d,e){if(e!==null&&e!==etag)throw Object.assign(Error('conflict'),{status:409});data=clone(d);etag++;},async putExport(f,b,t){exports.set(f,{bytes:b,type:t});},async getExport(f){return exports.get(f);}};}
test('demo and all presets pass model validation',()=>{const p=makeProject();assert.equal(p.tracks.length,4);assert.equal(validateProject(p).bpm,112);for(const preset of Object.keys(PRESETS)){const q=makeProject(false);q.tracks=[makeTrack(preset)];assert.doesNotThrow(()=>validateProject(q));}});
test('batch edits are atomic, preserve IDs, increment revision and reject invalid notes',()=>{const p=makeProject(false);const result=applyActions(p,[{type:'track.add',id:'lead-a',preset:'flute'},{type:'notes.add',trackId:'lead-a',notes:[{id:'n1',pitch:72,start:0,duration:1}]}]);assert.equal(result.project.revision,1);assert.equal(result.project.tracks[1].notes[0].velocity,.75);assert.equal(p.tracks.length,1);assert.throws(()=>applyActions(p,[{type:'project.set',bpm:130},{type:'notes.add',trackId:p.tracks[0].id,notes:[{pitch:60,start:15.5,duration:1}]}]),/超出/);assert.equal(p.bpm,112);assert.throws(()=>applyActions(p,[{type:'track.set',trackId:p.tracks[0].id,synth:{harmonics:[1]}}]),/泛音/);});
test('move, resize, transpose, duplicate and removal operations',()=>{let p=makeProject(false),id=p.tracks[0].id;p=applyActions(p,[{type:'notes.add',trackId:id,notes:[{id:'n',pitch:60,start:0,duration:1}]},{type:'notes.update',trackId:id,notes:[{id:'n',start:1,duration:2,velocity:.5}]},{type:'notes.transpose',trackId:id,semitones:12}]).project;assert.deepEqual(p.tracks[0].notes[0],{id:'n',pitch:72,start:1,duration:2,velocity:.5});p=applyActions(p,[{type:'track.duplicate',trackId:id}]).project;assert.notEqual(p.tracks[0].notes[0].id,p.tracks[1].notes[0].id);p=applyActions(p,[{type:'notes.remove',trackId:id,ids:['n']},{type:'track.remove',trackId:p.tracks[1].id}]).project;assert.equal(p.tracks[0].notes.length,0);assert.throws(()=>applyActions(p,[{type:'track.remove',trackId:id}]),/1–16/);});
test('WAV header, sample rate, stereo pan, tail and nonzero deterministic PCM',()=>{const p=makeProject(false);p.bpm=120;p.bars=1;p.reverb=0;p.tracks[0].pan=-1;p.tracks[0].notes=[{id:'n',pitch:69,start:0,duration:1,velocity:.8}];const {bytes,seconds}=renderWav(p);const v=new DataView(bytes.buffer);assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(v.getUint32(24,true),44100);assert.equal(v.getUint16(22,true),2);assert.equal(v.getUint32(40,true),bytes.length-44);assert.equal(seconds,5.5);let left=0,right=0;for(let i=44;i<bytes.length;i+=4){left+=Math.abs(v.getInt16(i,true));right+=Math.abs(v.getInt16(i+2,true));}assert.ok(left>1e6);assert.equal(right,0);assert.deepEqual(bytes,renderWav(p).bytes);p.tracks[0].mute=true;assert.equal(renderWav(p).peak,0);});
test('A4 pitch is ~440Hz, octave doubles and envelopes release to zero',()=>{const t=makeTrack('pad');t.synth={...t.synth,wave:'sine',detune:0,attack:.002,decay:.1,sustain:1,release:.1};const crossings=pitch=>{const a=voice(t,{pitch,start:0,duration:2,velocity:1},120);let c=0;for(let i=4410;i<22050;i++)if(a[i-1]<0&&a[i]>=0)c++;assert.ok(Math.abs(a.at(-1))<.0001);return c/.4;};assert.ok(Math.abs(crossings(69)-440)<4);assert.ok(Math.abs(crossings(81)-880)<4);});
test('all instruments and drums render finite, audible and distinct waveforms',()=>{const fingerprints=new Set();for(const preset of Object.keys(PRESETS)){const t=makeTrack(preset);const a=voice(t,{pitch:preset==='drums'?36:60,start:0,duration:.5,velocity:.7},120,22050);let energy=0;for(const x of a){assert.ok(Number.isFinite(x));energy+=x*x;}assert.ok(energy>.01,preset);fingerprints.add(Array.from(a.slice(100,120)).map(x=>x.toFixed(5)).join());}assert.equal(fingerprints.size,Object.keys(PRESETS).length);for(const pitch of [36,38,42,46,39,45])assert.ok(voice(makeTrack('drums'),{pitch,start:0,duration:.25,velocity:.7},120).some(x=>Math.abs(x)>.01));});
function parseMidi(bytes){const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'MThd');const tracks=[];let pos=14;while(pos<bytes.length){assert.equal(new TextDecoder().decode(bytes.slice(pos,pos+4)),'MTrk');const length=v.getUint32(pos+4),end=pos+8+length;pos+=8;let time=0;const events=[];const variable=()=>{let n=0,x;do{x=bytes[pos++];n=(n<<7)|(x&127);}while(x&128);return n;};while(pos<end){time+=variable();const status=bytes[pos++];if(status===255){const type=bytes[pos++],len=variable();events.push({time,status,type,data:[...bytes.slice(pos,pos+len)]});pos+=len;}else{const len=(status&240)===192?1:2;events.push({time,status,data:[...bytes.slice(pos,pos+len)]});pos+=len;}}tracks.push(events);}return tracks;}
test('MIDI carries tempo, GM programs, drum channel 10, note offs, swing and end time',()=>{const p=makeProject();p.swing=.2;const bytes=midiBytes(p),tracks=parseMidi(bytes);assert.equal(tracks.length,5);const tempo=tracks[0].find(e=>e.type===81).data.reduce((a,b)=>(a<<8)|b,0);assert.equal(tempo,Math.round(60e6/112));const drums=tracks.at(-1);assert.ok(drums.some(e=>e.status===153&&e.data[0]===36));for(const t of tracks.slice(1)){assert.equal(t.filter(e=>(e.status&240)===144).length,t.filter(e=>(e.status&240)===128).length);assert.equal(t.at(-1).time,16*480);}assert.equal(swingBeat(.5,.2),.6);});
test('solo/mute selection and polyphony density guard',()=>{const p=makeProject();p.tracks[0].solo=true;assert.equal(activeTracks(p).length,1);p.tracks[0].mute=true;assert.equal(activeTracks(p).length,0);const q=makeProject(false);q.bars=16;q.bpm=40;for(let i=0;i<50;i++)q.tracks[0].notes.push({id:'n'+i,pitch:60,start:0,duration:64,velocity:.7});assert.throws(()=>renderWav(q),/密集/);});
test('MCP discovery, tool schemas, revisions, atomic invalid batch, transport ACK and exports',async()=>{const service=createService(memoryStorage());const call=async(method,params)=>{const r=await service.handle(new Request('http://localhost/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));return (await r.json()).result;};assert.deepEqual((await call('server/discover')).supportedVersions,['2026-07-28']);assert.equal((await call('tools/list')).tools.length,TOOLS.length);const initial=await service.tool('music_get_project');const trackId=initial.project.tracks[0].id;const valid=await call('tools/call',{name:'music_edit',arguments:{expectedRevision:0,actions:[{type:'project.set',bpm:120}]}});assert.equal(valid.isError,false);const conflict=await call('tools/call',{name:'music_edit',arguments:{expectedRevision:0,actions:[{type:'project.set',bpm:150}]}});assert.equal(conflict.isError,true);assert.equal((await service.tool('music_get_project')).project.bpm,120);const invalid=await call('tools/call',{name:'music_edit',arguments:{expectedRevision:1,actions:[{type:'project.set',bpm:140},{type:'notes.add',trackId,notes:[{pitch:200,start:0,duration:1}]}]}});assert.equal(invalid.isError,true);assert.equal((await service.tool('music_get_project')).project.bpm,120);const command=await service.tool('music_transport',{action:'play'});assert.equal(command.status,'queued');await service.handle(new Request('http://localhost/api/ack',{method:'POST',body:JSON.stringify({id:command.id,message:'played'})}));assert.equal((await service.tool('music_get_command',{id:command.id})).status,'acknowledged');for(const format of ['wav','midi']){const result=await service.tool('music_export',{format});const response=await service.handle(new Request('http://localhost'+result.url));assert.equal(response.status,200);assert.ok((await response.arrayBuffer()).byteLength>40);}});
test('origin, malformed JSON and content size handling',async()=>{const s=createService(memoryStorage());const res=await s.handle(new Request('http://localhost/api/edit',{method:'POST',headers:{Origin:'http://evil.example'},body:'{}'}));assert.equal(res.status,403);assert.equal((await s.handle(new Request('http://localhost/mcp',{method:'POST',body:'wrong'}))).status,400);assert.equal((await s.handle(new Request('http://localhost/api/edit',{method:'POST',headers:{'Content-Length':'3000000'},body:'{}'}))).status,413);});
const roughness=(a,from,to)=>{let diff=0,energy=0;for(let i=from+1;i<to&&i<a.length;i++){const d=a[i]-a[i-1];diff+=d*d;energy+=a[i]*a[i];}return diff/(energy+1e-12);};
const pitchSpreadCents=(a,f0,rate)=>{const frame=1024,hop=128,found=[];for(let p=Math.round(.25*rate);p+frame<a.length;p+=hop){const x=a.slice(p,p+frame);let mean=0;for(const v of x)mean+=v;mean/=frame;let best=0,bestLag=0;const lo=Math.round(rate/(f0*1.15)),hi=Math.round(rate/(f0*.85));for(let lag=lo;lag<=hi;lag++){let sum=0;for(let i=0;i<frame-lag;i++)sum+=(x[i]-mean)*(x[i+lag]-mean);if(sum>best){best=sum;bestLag=lag;}}if(bestLag)found.push(rate/bestLag);}if(found.length<8)return null;const mean=found.reduce((s,v)=>s+v,0)/found.length;const cents=found.map(v=>1200*Math.log2(v/mean));return Math.sqrt(cents.reduce((s,v)=>s+v*v,0)/cents.length);};
test('struck notes darken as they decay (filter envelope + partial damping)',()=>{const t=makeTrack('piano');const a=voice(t,{pitch:60,start:0,duration:1,velocity:.8},60);const early=roughness(a,Math.round(.02*44100),Math.round(.12*44100)),late=roughness(a,Math.round(.5*44100),Math.round(.9*44100));assert.ok(early>.001);assert.ok(late<early*.6,`early ${early} late ${late}`);const s=makeTrack('piano').synth;assert.equal(s.harmonics.length,16);assert.ok(s.harmonics[15]>0);assert.ok(s.inharmonic>0);});
test('bowed presets carry vibrato while the clarinet stays steady',()=>{const violin=voice(makeTrack('violin'),{pitch:60,start:0,duration:1.2,velocity:.8},60);const spread=pitchSpreadCents(violin,261.63,44100);assert.ok(spread>6&&spread<40,`violin spread ${spread}`);const clarinet=voice(makeTrack('clarinet'),{pitch:60,start:0,duration:1.2,velocity:.8},60);const flat=pitchSpreadCents(clarinet,261.63,44100);assert.ok(flat<6,`clarinet spread ${flat}`);});
test('new realism fields validate and old 8-partial projects still load',()=>{const legacy=JSON.parse(JSON.stringify(makeProject(false)));legacy.tracks[0].synth={wave:'custom',harmonics:[1,.42,.21,.11,.06,.03,.02,.01],attack:.004,decay:1.2,sustain:.12,release:.36,cutoff:8500,detune:0};assert.doesNotThrow(()=>validateProject(legacy));const p=makeProject(false),id=p.tracks[0].id;assert.throws(()=>applyActions(p,[{type:'track.set',trackId:id,synth:{bright:2}}]),/bright/);assert.throws(()=>applyActions(p,[{type:'track.set',trackId:id,synth:{harmonics:Array(12).fill(.5)}}]),/泛音/);assert.throws(()=>applyActions(p,[{type:'track.set',trackId:id,synth:{level:5}}]),/level/);const v=voice(legacy.tracks[0],{pitch:60,start:0,duration:.5,velocity:.7},120);assert.ok(v.some(x=>Math.abs(x)>1e-4));});
import {setBank,clearBank,hasBank,info} from '../src/sampler.js';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

function makeTestBank(){
  const rate=32000,length=rate*0.2,pcm=new Int16Array(length);
  for(let i=0;i<length;i++)pcm[i]=Math.round(Math.sin(2*Math.PI*440*i/rate)*12000);
  const manifest={version:1,rate,presets:{piano:{program:0,gain:1,zones:[{sample:0,keyLow:0,keyHigh:127,velLow:0,velHigh:127,rootKey:69,tune:0,attenuation:0,env:{delay:0,attack:.005,hold:0,decay:.4,sustain:.5,release:.2},loop:true,loopStart:100,loopEnd:length-2,sampleModes:1}]}},samples:[{offset:0,length}]};
  const manifestBytes=Buffer.from(JSON.stringify(manifest),'utf8');
  const header=Buffer.alloc(8+manifestBytes.length+(manifestBytes.length%2?1:0));
  header.write('MGB1',0,'ascii');header.writeUInt32LE(manifestBytes.length,4);manifestBytes.copy(header,8);
  return Buffer.concat([header,Buffer.from(pcm.buffer)]);
}

test('sampled engine takes over when a bank is loaded and falls back without it',()=>{
  const track=makeTrack('piano');
  const note={pitch:60,start:0,duration:1,velocity:.8};
  const synth=voice(track,note,120);
  try{
    const loaded=setBank(makeTestBank());
    assert.equal(loaded.ready,true);
    assert.equal(hasBank(),true);
    const a=voice(track,note,120),b=voice(track,note,120);
    assert.ok(a.length>0);
    assert.ok(a.some(x=>Number.isFinite(x)&&Math.abs(x)>1e-4));
    assert.deepEqual(a,b);
    assert.notDeepEqual(a,synth.slice(0,a.length));
    track.synth={...track.synth,engine:'synth'};
    assert.deepEqual(voice(track,note,120),synth);
    track.synth={...track.synth,engine:'auto'};
  }finally{
    clearBank();
  }
  assert.equal(hasBank(),false);
  assert.deepEqual(voice(track,note,120),synth);
});

test('baked FluidR3 bank loads with twenty-three sampled presets',()=>{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const file=resolve(root,'assets/fluid-lite.bank');
  if(!existsSync(file))return; // bank is built locally; synth fallback is tested above
  try{
    const infoData=setBank(readFileSync(file));
    assert.equal(infoData.ready,true);
    assert.equal(infoData.rate,44100);
    assert.equal(infoData.presets.length,23);
    assert.ok(infoData.presets.includes('piano')&&infoData.presets.includes('drums')&&infoData.presets.includes('trumpet'));
    const track=makeTrack('piano');
    const samples=voice(track,{pitch:60,start:0,duration:.5,velocity:.8},120);
    assert.ok(samples.some(x=>Math.abs(x)>1e-4));
  }finally{
    clearBank();
  }
});

test('custom instruments are first-class presets and render audio',()=>{
  const p=makeProject(false);
  const synth={...CUSTOM_TEMPLATE,engine:'synth',harmonics:[1,.4,.2,.1,0,0,0,0,0,0,0,0,0,0,0,0]};
  const r=applyActions(p,[{type:'track.add',id:'lead-x',preset:'custom:abc-123',synth,name:'我的音色'},{type:'notes.add',trackId:'lead-x',notes:[{pitch:60,start:0,duration:.5}]}]);
  assert.equal(r.project.tracks[1].preset,'custom:abc-123');
  assert.equal(r.project.tracks[1].synth.engine,'synth');
  assert.doesNotThrow(()=>validateProject(r.project));
  const q=applyActions(p,[{type:'track.set',trackId:p.tracks[0].id,preset:'custom:keep',synth}]).project;
  assert.equal(q.tracks[0].synth.engine,'synth');
  assert.ok(renderWav(r.project).bytes.length>44);
  assert.throws(()=>applyActions(p,[{type:'track.set',trackId:p.tracks[0].id,preset:'custom:bad',synth:{...synth,harmonics:[1,2,3]}}]),/泛音/);
});

test('custom instrument library saves, lists, deletes and feeds tracks',async()=>{
  const service=createService(memoryStorage());
  const saved=await service.tool('music_save_instrument',{name:'测试主音',synth:{...CUSTOM_TEMPLATE,engine:'synth'}});
  assert.ok(saved.id);
  assert.equal(saved.name,'测试主音');
  assert.equal((await service.tool('music_list_instruments')).instruments.length,1);
  await assert.rejects(service.tool('music_save_instrument',{name:'坏音色',synth:{...CUSTOM_TEMPLATE,harmonics:[1]}}),/泛音/);
  const initial=await service.tool('music_get_project');
  await service.tool('music_edit',{expectedRevision:initial.project.revision,actions:[{type:'track.add',preset:'custom:'+saved.id,synth:saved.synth,name:saved.name}]});
  const project=await service.tool('music_get_project');
  const track=project.project.tracks.at(-1);
  assert.equal(track.preset,'custom:'+saved.id);
  assert.equal(track.name,'测试主音');
  const wav=await service.tool('music_export',{format:'wav'});
  assert.ok(wav.bytes>44);
  const deleted=await service.tool('music_delete_instrument',{id:saved.id});
  assert.equal(deleted.ok,true);
  assert.equal((await service.tool('music_list_instruments')).instruments.length,0);
});
