import readline from 'node:readline';
const endpoint=process.env.MUSE_GRID_URL||'http://127.0.0.1:4317';
// stdout is reserved for newline-delimited JSON-RPC. Never print credentials.
for await(const line of readline.createInterface({input:process.stdin})){try{const rpc=JSON.parse(line);const res=await fetch(endpoint+'/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(rpc)});if(rpc.id!==undefined){const result=await res.text();if(!result)throw Error('Empty MCP response');process.stdout.write(result+'\n');}}catch(e){process.stderr.write('Muse Grid MCP: '+e.message+'\n');}}
