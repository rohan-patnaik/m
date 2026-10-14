// Diet assignments change active meals; view switching preserves saved Balanced menus.
let ketoPerson='both';
const KETO_SOURCES={
 harvard:'https://nutritionsource.hsph.harvard.edu/healthy-weight/diet-reviews/ketogenic-diet/',
 cleveland:'https://my.clevelandclinic.org/health/treatments/24003-ketosis',
 heart:'https://newsroom.heart.org/news/10-popular-diets-scored-for-heart-healthy-elements-some-need-improvement',
 diabetes:'https://www.diabetes.org.uk/living-with-diabetes/eating/meal-plans/low-carb',
 calories:'https://www.nhs.uk/better-health/lose-weight/calorie-counting/',
 who:'https://www.who.int/news/item/17-07-2023-who-updates-guidelines-on-fats-and-carbohydrates',
 vegetarian:'https://health.clevelandclinic.org/im-a-vegetarian-why-cant-i-lose-weight'
};
// Printed values from the 2026-10-04 package-labels.json audit; Milky Mist paneer from its verified 500 g packet image.
// Carbohydrate means the label's declaration; no net-carb subtraction is inferred.
const KETO_PACKETS=[
 {name:'ATOM Isolate · Double Rich Chocolate',basis:'35 g powder',carbs:2.8,fat:1,fibre:null,url:'https://asitisnutrition.com/products/atomwheyproteinisolate?variant=41170886262835'},
 {name:'Milky Mist paneer · 500 g (default)',basis:'100 g',carbs:5.1,fat:22,fibre:null,url:'https://www.bbassets.com/media/uploads/p/xxl/40003150-3_5-milky-mist-paneer-premium-fresh.jpg'},
 {name:'Amul salted butter (default)',basis:'100 g',carbs:0,fat:80,fibre:null,url:'https://www.dmart.in/product/amul-butter?selectedProd=113502'},
 {name:'Heritage fresh paneer · alternative',basis:'100 g',carbs:3,fat:22,fibre:null,url:'https://www.bigbasket.com/pd/214024/heritage-paneer-500-g-pouch/'},
 {name:'Milky Mist curd · 1 kg pouch',basis:'100 g · packet-dependent',carbs:4.8,fat:3,fibre:null,url:'https://www.bigbasket.com/pd/40262046/milky-mist-curd-fresh-no-preservatives-creamy-1-kg/'},
 {name:'Heritage green toned milk',basis:'100 g, not 100 ml',carbs:4.6,fat:3,fibre:null,url:'https://www.bigbasket.com/pd/40147597/heritage-daily-health-toned-milk-500-ml-pouch/'},
 {name:'Nutrela chunks',basis:'100 g dry',carbs:33.5,fat:.82,fibre:null,url:'https://www.dmart.in/product/nutrela-soya-chunks?selectedProd=46502'},
 {name:'Saffola Mealmaker chunks',basis:'100 g dry',carbs:30.2,fat:1,fibre:15.5,url:'https://www.dmart.in/product/saffola-mealmaker-soya-chunks--psoya0saff3xx40121?selectedProd=823503'}
];
// comparisonTable row text: added sugar is only a number when every ingredient declares it; otherwise unknown or a range, never 0.
function addedSugarText(t){if(typeof t.added!=='number')return 'Unknown';if(!t.addedUnknown)return F(t.added)+' g';return (typeof t.addedHi==='number'&&t.addedHi-t.added>=.05?comparisonRange(t.added,t.addedHi)+' g':'≥'+F(t.added)+' g')+' · incomplete data';}
const KETO_VIDEOS=[
 {id:'p5N7x8TQrt8',doctor:'Ken Berry, MD',title:'7 Steps to Starting the Keto Diet',time:62,stamp:'1:02–3:20; 6:17–7:00',take:'Reduce sugar and grains; build meals around ordinary whole foods.',qualification:'The blanket claims about grain inflammation and seed oils, and the salt/supplement advice, are not adopted.'},
 {id:'RM354ysZ5xM',doctor:'Eric Westman, MD',title:'Avoid These Keto Foods',time:199,stamp:'3:19–5:18; 7:55–9:18',take:'Keto drinks, MCT coffee and special keto products are unnecessary. Cheese, cream, oil and vegetables still need portions.',qualification:'His prescription-strength approach excludes nuts. Other doctors allow them; the preview treats nuts as optional, weighed and counted.'},
 {id:'gg6uTQ0EC_Q',doctor:'Annette Bosworth, MD (Dr. Boz)',title:'How to Begin Keto',time:84,stamp:'1:24–3:32; 4:01–5:11',take:'A gradual transition can start with drinks, then starches, plus planning and household support.',qualification:'Her no-calorie-drinks rule is a transition tactic, not a reason to automatically discard your whey. Check its actual carb panel.'},
 {id:'zrRDnLJdjmQ',doctor:'Andreas Eenfeldt, MD · Diet Doctor',title:'A Keto Diet for Beginners',time:136,stamp:'2:16–2:37; 6:11–6:25',take:'Replace grain/starch staples with protein, vegetables and fats; vegetarian plans are possible.',qualification:'The claims about effortless weight loss and not needing calorie counts are not promises. Your oil and portion calories still count.'},
 {id:'da1vvigy5tQ',doctor:'Sarah Hallberg, DO · TEDxPurdueU',title:'Type 2 Diabetes',time:664,stamp:'11:04–12:45; 13:51–14:20',take:'Low carb is not zero carb. Plan real food you enjoy; replace grain and potato sides with other foods.',qualification:'This 2015 talk focuses on diabetes treatment. Its patient outcomes do not predict your results or justify changing medication yourselves.'}
];

