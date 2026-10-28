import {createService} from '../src/service.js';
export function createWorker(assets){return {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/')||path==='/mcp'){
  if(!env.BUCKET)return Response.json({error:'持久存储未连接'},{status:503});
  const storage={
   async read(){const o=await env.BUCKET.get('studio/current.json');return o?{data:await o.json(),etag:o.etag}:null;},
   async write(data,etag){const r=await env.BUCKET.put('studio/current.json',JSON.stringify(data),{onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});if(!r)throw Object.assign(Error('版本冲突，请重试'),{status:409});},
   async putExport(file,bytes,type){await env.BUCKET.put('exports/'+file,bytes,{httpMetadata:{contentType:type}});},
   async getExport(file){const o=await env.BUCKET.get('exports/'+file);return o?{bytes:o.body,type:o.httpMetadata?.contentType||'application/octet-stream'}:null;}
  };return createService(storage).handle(request);
 }
 const asset=assets[path==='/'?'/index.html':path];if(!asset)return new Response('Not found',{status:404});return new Response(asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
}};}
