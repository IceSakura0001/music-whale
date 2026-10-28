import {writeFile,readFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.MUSE_GRID_URL||'http://127.0.0.1:4317';
const api=async(path,body)=>{const r=await fetch(base+path,body?{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}:{});assert.ok(r.ok,await r.clone().text());return r.json();};
const rpc=async(name,args={})=>{const r=await api('/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}});assert.equal(r.result.isError,false,JSON.stringify(r));return r.result.structuredContent;};
await mkdir('test-results',{recursive:true});
if(process.argv.includes('--restore')){const snapshot=JSON.parse(await readFile('test-results/original-project.json','utf8'));const {project}=await rpc('music_get_project');await rpc('music_edit',{expectedRevision:project.revision,actions:[{type:'project.replace',project:snapshot}]});console.log('Restored original project.');}else{
const {project}=await rpc('music_get_project');await writeFile('test-results/original-project.json',JSON.stringify(project));
const edited=await rpc('music_edit',{expectedRevision:project.revision,actions:[{type:'track.add',id:'qa-agent-flute',preset:'flute',name:'Agent 测试长笛'},{type:'notes.add',trackId:'qa-agent-flute',notes:[{pitch:72,start:0,duration:1,velocity:.7},{pitch:76,start:1,duration:1,velocity:.7}]},{type:'track.set',trackId:'qa-agent-flute',pan:.2}]});
assert.equal(edited.project.tracks.length,project.tracks.length+1);
const analysis=await rpc('music_analyze_project');assert.ok(analysis.notes>0);
const command=await rpc('music_transport',{action:'stop'});
for(const format of ['wav','midi']){const result=await rpc('music_export',{format}),response=await fetch(base+result.url),bytes=new Uint8Array(await response.arrayBuffer());assert.equal(bytes.length,result.bytes);await writeFile('test-results/live-export.'+(format==='wav'?'wav':'mid'),bytes);}
await writeFile('test-results/live-check.json',JSON.stringify({revision:edited.project.revision,commandId:command.id,analysis},null,2));console.log(JSON.stringify({ok:true,revision:edited.project.revision,commandId:command.id,trackName:'Agent 测试长笛',exports:'test-results/live-export.wav + .mid'}));
}
