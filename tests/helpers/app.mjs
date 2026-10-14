import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {buildSync} from 'esbuild';
import * as batches from '../../batch-math.js';
import * as weighing from '../../weigh-math.js';
import * as records from '../../records.js';

const bundle=buildSync({entryPoints:[new URL('../../convex-browser.js',import.meta.url).pathname],bundle:true,format:'iife',write:false}).outputFiles[0].text;
export function app(withUX=false){
 const document={addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];}};
 const ctx=vm.createContext({document,window:{addEventListener(){}},BatchMath:batches,WeighMath:weighing,MealCloud:records,crypto:webcrypto,structuredClone,console,TextEncoder,setInterval(){},navigator:{onLine:true}});
 vm.runInContext(bundle,ctx);ctx.MealCloud=ctx.window.MealCloud;ctx.ActivityMath=ctx.window.ActivityMath;
 for(const file of ['batch-runtime.js','weigh-runtime.js','cloud-runtime.js','nutrition-runtime.js','household-runtime.js','shopping-runtime.js','keto-runtime.js','keto-suggestions-runtime.js'])vm.runInContext(readFileSync(new URL('../../'+file,import.meta.url),'utf8'),ctx);
 if(withUX)for(const file of ['ux-runtime.js','meal-editor-runtime.js'])vm.runInContext(readFileSync(new URL('../../'+file,import.meta.url),'utf8'),ctx);
 const script=readFileSync(new URL('../../index.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInContext(script.slice(0,script.indexOf("document.addEventListener('input'")),ctx);
 vm.runInContext("state.weekKey=null;templateDays=structuredClone(state.days);templateUtensils=structuredClone(state.utDay);cloudReady=true;render=()=>{}",ctx);
 return s=>vm.runInContext(s,ctx);
}

