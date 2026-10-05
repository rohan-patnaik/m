import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateRecord} from '../records.js';
export function convertLegacy(data){
 const s=data.state,records=[],ut={sabzi:'kadhai',dal:'cooker',prot:'pan'};
 const add=(key,value)=>{validateRecord(key,value);records.push({key,value});};
 const settings={labels:s.labels||{},density:s.density||1.03,soya:s.soya||'N',oilUse:{sabzi:14,dal:8,bf:6,prot:4,egg:2,...s.oilUse},personModes:s.personModes||{w:'easy',h:s.mode||'medium'},utSel:{...ut,...s.utSel}};
 for(const [k,v]of Object.entries(settings))add('setting/'+k,v);
 for(const k of ['kadhai','cooker','pan','bigpan','medpan'])add('setting/utensils/'+k,s.utensils?.[k]||0);
 const days=(prefix,w)=>w.days.forEach((d,i)=>add(prefix+'/day/'+i,{meal:{b:d.b,s:d.s,p:d.p,dal:d.dal,off:!!d.off,skip:{b:false,l:false,d:false,...d.skip},wheyW:d.wheyW!==false,wheyH:d.wheyH!==false,eggH:d.eggH!==false,cardioW:d.cardioW!==false,cardioH:d.cardioH!==false},utensils:{...ut,...w.utDay?.[i]}}));
 days('template',s);
 for(const [date,w]of Object.entries(data.lockedWeeks||{})){add('week/'+date,{savedAt:w.savedAt||data.updatedAt||0});days('week/'+date,w);}
 return records;
}
if(process.argv[1]?.endsWith('/migrate.mjs')){
 const records=convertLegacy(JSON.parse(readFileSync(process.argv[2],'utf8')));
 const result=spawnSync('node_modules/.bin/convex',['run','household:seed',JSON.stringify({records}),...(process.argv.includes('--prod')?['--prod']:[])],{stdio:'inherit'});
 process.exitCode=result.status||0;
}
