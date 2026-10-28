import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createService} from './src/service.js';
import {setBank} from './src/sampler.js';
const root=dirname(fileURLToPath(import.meta.url)),dataDir=process.env.MUSE_GRID_DATA?resolve(process.env.MUSE_GRID_DATA):resolve(root,'.local');await mkdir(resolve(dataDir,'exports'),{recursive:true});
// Load the baked FluidR3 sample bank when present; without it the app falls
// back to the synthesizer (the cloud Worker never ships the bank).
let bankBytes=null;
try{bankBytes=await readFile(resolve(root,'assets/fluid-lite.bank'));setBank(bankBytes);console.log('Sample bank loaded: FluidR3 GM ('+(bankBytes.length/1048576).toFixed(1)+' MB)');}catch{console.log('No sample bank found: synth engine only');}
let etag=0;const projectPath=resolve(dataDir,'current.json');
const storage={async read(){try{return {data:JSON.parse(await readFile(projectPath,'utf8')),etag};}catch(e){if(e.code==='ENOENT')return null;throw e;}},async write(data,expected){if(expected!==null&&expected!==etag)throw Object.assign(Error('版本冲突'),{status:409});await writeFile(projectPath+'.tmp',JSON.stringify(data));await rename(projectPath+'.tmp',projectPath);etag++;},async putExport(file,bytes,type){await writeFile(resolve(dataDir,'exports',file),bytes);},async getExport(file){try{return {bytes:await readFile(resolve(dataDir,'exports',file)),type:file.endsWith('.wav')?'audio/wav':'audio/midi'};}catch{return null;}}};
const service=createService(storage);let queue=Promise.resolve();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const port=Number(process.env.PORT||4317);
const server=http.createServer((req,res)=>{const task=async()=>{try{
 if(req.headers.host!==`127.0.0.1:${port}`&&req.headers.host!==`localhost:${port}`){res.writeHead(403);res.end('Invalid host');return;}
 const url=new URL(req.url,`http://${req.headers.host}`);let response;
 if(url.pathname==='/api/local-shutdown'&&req.method==='POST'){
  if(req.headers.origin&&req.headers.origin!==url.origin){res.writeHead(403);res.end();return;}
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}));setTimeout(()=>{server.closeAllConnections();server.close();},100);return;
 }
 if(url.pathname==='/api/engine'){
  response=Response.json({bank:bankBytes!==null,bankBytes:bankBytes?.length??0,presets:bankBytes!==null?23:0},{headers:{'Cache-Control':'no-store'}});
 }else if(url.pathname==='/assets/fluid-lite.bank'){
  if(bankBytes===null){res.writeHead(404);res.end('没有采样库');return;}
  response=new Response(bankBytes,{headers:{'Content-Type':'application/octet-stream','Content-Length':String(bankBytes.length),'Cache-Control':'public, max-age=3600'}});
 }else if(url.pathname.startsWith('/api/')||url.pathname==='/mcp'){
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2e6){res.writeHead(413);res.end();return;}chunks.push(chunk);}
  response=await service.handle(new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})}));
 }else{const allowed={'/':'web/index.html','/index.html':'web/index.html','/style.css':'web/style.css','/app.js':'web/app.js','/src/core.js':'src/core.js','/src/audio.js':'src/audio.js','/src/sampler.js':'src/sampler.js'};const file=allowed[url.pathname];if(!file){res.writeHead(404);res.end('Not found');return;}response=new Response(await readFile(resolve(root,file)),{headers:{'Content-Type':types[file.slice(file.lastIndexOf('.'))],'Cache-Control':'no-store'}});}
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}};queue=queue.then(task,task);});
server.listen(port,'127.0.0.1',()=>console.log(`Music Whale ready at http://127.0.0.1:${port}`));
