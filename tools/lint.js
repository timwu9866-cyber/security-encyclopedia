const fs=require('fs');const d=JSON.parse(fs.readFileSync(__dirname+'/../data/events.json','utf8'));
const cats=new Set(d.categories.map(c=>c.id)),sevs=new Set(['critical','high','medium','low','none']);
const PRIMS=new Set(['link','packet','stream','burst','ring','nodefx','relay','hosts','glyph','orbit','sweep','shield','gate','records','buffer','bar','panel','meter','queue','privesc','timer','loopArc','@hit','@tint','@strike','@pulse']);
const bad=[/'\s*or\s*1\s*=\s*1/i,/<script/i,/rm\s+-rf/i,/union\s+select/i,/\/bin\/(ba)?sh/i,/nc\s+-e/i,/powershell\s+-enc/i,/sekurlsa/i,/\bexploit\s+code\b/i,/msfvenom/i,/cmd\.exe\s*\/c/i];
let errs=[],ids=new Set(),names=new Set();
const req=['id','cat','name','en','sev','stage','src','dst','principle','impact','defense','refs','dur','ph','fx'];
for(const e of d.events){
  for(const k of req) if(e[k]===undefined||e[k]===null||e[k]==='') errs.push(e.id+': missing '+k);
  if(ids.has(e.id))errs.push('dup id '+e.id);ids.add(e.id);
  if(names.has(e.name))errs.push('dup name '+e.name);names.add(e.name);
  if(!cats.has(e.cat))errs.push(e.id+': bad cat');if(!sevs.has(e.sev))errs.push(e.id+': bad sev');
  if(!Array.isArray(e.defense)||e.defense.length<3)errs.push(e.id+': defense<3');
  if(!e.refs||e.refs.length<1)errs.push(e.id+': refs empty');
  const sn=(e.principle.match(/[。]/g)||[]).length; if(sn<2||sn>6)errs.push(e.id+': principle sentences '+sn);
  if(!e.ph||e.ph.length<5)errs.push(e.id+': ph<5');
  else{let last=-1;for(const p of e.ph){if(p[0]<=last)errs.push(e.id+': ph not ascending');last=p[0];if(p[0]>=e.dur)errs.push(e.id+': ph beyond dur');}}
  for(const f of e.fx){if(!PRIMS.has(f[0]))errs.push(e.id+': unknown prim '+f[0]);if(f[2]>e.dur+0.6&&f[0]!=='nodefx')errs.push(e.id+': fx beyond dur '+f[0]+' '+f[2]);}
  const txt=JSON.stringify(e);for(const r of bad)if(r.test(txt))errs.push(e.id+': blacklisted pattern '+r);
}
const bycat={};for(const e of d.events)(bycat[e.cat]=bycat[e.cat]||[]).push(e);
console.log('events',d.events.length,'cats',d.categories.length);console.log(d.categories.map(c=>c.id+':'+(bycat[c.id]||[]).length).join(' '));
console.log('ERRORS',errs.length);errs.forEach(x=>console.log(' ',x));
