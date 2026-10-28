import {spawn} from 'node:child_process';
import {openSync,closeSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base='http://127.0.0.1:4317';
async function ready(){try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(500)}),data=await r.json();return data.ok===true;}catch{return false;}}
if(await ready())console.log('Music Whale is already running: '+base);else{
 mkdirSync(resolve(root,'.local'),{recursive:true});const out=openSync(resolve(root,'.local/server.log'),'a'),err=openSync(resolve(root,'.local/server-error.log'),'a');
 const child=spawn(process.execPath,[resolve(root,'server.mjs')],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',out,err]});child.unref();closeSync(out);closeSync(err);
 let ok=false;for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,200));if(await ready()){ok=true;break;}}
 if(!ok){console.error('Could not start. See .local/server-error.log');process.exitCode=1;}else console.log('Music Whale is running in the background: '+base+'\nUse the stop launcher to close it.');
}
