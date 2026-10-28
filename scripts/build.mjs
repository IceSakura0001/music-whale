import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
const files=['src/core.js','src/sampler.js','src/audio.js','src/service.js','worker/handler.js'];
let code='';for(const f of files)code+=(await readFile(f,'utf8')).replace(/^import .*?;\r?\n/gm,'').replace(/^export /gm,'')+'\n';
const assets={};for(const [path,file,type]of [['/index.html','web/index.html','text/html; charset=utf-8'],['/style.css','web/style.css','text/css; charset=utf-8'],['/app.js','web/app.js','text/javascript; charset=utf-8'],['/src/core.js','src/core.js','text/javascript; charset=utf-8'],['/src/audio.js','src/audio.js','text/javascript; charset=utf-8'],['/src/sampler.js','src/sampler.js','text/javascript; charset=utf-8']])assets[path]={body:await readFile(file,'utf8'),type};
code+='\nexport default createWorker('+JSON.stringify(assets)+');\n';
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await writeFile('dist/server/index.js',code);await copyFile('.openai/hosting.json','dist/.openai/hosting.json');console.log('Built self-contained Worker and browser assets.');
