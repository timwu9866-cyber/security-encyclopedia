const fs=require('fs'),vm=require('vm'),path=require('path');
const ctx={};ctx.window=ctx;vm.createContext(ctx);
const root=path.join(__dirname,'..','data');
const all=fs.readdirSync(root);
const order=['cats.js','schemes.js','schemes2.js',...all.filter(x=>/^events-(?!new-).*\.js$/.test(x)).sort(),...all.filter(x=>/^events-new-.*\.js$/.test(x)).sort()];
for(const f of order){vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});}
fs.writeFileSync(path.join(root,'events.json'),JSON.stringify({categories:ctx.SEC_CATS,events:ctx.SEC_EVENTS},null,1));
console.log('exported',ctx.SEC_EVENTS.length,'events from',order.length,'files');
