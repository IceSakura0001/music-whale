import {makeProject,applyActions,PRESETS,DRUMS,VERSION,uid,clone,validateSynth,PRESET_GROUPS} from './core.js';
import {renderWav,midiBytes} from './audio.js';
const SYNTH_SCHEMA={type:'object',properties:{wave:{type:'string',enum:['sine','triangle','sawtooth','square','custom']},engine:{type:'string',enum:['auto','synth','sample']},harmonics:{type:'array',minItems:8,maxItems:16,items:{type:'number',minimum:0,maximum:1}},attack:{type:'number'},decay:{type:'number'},sustain:{type:'number'},release:{type:'number'},cutoff:{type:'number'},detune:{type:'number'},bright:{type:'number',minimum:0,maximum:1},damp:{type:'number',minimum:0,maximum:18},inharmonic:{type:'number',minimum:0,maximum:.002},noise:{type:'number',minimum:0,maximum:1},noiseDecay:{type:'number',minimum:2,maximum:400},noiseTone:{type:'number',minimum:100,maximum:16000},breath:{type:'number',minimum:0,maximum:1},formant:{type:'number',minimum:0,maximum:8000},formantGain:{type:'number',minimum:0,maximum:4},vibrato:{type:'number',minimum:0,maximum:80},vibratoRate:{type:'number',minimum:1,maximum:9},vibratoDelay:{type:'number',minimum:0,maximum:3},unison:{type:'number',minimum:0,maximum:40},level:{type:'number',minimum:.05,maximum:4}}};
export const TOOLS=[
 {name:'music_get_project',description:'读取当前乐曲、版本号和最近的浏览器播放命令。编辑前先读取 revision。时间单位为四分音符拍，音高为 MIDI 0–127。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'music_list_presets',description:'列出内置乐器预设（采样或合成）、参数、分组与鼓组映射。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'music_edit',description:'以一个事务批量编辑乐曲。所有操作通过验证后一次提交；版本冲突时重新读取再修改。支持项目、音轨、音符与自定义波形。用 track.add 的 id 指定 ID 可在同批后续引用。',inputSchema:{type:'object',required:['expectedRevision','actions'],additionalProperties:false,properties:{expectedRevision:{type:'integer',minimum:0},actions:{type:'array',minItems:1,maxItems:512,items:{oneOf:[
  {type:'object',required:['type'],properties:{type:{const:'project.set'},name:{type:'string'},bpm:{type:'number',minimum:40,maximum:240},bars:{type:'integer',minimum:1,maximum:16},swing:{type:'number',minimum:0,maximum:.45},master:{type:'number',minimum:0,maximum:1},reverb:{type:'number',minimum:0,maximum:.5},loop:{type:'boolean'}}},
  {type:'object',required:['type','project'],properties:{type:{const:'project.replace'},project:{type:'object',description:'完整 schemaVersion=1 项目；使用 music_get_project 返回格式'}}},
  {type:'object',required:['type','preset'],properties:{type:{const:'track.add'},preset:{type:'string'},id:{type:'string'},name:{type:'string'},synth:SYNTH_SCHEMA}},
  {type:'object',required:['type','trackId'],properties:{type:{const:'track.set'},trackId:{type:'string'},name:{type:'string'},preset:{type:'string',enum:Object.keys(PRESETS)},color:{type:'string'},volume:{type:'number'},pan:{type:'number'},mute:{type:'boolean'},solo:{type:'boolean'},synth:SYNTH_SCHEMA}},
  {type:'object',required:['type','trackId'],properties:{type:{enum:['track.remove','track.duplicate','notes.clear']},trackId:{type:'string'}}},
  {type:'object',required:['type','trackId','notes'],properties:{type:{const:'notes.add'},trackId:{type:'string'},notes:{type:'array',maxItems:512,items:{type:'object',required:['pitch','start','duration'],properties:{id:{type:'string'},pitch:{type:'integer',minimum:0,maximum:127},start:{type:'number'},duration:{type:'number'},velocity:{type:'number',minimum:.01,maximum:1}}}}}},
  {type:'object',required:['type','trackId','notes'],properties:{type:{const:'notes.update'},trackId:{type:'string'},notes:{type:'array',items:{type:'object',required:['id'],properties:{id:{type:'string'},pitch:{type:'integer'},start:{type:'number'},duration:{type:'number'},velocity:{type:'number'}}}}}},
  {type:'object',required:['type','trackId','ids'],properties:{type:{const:'notes.remove'},trackId:{type:'string'},ids:{type:'array',items:{type:'string'}}}},
  {type:'object',required:['type','trackId','semitones'],properties:{type:{const:'notes.transpose'},trackId:{type:'string'},semitones:{type:'integer',minimum:-48,maximum:48},ids:{type:'array',items:{type:'string'}}}}
 ]}}}},annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:false}},
 {name:'music_transport',description:'请求打开的网页播放、暂停、停止或试听。返回 queued 命令 ID；用 music_get_command 查询是否执行。网页须保持打开，并先由用户点击一次播放以解锁浏览器音频。不会声称排队等于已播放。',inputSchema:{type:'object',required:['action'],additionalProperties:false,properties:{action:{type:'string',enum:['play','pause','stop','preview']},trackId:{type:'string'},pitch:{type:'integer',minimum:0,maximum:127}}},annotations:{readOnlyHint:false,destructiveHint:false}},
 {name:'music_get_command',description:'查询播放命令 queued/acknowledged/error 状态与浏览器反馈。',inputSchema:{type:'object',required:['id'],properties:{id:{type:'string'}},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'music_export',description:'导出当前混音为 WAV（44.1kHz/16bit/立体声）或 MIDI（含 BPM、GM 音色和鼓通道）。无需网页打开。返回下载路径与文件大小。WAV 合成密度上限 2200 万采样点。',inputSchema:{type:'object',required:['format'],additionalProperties:false,properties:{format:{type:'string',enum:['wav','midi']},normalize:{type:'boolean',default:true},trackId:{type:'string',description:'可选，仅导出指定音轨，保留该轨静音状态'}}},annotations:{readOnlyHint:false,destructiveHint:false}},
 {name:'music_list_instruments',description:'列出用户保存的自定义合成音色。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'music_save_instrument',description:'保存或更新一个自定义合成音色。name 为 1–40 字，synth 为完整合成参数；省略 id 时新建。',inputSchema:{type:'object',required:['name','synth'],additionalProperties:false,properties:{id:{type:'string'},name:{type:'string'},synth:SYNTH_SCHEMA}},annotations:{readOnlyHint:false,destructiveHint:false}},
 {name:'music_delete_instrument',description:'删除一个已保存的自定义音色；正在使用它的音轨保留自己的参数快照。',inputSchema:{type:'object',required:['id'],additionalProperties:false,properties:{id:{type:'string'}}},annotations:{readOnlyHint:false,destructiveHint:true}},
 {name:'music_get_help',description:'获取编曲 API、限制、时间单位、项目版本和一个批量创建音轨示例。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
 {name:'music_analyze_project',description:'读取乐曲时长、音符数、各轨音域和 WAV 渲染密度预算，帮助 agent 判断编曲与导出限制。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}}
];
export const HELP={name:'Music Whale',version:VERSION,units:{time:'quarter-note beats, zero-based',pitch:'MIDI integer, middle C = 60',velocity:'0.01–1',meter:'4/4'},limits:{bpm:[40,240],bars:[1,16],tracks:16,notes:2048,actions:512},workflow:['music_get_project → revision','music_list_presets','music_edit(expectedRevision, actions)','music_export or music_transport → music_get_command'],example:{expectedRevision:0,actions:[{type:'track.add',preset:'flute',id:'flute-1',name:'长笛旋律'},{type:'notes.add',trackId:'flute-1',notes:[{pitch:72,start:0,duration:1,velocity:.7},{pitch:76,start:1,duration:1,velocity:.7}]}]},browserAPI:'window.museGrid: getProject(), dispatch(actions), play(), pause(), stop(), preview(pitch), export(format)',sync:'HTTP/MCP and browser share a revisioned project. Poll every 1.5 seconds. Browser-only playback requires an open audio-unlocked tab.',auth:'Hosted instance is owner-private, relies on Sites authentication. Do not make public without adding write authorization. Local server binds 127.0.0.1 and rejects cross-origin writes.',sound:'The desktop app and local server load a FluidR3 GM sample bank (MIT, Frank Wen/Toby Smithe) for 18 built-in presets; without the bank every preset falls back to a 16-partial synthesizer with inharmonicity, filter envelopes, attack transients and body resonances. Custom instruments always use the synthesizer. Nothing is streamed at playback time; MIDI GM playback varies between players.'};
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function createService(storage){
 async function read(){const r=await storage.read();if(r){if(!Array.isArray(r.data.instruments))r.data.instruments=[];return r;}const data={project:makeProject(),commands:[],instruments:[]};await storage.write(data,null);return await storage.read();}
 async function mutate(fn){const {data,etag}=await read();const result=await fn(data);await storage.write(data,etag);return result;}
 async function tool(name,args={}){
  switch(name){
   case 'music_get_project':{const {data}=await read();return {project:data.project,commands:data.commands.slice(-5)};}
   case 'music_list_presets':return {presets:PRESETS,drums:DRUMS,groups:PRESET_GROUPS};
   case 'music_get_help':return HELP;
   case 'music_analyze_project':{const {data}=await read(),p=data.project;let samples=0;const tracks=p.tracks.map(t=>{let cost=0;for(const n of t.notes)cost+=(t.preset==='drums'?.5:n.duration*60/p.bpm+t.synth.release)*44100;samples+=cost;return {id:t.id,name:t.name,notes:t.notes.length,pitchRange:t.notes.length?[Math.min(...t.notes.map(n=>n.pitch)),Math.max(...t.notes.map(n=>n.pitch))]:null,estimatedVoiceSamples:Math.ceil(cost),mute:t.mute,solo:t.solo};});return {revision:p.revision,durationSeconds:p.bars*4*60/p.bpm,notes:tracks.reduce((s,t)=>s+t.notes,0),tracks,totalEstimatedVoiceSamples:Math.ceil(samples),wavVoiceSampleLimit:22e6};}
   case 'music_edit':return mutate(data=>{if(!Number.isInteger(args.expectedRevision)||args.expectedRevision!==data.project.revision)throw fail('版本冲突，请读取最新项目后重试',409);const result=applyActions(data.project,args.actions);data.project=result.project;return result;});
   case 'music_transport':return mutate(data=>{if(!['play','pause','stop','preview'].includes(args.action))throw fail('无效播放命令');if(args.trackId&&!data.project.tracks.some(t=>t.id===args.trackId))throw fail('音轨不存在');if(args.pitch!==undefined&&(!Number.isInteger(args.pitch)||args.pitch<0||args.pitch>127))throw fail('无效音高');const c={id:uid(),action:args.action,trackId:args.trackId,pitch:args.pitch??60,status:'queued',createdAt:Date.now()};data.commands.push(c);data.commands=data.commands.slice(-20);return c;});
   case 'music_get_command':{const {data}=await read();const c=data.commands.find(x=>x.id===args.id);if(!c)throw fail('命令不存在或已过期',404);return c;}
   case 'music_export':{const {data}=await read();let p=data.project;if(!['wav','midi'].includes(args.format))throw fail('导出格式无效');if(args.trackId){const t=p.tracks.find(x=>x.id===args.trackId);if(!t)throw fail('音轨不存在');p={...p,tracks:[t]};}
     const bytes=args.format==='wav'?renderWav(p,{normalize:args.normalize!==false}).bytes:midiBytes(p),id=uid(),ext=args.format==='midi'?'mid':'wav',file=`${id}.${ext}`;await storage.putExport(file,bytes,args.format==='wav'?'audio/wav':'audio/midi');return {url:'/api/exports/'+file,bytes:bytes.length,format:args.format,revision:p.revision,filename:p.name+'.'+ext};}
   case 'music_list_instruments':{const {data}=await read();return {instruments:data.instruments};}
   case 'music_save_instrument':{
    const name=String(args.name??'').trim();if(!name||name.length>40)throw fail('音色名须为 1–40 字');
    let synth;try{synth=validateSynth(args.synth);}catch(e){throw fail(e.message);}
    return mutate(data=>{data.instruments??=[];let item=args.id?data.instruments.find(x=>x.id===args.id):undefined;if(item){item.name=name;item.synth=clone(synth);item.updatedAt=Date.now();}else{if(data.instruments.length>=50)throw fail('最多保存 50 个自定义音色');item={id:uid(),name,synth:clone(synth),createdAt:Date.now()};data.instruments.push(item);}return item;});
   }
   case 'music_delete_instrument':return mutate(data=>{data.instruments??=[];const before=data.instruments.length;data.instruments=data.instruments.filter(x=>x.id!==args.id);if(before===data.instruments.length)throw fail('自定义音色不存在',404);return {ok:true,id:args.id};});
   default:throw fail('未知工具',404);
  }
 }
 async function handle(request){
  const url=new URL(request.url),path=url.pathname;const json=(x,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
  if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'不允许跨来源写入'},403);
  try{
   if(path==='/api/health')return json({ok:true,version:VERSION});
   if(path.startsWith('/api/exports/')){const file=path.split('/').pop();if(!/^[a-z0-9-]+\.(wav|mid)$/.test(file))return json({error:'无效文件'},400);const result=await storage.getExport(file);if(!result)return json({error:'文件不存在'},404);return new Response(result.bytes,{headers:{'Content-Type':result.type,'Content-Disposition':`attachment; filename="music-whale.${file.endsWith('.wav')?'wav':'mid'}"`}});}
   if(path==='/api/project'&&request.method==='GET')return json(await tool('music_get_project'));
   if(path==='/api/presets')return json(await tool('music_list_presets'));
   if(path==='/api/instruments'&&request.method==='GET')return json(await tool('music_list_instruments'));
   if(path.startsWith('/api/instruments/')&&request.method==='DELETE')return json(await tool('music_delete_instrument',{id:decodeURIComponent(path.split('/').pop())}));
   if(path==='/api/help')return json(HELP);
   if(request.method!=='POST')return json({error:'路径不存在'},404);
   if(Number(request.headers.get('content-length')||0)>2e6)return json({error:'请求过大'},413);
   const bodyText=await request.text();if(bodyText.length>2e6)return json({error:'请求过大'},413);let body;try{body=JSON.parse(bodyText);}catch{throw fail('无效 JSON');}
   if(path==='/mcp'){
    const rpc=body;const response=(result)=>json({jsonrpc:'2.0',id:rpc.id,result});
    if(rpc.jsonrpc!=='2.0'||typeof rpc.method!=='string')return json({jsonrpc:'2.0',id:rpc.id??null,error:{code:-32600,message:'Invalid Request'}});
    if(rpc.method==='server/discover')return response({supportedVersions:['2026-07-28'],capabilities:{tools:{}},serverInfo:{name:'music-whale',version:VERSION},instructions:JSON.stringify(HELP)});
    if(rpc.method==='initialize')return response({protocolVersion:'2025-11-25',capabilities:{tools:{}},serverInfo:{name:'music-whale',version:VERSION}});
    if(rpc.method.startsWith('notifications/'))return new Response(null,{status:202});
    if(rpc.method==='ping')return response({});
    if(rpc.method==='tools/list')return response({tools:TOOLS});
    if(rpc.method==='tools/call'){try{const result=await tool(rpc.params?.name,rpc.params?.arguments);return response({content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false});}catch(e){return response({content:[{type:'text',text:e.message}],isError:true});}}
    return json({jsonrpc:'2.0',id:rpc.id,error:{code:-32601,message:'Method not found'}});
   }
   if(path==='/api/instruments')return json(await tool('music_save_instrument',body));
   if(path==='/api/edit')return json(await tool('music_edit',body));
   if(path==='/api/export')return json(await tool('music_export',body));
   if(path==='/api/transport')return json(await tool('music_transport',body));
   if(path==='/api/ack')return json(await mutate(data=>{const c=data.commands.find(c=>c.id===body.id);if(!c)throw fail('命令不存在',404);if(c.status!=='queued')return c;c.status=body.error?'error':'acknowledged';c.message=String(body.error||body.message||'浏览器已执行').slice(0,200);c.acknowledgedAt=Date.now();return c;}));
   return json({error:'路径不存在'},404);
  }catch(e){return json({error:e.message},e.status||400);}
 }
 return {handle,tool};
}
