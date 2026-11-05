// Verify that course-facing README and architecture links stay valid after cleanup.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const docs=['README.md','AGENTS.md','docs/README.md','docs/architecture/README.md',
 'docs/assignment/README.md','docs/assignment/00-ASSIGNMENT-DOCUMENT.md',
 'docs/assignment/02-SYSTEM-ARCHITECTURE-C4.md','docs/assignment/03-DATA-MODEL.md',
 'docs/assignment/one-page/README.md'];
let failures=[],links=0;
for(const f of docs){
 const full=path.resolve(root,f);
 if(!fs.existsSync(full)){failures.push('Missing doc '+f);continue;}
 const text=fs.readFileSync(full,'utf8');
 for(const m of text.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)){
  let target=m[1].split('#')[0];
  if(!target||/^(https?:|mailto:|#)/i.test(target))continue;
  target=decodeURIComponent(target);
  const dest=path.resolve(path.dirname(full),target);
  links++;
  if(!dest.startsWith(root+path.sep)||!fs.existsSync(dest))failures.push(f+' -> '+target);
 }
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('COURSE_LINKS=PASS ('+docs.length+' docs, '+links+' local links)');
