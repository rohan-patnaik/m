// Meal data lives only in Convex; drafts and UI preferences live only in memory.
let cloudClient,cloudReady=false,cloudSaving=false,cloudBase={},cloudDraft={},cloudLatest={},cloudConflicts=[],deferredCloud=null;
let legacyCleanupStarted=false;
let templateDays,templateUtensils,syncStatusText='Loading your household from Convex…',cloudError='';
const SHARED_SETTINGS=['labels','density','soya','oilUse','personModes','utSel'];
function connected(){return !!cloudClient?.connectionState().isWebSocketConnected&&navigator.onLine;}
function syncStatus(t){syncStatusText=t;document.querySelectorAll('[data-syncstatus]').forEach(e=>e.textContent=t);const b=document.querySelector('#syncBtn');if(b)b.title=t;}
function snapshotDraft(){
 if(!cloudReady||loadingCloud)return;
 ensureUtDay();ensureOilUse();
 if(state.weekKey){const old=lockedWeeks[state.weekKey];lockedWeeks[state.weekKey]={days:structuredClone(state.days),utDay:structuredClone(state.utDay),savedAt:old?.savedAt||Date.now()};}
 else{templateDays=structuredClone(state.days);templateUtensils=structuredClone(state.utDay);}
 const next={};
 for(const k of SHARED_SETTINGS)next['setting/'+k]=structuredClone(state[k]);
 for(const k of Object.keys(DEFAULT_UTENSILS))next['setting/utensils/'+k]=state.utensils[k]||0;
 for(let i=0;i<7;i++)next['template/day/'+i]={meal:templateDays[i],utensils:templateUtensils[i]};
 for(const [date,w]of Object.entries(lockedWeeks)){
 next['week/'+date]={savedAt:w.savedAt||Date.now()};
 for(let i=0;i<7;i++)next['week/'+date+'/day/'+i]={meal:w.days[i],utensils:w.utDay?.[i]||{...DEFAULT_UTSEL}};
 }
 cloudDraft=next;
}
function cloudChanges(){return MealCloud.changesBetween(cloudBase,cloudDraft);}
function hydrateDraft(){
 loadingCloud=true;
 try{
 for(const k of SHARED_SETTINGS)if(cloudDraft['setting/'+k]!=null)state[k]=structuredClone(cloudDraft['setting/'+k]);
 for(const k of Object.keys(DEFAULT_UTENSILS))state.utensils[k]=cloudDraft['setting/utensils/'+k]||0;
 templateDays=Array.from({length:7},(_,i)=>structuredClone(cloudDraft['template/day/'+i]?.meal||DEFAULT_DAYS[i]));
 templateUtensils=Array.from({length:7},(_,i)=>structuredClone(cloudDraft['template/day/'+i]?.utensils||DEFAULT_UTSEL));
 lockedWeeks={};
 for(const [key,value]of Object.entries(cloudDraft))if(/^week\/\d{4}-\d{2}-\d{2}$/.test(key)&&value){
 const date=key.slice(5),days=[],utDay=[];
 for(let i=0;i<7;i++){const d=cloudDraft[key+'/day/'+i];if(d){days.push(structuredClone(d.meal));utDay.push(structuredClone(d.utensils));}}
 if(days.length===7)lockedWeeks[date]={days,utDay,savedAt:value.savedAt};
 }
 if(state.weekKey&&!lockedWeeks[state.weekKey])state.weekKey=null;
 const w=state.weekKey&&lockedWeeks[state.weekKey];state.days=structuredClone(w?w.days:templateDays);state.utDay=structuredClone(w?w.utDay:templateUtensils);
 normalizeState();
 }finally{loadingCloud=false;}
}
function selectWeek(key){snapshotDraft();state.weekKey=key&&lockedWeeks[key]?key:null;hydrateDraft();}
function selectDayWeek(){selectWeek(mondayOf(dayViewISO()));}
function acceptCloud(rows,force=false){
 if(!force&&(cloudSaving||document.querySelector('#dlg')?.open)){deferredCloud=rows;return;}
 const incoming=Object.fromEntries(rows.map(r=>[r.key,r]));cloudLatest=incoming;
 if(!rows.length){cloudError='The household has not been imported yet.';renderSyncBar();return;}
 if(!cloudReady){cloudBase=incoming;cloudDraft=Object.fromEntries(rows.map(r=>[r.key,r.value]));cloudReady=true;state.weekKey=mondayOf(dayViewISO());}
 else{
 snapshotDraft();const merged=MealCloud.mergeRecords(cloudBase,cloudDraft,incoming);cloudDraft=merged.draft;cloudConflicts=merged.conflicts;
 cloudBase=Object.fromEntries(Object.keys(incoming).map(k=>[k,cloudConflicts.includes(k)?(cloudBase[k]||{key:k,value:null,revision:0}):incoming[k]]));
 }
 if(state.view==='day')state.weekKey=mondayOf(dayViewISO());
 hydrateDraft();if(!legacyCleanupStarted){legacyCleanupStarted=true;archiveLegacyStorage();}document.body.classList.add('cloud-ready');document.querySelector('#cloudLoading').hidden=true;render();
}
function renderSyncBar(){
 const bar=document.querySelector('#syncBar');if(!bar)return;
 const changes=cloudReady?cloudChanges():[];
 const message=cloudError||(cloudSaving?'Saving…':!cloudReady?'Loading your household…':!connected()?'Connection lost — drafts are only in this open tab. Reconnect before saving.':cloudConflicts.length?'Another device edited the same item. Reload conflicting items before saving.':changes.length?'Unsaved changes':'All changes saved');
 syncStatus(message);bar.hidden=cloudReady&&connected()&&!cloudError&&!cloudSaving&&!cloudConflicts.length&&!changes.length;bar.replaceChildren();const text=document.createElement('span');text.textContent=message;bar.append(text);
 if(cloudReady){const save=document.createElement('button');save.textContent=cloudSaving?'Saving…':'Save changes';save.className='primary';save.dataset.cloudsave='';save.disabled=!changes.length||cloudSaving||!connected()||!!cloudConflicts.length;bar.append(save);
 if(changes.length&&!cloudSaving){const discard=document.createElement('button');discard.textContent='Discard changes';discard.dataset.clouddiscard='';bar.append(discard);}
 if(cloudConflicts.length){const reload=document.createElement('button');reload.textContent='Reload conflicting items';reload.dataset.cloudresolve='';bar.append(reload);}}
 const gate=document.querySelector('#cloudLoadingText');if(gate)gate.textContent=cloudReady?'':message;
}
function save(){if(loadingCloud)return;snapshotDraft();renderSyncBar();}
async function saveChanges(){
 if(!cloudReady||cloudSaving)return false;
 snapshotDraft();
 if(deferredCloud){const rows=deferredCloud;deferredCloud=null;acceptCloud(rows,true);}
 if(!connected()){cloudError='Not connected. Keep this tab open and retry when online.';renderSyncBar();return false;}
 if(cloudConflicts.length){renderSyncBar();return false;}
 const changes=cloudChanges();if(!changes.length)return true;
 cloudSaving=true;cloudError='';renderSyncBar();
 try{
 await cloudClient.mutation(MealCloud.api.household.commit,{changes});
 for(const c of changes)cloudBase[c.key]={key:c.key,value:c.value,revision:c.expectedRevision+1};
 // Read after the transaction so older subscription callbacks cannot roll it back.
 const fresh=await cloudClient.query(MealCloud.api.household.read,{});deferredCloud=null;
 cloudSaving=false;acceptCloud(fresh,true);return true;
 }catch(e){cloudSaving=false;cloudError=String(e.data||e.message||e);if(deferredCloud){const rows=deferredCloud;deferredCloud=null;acceptCloud(rows,true);}renderSyncBar();return false;}
}
function openSync(){document.querySelector('#dlgTitle').textContent='Connection';document.querySelector('#dlgBody').innerHTML='<p data-syncstatus></p><p class="hintline">Save edits before closing the app. Unsaved changes are lost on reload.</p><button data-syncdone>Done</button>';syncStatus(syncStatusText);document.querySelector('#dlg').showModal();}
function startCloud(){
 templateDays=structuredClone(state.days);templateUtensils=structuredClone(state.utDay);
 try{if(!window.MEAL_CONVEX_URL)throw Error('Convex deployment is not configured.');cloudClient=new MealCloud.ConvexClient(window.MEAL_CONVEX_URL,{unsavedChangesWarning:true});cloudClient.onUpdate(MealCloud.api.household.read,{},rows=>{cloudError='';acceptCloud(rows);},e=>{cloudError='Could not load the shared plan: '+e.message;renderSyncBar();});}
 catch(e){cloudError=e.message;}
 renderSyncBar();setInterval(renderSyncBar,1000);
}
document.addEventListener('click',async e=>{
 if(e.target.closest('[data-cloudsave]'))await saveChanges();
 if(e.target.closest('[data-clouddiscard]')&&!cloudSaving){cloudBase=cloudLatest;cloudDraft=Object.fromEntries(Object.entries(cloudLatest).map(([k,r])=>[k,r.value]));cloudConflicts=[];cloudError='';hydrateDraft();render();}
 if(e.target.closest('[data-cloudresolve]')){for(const k of cloudConflicts){cloudBase[k]=cloudLatest[k]||{key:k,value:null,revision:0};cloudDraft[k]=cloudLatest[k]?.value??null;}cloudConflicts=[];cloudError='';hydrateDraft();render();}
});
window.addEventListener('beforeunload',e=>{if(cloudReady&&(cloudSaving||cloudChanges().length)){e.preventDefault();e.returnValue='';}});

// One-time migration only: preserve old Firebase-era browser copies online before removal.
// This never writes browser storage and never uses a device copy as the active plan.
async function archiveLegacyStorage(){
 const keys=['simple-meals-v1','simple-meals-weeks-v1','meal-household-utensils-v1','meal-sync-v1','meal-before-household-sync-v1'];
 try{
 const entries=Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!==null));
 if(!Object.keys(entries).length)return;
 const data=JSON.stringify(entries),bytes=new TextEncoder().encode(data);
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 await cloudClient.mutation(MealCloud.api.household.archiveLegacy,{fingerprint,data});
 for(const [key,value]of Object.entries(entries))if(localStorage.getItem(key)===value)localStorage.removeItem(key);
 }catch(e){console.warn('Legacy browser copy retained because cloud archival did not complete.',e.message);}
}