function ketoSuggestion(day,p,m){
 if(day.off||day.skip?.[m])return {skipped:true,name:'Eating out / not planned',note:'Restaurant intake is unknown.'};
 if(m==='e')return {name:p==='h'?'Evening nuts':'Water / unsweetened tea',note:p==='h'?'Up to 20 g total nuts, counted here once.':'No additional snack planned.'};
 const cfg=ketoConfig(day,p,m),date=mealDate(day),prepared=date&&['l','d'].includes(m)?batchLink(date,m,p,'sabzi'):null;
 const veg=prepared?batchName(prepared.batch):recipeName(personRecipe(day,p));
 const savedProtein=date&&batchLink(date,m,p,'protein'),inside=coveredComponent(day,m,p,'protein')&&!savedProtein;const proteinName=savedProtein?batchName(savedProtein.batch):inside?'protein already in prepared sabzi':{paneer:{paneerHP:'high-protein paneer',paneerMM:'Milky Mist paneer',paneer:'Heritage paneer'}[cfg.paneerType]||'paneer',eggs:'eggs',chicken:'chicken breast'}[cfg.protein];const name=m==='b'?ketoBreakfastName(cfg):cfg.mealRecipe?veg+' + '+(cfg.protein==='eggs'&&eggPreparationName(cfg)?F(cfg.quantity)+' '+eggPreparationName(cfg).toLowerCase()+' eggs':cfg.mealRecipe==='boiledEggMeal'?F(cfg.quantity)+' boiled eggs':KETO_MAINS[cfg.mealRecipe]?.name||'Custom protein plate'):personRecipe(day,p)==='S12'?veg:veg+' + '+proteinName;
 const scoops=ketoWheyScoops(day,p,m,cfg),whey=scoops>0?F(scoops)+' scoop'+(scoops===1?'':'s')+' whey with water':'';
 return {name,note:m==='b'?'No separate vegetable recipe. Ready protein and cucumber'+(whey?', plus '+whey+'.':'.'):'Share the cook’s actual sabzi. Rice/roti and default dal are omitted for this keto person. Protein choice replaces the separate paneer portion; paneer already inside a shared/prepared recipe still counts.'+(whey?' Plus '+whey+'.':'')};
}
// Per-meal whey scoops (Root's cfg.whey); older configs fall back to the breakfast whey toggle for display only.
function ketoWheyScoops(day,p,m,cfg=ketoConfig(day,p,m)){if(!kept(day,m)||m==='b'&&!(p==='h'?day.wheyH:day.wheyW))return 0;return typeof cfg.whey==='number'?cfg.whey:m==='b'&&(p==='h'?day.wheyH:day.wheyW)?1:0;}
function ketoWheyTotal(day,p,i){if(typeof ketoWheyDailyTotal==='function')return ketoWheyDailyTotal(day,p);return ['b','l','d'].filter(m=>!day.off&&!day.skip?.[m]).reduce((n,m)=>n+ketoWheyScoops(day,p,m,ketoConfig(day,p,m,i)),0);}
function ketoBefore(day,p,m){
 if(day.off||day.skip?.[m])return 'Eating out / skipped';
 if(m==='e')return 'Milk'+(cardioDone(day,p)&&P(p).nuts?' + nuts':'');
 if(m==='b')return [day.b==='B5'?(p==='w'?'Oats':'Poha'):BREAKFASTS[day.b],(p==='w'?day.wheyW:day.wheyH)?'whey':null,p==='h'&&day.eggH?'2 eggs':null].filter(Boolean).join(' + ');
 const prepared=mealDate(day)&&batchLink(mealDate(day),m,p,'sabzi');return (prepared?batchName(prepared.batch):SABZIS[day.s])+' + '+DALNAMES[day.dal]+' dal + '+(m==='l'&&p==='h'?'rice':'roti')+(m==='l'?' + curd':' + dinner protein');
}
function ketoEditHTML(day,i,p,m){
 if(day.off||day.skip?.[m]||m==='e')return '';
 const cfg=ketoConfig(day,p,m,i),key=ketoMealKey(i,p,m),name=PERSON_NAMES[p]+' '+DAYS[i]+' '+{b:'breakfast',l:'lunch',d:'dinner'}[m];
 const field=(f,label,min,max,step=1,value=cfg[f]??0,hint='')=>`<label>${label}<input aria-label="${name} ${label}" type="number" min="${min}" max="${max}" step="${step}" value="${value}" data-keto-key="${key}" data-keto-field="${f}">${hint}</label>`;
 const choice=(f,values,label)=>`<div class="keto-protein-field"><span>${label}</span><div class="keto-protein-choices" role="group" aria-label="${name} ${label}">${values.map(([v,l])=>`<button type="button" data-keto-key="${key}" data-keto-choice="${f}" data-keto-value="${v}" aria-pressed="${cfg[f]===v}">${l}</button>`).join('')}</div></div>`;
 const proteinInside=m!=='b'&&personRecipe(day,p)==='S12'&&!cfg.mealRecipe;
 const paneers=[...(DB.paneerMM?[['paneerMM','Milky Mist']]:[]),['paneer','Heritage regular'],['paneerHP','Heritage high protein']];
 const butterId=typeof foodChoices!=='undefined'&&foodChoices?.butter||'butterH',butterName=butterId==='butter'?'Amul':'Heritage';
 const wheyDay=ketoWheyTotal(day,p,i),wheyHint=`<small class="keto-hint${wheyDay>3?' keto-over':''}">today ${F(wheyDay)} of 3 scoops${wheyDay>3?' · over 3':''}</small>`;
 const protein=field('whey','Whey scoops',0,3,.5,ketoWheyScoops(day,p,m,cfg),wheyHint)+(p==='h'?field('eggWhites','Extra egg whites',0,12,1,cfg.eggWhites??0,'<small class="keto-hint">whole eggs keep yolks; whites need extra eggs</small>'):'')+((p==='h'&&!proteinInside)||cfg.spinach>0?field('spinach','Spinach in protein pan (g, before cooking)',0,1000,1,cfg.spinach??0,'<small class="keto-hint">cooked in the same egg/protein pan</small>'):'');
 const nuts=ketoEveningOnly(i,p)?'':field('almonds','Almonds (g)',0,150)+field('walnuts','Walnuts (g)',0,150)+field('cashews','Cashews (g)',0,150);
 const baseWeight=ketoVegetableBase(personRecipe(day,p)).reduce((n,x)=>n+x.q,0);
 // Breakfast recipe raw vegetables (Root's optional cfg fields): shown when saved or a recipe is set, never invented.
 const raw=m!=='b'&&!cfg.mealRecipe?'':[['avocado','Avocado'],['mushroom','Mushroom'],['tomato','Tomato'],['onion','Onion']].filter(([f])=>cfg.breakfastRecipe||typeof cfg[f]==='number').map(([f,l])=>field(f,l+' (g)',0,f==='onion'?200:500)).join('');
 const recipe=m!=='b'?'':`<p class="keto-hint keto-recipe-hint">${day.readyB&&day.readyB[p]?'No cooked breakfast today: only whey, curd, milk and nuts below are counted. ':''}Change the breakfast recipe in <b>Edit meals</b>. Portion changes here save automatically.</p>`;
 if(m==='b'&&day.readyB&&day.readyB[p])return `<details class="keto-adjust" data-keto-edit="${key}"><summary>Adjust portions</summary>${recipe}<div class="keto-fields">${field('whey','Whey scoops',0,3,.5,ketoWheyScoops(day,p,m,cfg),wheyHint)}${field('curd','Curd (g)',0,500)}${choice('curdType',[['curdH','Heritage Total'],['curd','Milky Mist']],'Curd variant')}${field('milk','Optional milk (ml)',0,500)}${nuts}</div></details>`;
 return `<details class="keto-adjust" data-keto-edit="${key}"><summary>Adjust portions</summary>${recipe}<div class="keto-fields">${proteinInside?'<span>Paneer is in the bhurji; no separate protein top-up.</span>':p==='h'?choice('protein',[['paneer','Paneer'],['eggs','Eggs'],['chicken','Chicken']],'Protein'):'<span>Vegetarian protein · paneer / measured chunks</span>'}${proteinInside?'':field('quantity',cfg.protein==='eggs'?'Egg count':'Protein (g, before cooking)',0,cfg.protein==='eggs'?6:1000)}${proteinInside?'':field('soya','Chunks (dry g)',0,100)}${protein}${!proteinInside&&cfg.protein==='paneer'?choice('paneerType',paneers,'Paneer variant'):''}${m!=='b'?field('sabziFraction','Sabzi ingredients (g, before cooking)',0,1000,.1,F(cfg.sabziFraction*baseWeight)):''}${raw}${field('cucumber','Cucumber (g)',0,1000)}${field('curd','Curd (g)',0,500)}${choice('curdType',[['curdH','Heritage Total'],['curd','Milky Mist']],'Curd variant')}${field('milk','Optional milk (ml)',0,500)}${field('butter',`Optional ${butterName} butter (g)`,0,50)}${nuts}${field('flax','Ground flaxseed (optional, historical)',0,50)}${proteinInside?'':field('oil','Self-cooking oil (ml)',0,50,.1)}</div><p>Shared sabzi oil is allocated automatically. Self-cooking oil is additional and counted once. Grams here are before-cooking or packet weights; use Weigh food for cooked grams. Saved prepared portions stay frozen.</p></details>`;
}
function ketoDayHTML(day,i){
 const persons=ketoPerson==='both'?['w','h']:[ketoPerson];
 const checks=persons.map(p=>{const t=assignedDayNutrition(i,p);return `<div><p><b>${PERSON_NAMES[p]} · ${isKeto(p)?'Keto trial':'Balanced'}</b> ${R(t.k)} kcal · ${F(t.p)} g protein · ${comparisonRange(t.a,t.aHi)} g counted available carbs · ${comparisonRange(t.c,t.cHi)} g estimated total carbs · fibre ≥${F(t.fb)} g · saturated fat ≥${F(t.sat)} g${t.satUnknown?' (incomplete data)':''}</p>${isKeto(p)?`<p class="keto-plan-status">Review: ${dailyPlanChecks(t,p).map(esc).join(' · ')}</p>`:''}</div>`;}).join('');
 const shared=sharedRecipe(day),separate=differentSabzis(day),names=['w','h'].map(p=>PERSON_NAMES[p]+': '+recipeName(personRecipe(day,p))).join(' · ');
 const sub=`<div class="keto-day-checks"><b>${separate?esc(names):'Shared sabzi: '+esc(recipeName(shared))}</b><p>${separate?'Cook and weigh these two dishes separately, once each for lunch + dinner.':'Cook one shared sabzi batch for lunch + dinner.'} Recipe choices update ingredients, nutrition and shopping. Starchy recipes remain available and their carbs count.</p>${recipeSelectorsHTML(day,i)}</div>`;
 const meals=['b','l','d','e'].map(m=>`<div class="keto-meal"><h4>${{b:'Breakfast',l:'Lunch',d:'Dinner',e:'Evening'}[m]}</h4>${persons.map(p=>{
  const prop=ketoSuggestion(day,p,m),t=comparisonSum(meal(day,m,p));
  return `<div class="keto-meal-row"><span class="keto-person">${PERSON_NAMES[p]}</span><div><span class="keto-col-label">Saved Balanced menu</span>${esc(ketoBefore(day,p,m))}</div><div><span class="keto-col-label">Assigned ${isKeto(p)?'Keto trial':'Balanced'}</span><b>${esc(isKeto(p)?prop.name:assignedBalancedTitle(day,p,m))}</b>${isKeto(p)?`<p>${esc(prop.note)}</p>${typeof uxDisplayText==='function'?uxDisplayText(ketoPortionHTML(day,p,m)):ketoPortionHTML(day,p,m)}${ketoEditHTML(day,i,p,m)}`:''}<p class="keto-remaining">${R(t.k)} kcal · ${F(t.p)} g protein</p></div></div>`;
 }).join('')}</div>`).join('');
 return `<details class="keto-day" data-keto-day="${i}"${i===0?' open':''}><summary><span><b>${DAYS[i]}</b>${state.weekKey?`<small>${fmtMon(dateForDay(i))}</small>`:''}</span><span>${esc(separate?names:recipeName(shared))}</span></summary><div class="keto-day-checks">${checks}</div>${sub}<div class="keto-day-body">${meals}<details class="keto-info"><summary>Cook and serve this day</summary><div>${householdPrep(i).map(([title,items])=>`<h4>${esc(title)}</h4><p>${items.map(x=>esc(typeof uxDisplayText==='function'?uxDisplayText(x):x)).join(' · ')}</p>`).join('')}<p><button data-weigh="${i}">Weigh food</button> <button data-batch-add="${i}">Cook a batch</button></p><p>Weigh each cooked dish once in Planner → Weigh food. Different sabzis get separate weighing cards. Allocation uses exactly these ingredient shares; lunch and dinner reuse the same batch. Keep protein pieces and gravy in the same ratios. Refrigerate within 2 hours (1 hour above 32°C); follow packet storage instructions. Freeze unused uncooked chicken if not cooking within 1–2 days. Cooked leftovers generally keep 3–4 days refrigerated, not a full week. <a href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety" target="_blank" rel="noopener">USDA storage guidance</a></p></div></details></div></details>`;
}
function ketoReviewHTML(){
 const totals=['w','h'].map(p=>{const n=comparisonEmpty();state.days.forEach((_,i)=>comparisonAdd(n,assignedDayNutrition(i,p),1/7));return `<p><b>${PERSON_NAMES[p]} · ${isKeto(p)?'Keto trial':'Balanced'}:</b> ${R(n.k)} kcal · ${F(n.p)} g protein daily average.${isKeto(p)?' Check each day below; averages do not prove the carb budget or nutritional adequacy.':''}</p>`;}).join('');
 let chicken=0,eggs=0;for(const d of state.days)for(const m of ['b','l','d'])for(const x of meal(d,m,'h')){if(x.id==='chicken')chicken+=x.q;if(x.id==='egg')eggs+=x.q;}
 const carbReviews=['w','h'].filter(isKeto).map(p=>{const days=state.days.map((_,i)=>assignedDayNutrition(i,p)).filter(t=>t.k>0),over=days.filter(t=>t.aHi>ketoOptions.carbBudget).length,unknown=days.filter(t=>t.carbUnknown).length;return `<p class="keto-plan-status">${PERSON_NAMES[p]}: ${over}/${days.length} home-food days exceed the ${ketoOptions.carbBudget} g carb budget; ${unknown}/${days.length} have incomplete carb data.${days.length&&over===days.length?' Every day of this draft is over budget; it needs changes before it can be a keto trial plan.':' Resolve daily flags before treating this draft as a keto trial plan.'}</p>`;}).join('');
 const cookedMeals=state.days.reduce((n,d)=>n+['b','l','d'].filter(m=>meal(d,m,'h').some(x=>x.q>0&&x.id==='chicken')).length,0);
 return `<section class="keto-review"><h3>Actual household plan · review required</h3>${ketoApplyPlanHTML()}${totals}${carbReviews}<p>Husband’s week: ${F(eggs)} eggs · ${F(chicken)} g chicken (uncooked) in ${cookedMeals} meals. ${chicken?`Buy ${Math.ceil(chicken/250)} × 250 g or ${Math.ceil(chicken/500)} × 500 g packs. Unused with 500 g packs: ${F(Math.ceil(chicken/500)*500-chicken)} g; keep it separate from eaten quantities.`:''} The example menu includes four chicken meals; choose any lunch or dinner in Edit meals.</p><p>The app never fills a calorie gap by adding paneer, butter or oil. Some days need review against calories, protein, fibre and saturated fat, even when carbs fit. Wife’s calorie/protein targets are unconfirmed. General adult fibre and saturated-fat checks: ≥25 g fibre/day and ≤10% energy from saturated fat. <a href="${KETO_SOURCES.who}" target="_blank" rel="noopener">WHO guidance</a></p><p class="keto-milk">Milk is allowed only as a measured amount that fits the remaining carb budget; Heritage toned milk is about ${F(COMPARE_NUTRIENTS.milk.c*milkDensity())} g carbs per 100 ml (the 4.6 g per 100 g panel × the ${milkDensity()} g/ml density set in Settings). Ketosis commonly takes 2–4 days, sometimes a week or longer, and is not guaranteed. The 4–6 week review is a practical checkpoint, not a fixed medical course. <a href="${KETO_SOURCES.cleveland}" target="_blank" rel="noopener">Cleveland Clinic on ketosis</a> · <a href="${KETO_SOURCES.harvard}" target="_blank" rel="noopener">Harvard keto review</a></p></section>`;
}
// Root's applyKetoInventoryPlan fills the unsaved draft; hidden until Root provides a plan.
function ketoApplyPlanHTML(){let ready=false;try{ready=typeof ketoInventoryPlanAvailable==='function'&&typeof applyKetoInventoryPlan==='function'&&ketoInventoryPlanAvailable()===true;}catch{ready=false;}return ready?`<p class="keto-apply-plan"><button type="button" data-keto-apply-plan${!cloudReady||cloudSaving?' disabled':''}>Load example husband plan</button><small>Draft only; adjust daily calorie and protein gaps before saving.</small></p>`:'';}
function renderKeto(){
 const root=document.querySelector('#keto');if(!root)return;
 root.innerHTML=`<h2 id="ketoTitle">Nutrition information</h2><p>Meals are edited in the Day or Week plan. Your diet and targets are in Profile &amp; targets.</p>
 <details class="keto-info"><summary>How the numbers work</summary><p>Daily numbers are rounded estimates. Details retain full precision. Carbs means counted available carbohydrate: documented fibre is subtracted from USDA total-carb and IFCT estimates; packaged foods keep their declared carbs. It is not a guaranteed physiological net-carb measurement.</p><p>Unknown nutrition is marked in the breakdown, never treated as a verified zero. Prepared portions stay frozen with their saved nutrition. Current recipes and label changes do not rewrite cooked batches.</p><p>Raw ingredient weights determine nutrition; cooking changes water and cooked weight. Pot ratios divide the same ingredients between you. Oil is counted once.</p></details>
 <details class="keto-info"><summary>Food values &amp; sources</summary><p>Ordinary foods use your saved household profiles. Brands are not meal decisions. Distinct low-fat or high-protein products can be configured under Nutrition values · advanced. Whey uses a 35 g scoop.</p><p><a href="https://fdc.nal.usda.gov/">USDA food composition</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5470183/">Diet and body-composition evidence</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/38934469/">Ketogenic-diet evidence</a></p></details>
 <details class="keto-info"><summary>Planning notes</summary><p>Calories and protein are planning estimates. A carb budget is not a promise of ketosis. Review weight trends, hunger and training performance before adjusting intake. Eating-out food is not included unless you add it to your plan.</p><p><a href="${KETO_SOURCES.who}">Nutrition guidance</a> · <a href="${KETO_SOURCES.cleveland}">About ketosis</a></p></details>`;
}
function showKetoRoute(hash){
 if(typeof showUXRoute==='function'){showUXRoute(hash);return;}
 const keto=hash==='#keto',shopping=hash==='#shopping';
 document.querySelectorAll('[data-diet]').forEach(b=>{const a=!shopping&&b.dataset.diet===(keto?'keto':'balanced');b.setAttribute('aria-pressed',String(a));b.classList.toggle('active',a);});
 document.querySelector('#regularPlan').hidden=keto||shopping;document.querySelector('#keto').hidden=!keto;
 const list=document.querySelector('#shopping');if(list){list.hidden=!shopping;if(shopping)renderShopping();}
 document.querySelectorAll('.tabs a').forEach(a=>{const active=a.hash===(hash||'#planner');a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
}
window.addEventListener('hashchange',()=>showKetoRoute(location.hash));
document.addEventListener('click',e=>{
 const diet=e.target.closest('[data-diet]');if(diet){location.hash=diet.dataset.diet==='keto'?'keto':'planner';showKetoRoute(location.hash);return;}
 const person=e.target.closest('[data-keto-person]');if(person){ketoPerson=person.dataset.ketoPerson;renderKeto();return;}
 const expand=e.target.closest('[data-keto-expand]');if(expand){const days=[...document.querySelectorAll('[data-keto-day]')],open=days.some(x=>!x.open);days.forEach(x=>x.open=open);expand.textContent=open?'Collapse all days':'Expand all days';}
 const apply=e.target.closest('[data-keto-apply-plan]');if(apply&&typeof applyKetoInventoryPlan==='function'&&cloudReady&&!cloudSaving){try{if(applyKetoInventoryPlan()!==false)render();}catch(error){apply.title=error.message;}return;}
 const b=e.target.closest('[data-keto-choice]');if(b)updateKetoPortion(b.dataset.ketoKey,b.dataset.ketoChoice,b.dataset.ketoValue);
});
const KETO_SIDE_FIELDS=['whey','curd','milk','avocado','almonds','walnuts','cashews'];
function updateKetoPortion(key,field,value){
 if(!cloudReady||cloudSaving)return false;const match=/\/day\/([0-6])\/(w|h)\/(b|l|d)$/.exec(key);if(!match)return false;
 const [,index,p,m]=match,i=Number(index);if(key!==ketoMealKey(i,p,m))return false;const cfg=ketoConfig(state.days[i],p,m,i);
 if(field==='protein'){if(cfg.mealRecipe)cfg.mealRecipe='custom';cfg.eggPreparation='planned';cfg.protein=value;cfg.quantity=value==='eggs'?4:value==='chicken'?250:75;cfg.soya=0;cfg.oil=value==='paneer'?0:3;}
 else if(['paneerType','curdType'].includes(field))cfg[field]=value;
 else cfg[field]=field==='sabziFraction'?Number(value)/ketoVegetableBase(personRecipe(state.days[i],p)).reduce((n,x)=>n+x.q,0):Number(value);
 if(m==='b'&&!KETO_SIDE_FIELDS.includes(field)&&!['quantity','eggWhites'].includes(field))delete cfg.breakfastRecipe;
 if(ketoEveningOnly(i,p)&&KETO_NUT_IDS.includes(field)&&cfg[field]>0)throw Error('Husband nuts belong in the evening only, maximum 20 g total.');
 MealCloud.validateRecord(key,cfg);
 const total=['b','l','d'].reduce((q,meal)=>q+(!kept(state.days[i],meal)||meal==='b'&&!(p==='h'?state.days[i].wheyH:state.days[i].wheyW)?0:(meal===m?cfg:ketoConfig(state.days[i],p,meal,i)).whey||0),0);
 if(total>3+1e-8)throw Error('Maximum 3 whey scoops per day. Reduce another meal first.');
 ketoMeals[key]=cfg;save();render();return true;
}
document.addEventListener('change',e=>{const el=e.target.closest('[data-keto-field]');if(!el)return;el.setCustomValidity('');if(!el.checkValidity()){el.reportValidity();return;}try{updateKetoPortion(el.dataset.ketoKey,el.dataset.ketoField,el.value);}catch(error){el.setCustomValidity(error.message);el.reportValidity();}});
