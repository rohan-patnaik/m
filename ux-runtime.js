// Open meal cards reuse the same ingredients, frozen batches and shared weights.
let activityRecords={},uxRoute='today',uxHideBought=false,uxSaveTimer;
// View-only macro display, this tab only: never saved to Convex, localStorage or food settings.
let uxMacros={w:{k:true,p:true,c:null},h:{k:true,p:true,c:null}},uxMacrosOpen=false,uxMacrosPress=false;
// Carbs start on for a Keto person and off for Balanced; once ticked or unticked the choice sticks for this tab.
function uxMacroOn(p,k){const v=uxMacros[p][k];return v==null?k==='c'&&isKeto(p):!!v;}
const UX_MACROS=[['k','Calories'],['p','Protein'],['c','Carbs']];
const UX_MEALS={b:'Breakfast',l:'Lunch',d:'Dinner',e:'Snacks & milk'};
const UX_ICONS={meals:'<path d="M4 3v7m3-7v7M4 7h3m-1.5 3v11M17 3v18m0-18c-4 2-4 9 0 9"/>',shop:'<path d="M3 3h2l3 12h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',settings:'<path d="M10.1 4.64L10.58 1.9A10.2 10.2 0 0 1 13.42 1.9L13.9 4.64A7.6 7.6 0 0 1 15.86 5.45L18.14 3.85A10.2 10.2 0 0 1 20.15 5.86L18.55 8.14A7.6 7.6 0 0 1 19.36 10.1L22.1 10.58A10.2 10.2 0 0 1 22.1 13.42L19.36 13.9A7.6 7.6 0 0 1 18.55 15.86L20.15 18.14A10.2 10.2 0 0 1 18.14 20.15L15.86 18.55A7.6 7.6 0 0 1 13.9 19.36L13.42 22.1A10.2 10.2 0 0 1 10.58 22.1L10.1 19.36A7.6 7.6 0 0 1 8.14 18.55L5.86 20.15A10.2 10.2 0 0 1 3.85 18.14L5.45 15.86A7.6 7.6 0 0 1 4.64 13.9L1.9 13.42A10.2 10.2 0 0 1 1.9 10.58L4.64 10.1A7.6 7.6 0 0 1 5.45 8.14L3.85 5.86A10.2 10.2 0 0 1 5.86 3.85L8.14 5.45A7.6 7.6 0 0 1 10.1 4.64Z"/><circle cx="12" cy="12" r="2.8"/>'};
function uxIcon(name){return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UX_ICONS[name]||''}</svg>`;}
function uxDietName(p){return isKeto(p)?'Keto':'Balanced';}
function uxDietChips(){return `<div class="ux-diet-chips">${['w','h'].map(p=>`<span>${PERSON_NAMES[p]} <b>${uxDietName(p)}</b></span>`).join('')}</div>`;}
// Banner only when the conservative counted-carb upper bound reaches the budget. Unknown data below budget stays in
// the View carbs dialog and the Nutrition & carb checks disclosure, never shown as a pass.
function uxWarning(i){const warnings=[],people=[];for(const p of ['w','h'].filter(isKeto)){const t=assignedDayNutrition(i,p);if(!t.k)continue;if(!(t.aHi>=ketoOptions.carbBudget))continue;warnings.push(`${PERSON_NAMES[p]}: carb budget needs review`);people.push(p);}return warnings.length?`<div class="ux-warning" role="status">⚠ ${warnings.map(esc).join('; ')} <button type="button" class="text-btn" data-ux-carbs="${i},${people[0]}">View carbs</button> <a class="ux-diet-review" href="#keto">Diet review</a></div>`:'';}
function uxDayStatus(i){const d=state.days[i],parts=[];
 if(isKeto('h')){const t=assignedDayNutrition(i,'h'),lo=ketoOptions.targetK-100,hi=ketoOptions.targetK+100;if(t.k&&(t.k<lo||t.p<ketoOptions.pMin))parts.push(`${PERSON_NAMES.h}: ${R(t.k)} kcal · ${F(t.p)} g protein, below the ${lo}–${hi} kcal / ${ketoOptions.pMin}+ g protein working range.`);}
 for(const p of ['w','h']){const lines=['b','l','d','e'].flatMap(m=>meal(d,m,p)).filter(x=>x.q>0&&['almonds','walnuts','cashews','nuts'].includes(x.id)),g=lines.reduce((n,x)=>n+x.q,0);if(g>0)parts.push(`${PERSON_NAMES[p]} nuts today: ${F(g)} g (${R(comparisonSum(lines).k)} kcal).`);}
 return parts.length?`<p class="ux-day-status">${parts.map(esc).join(' ')}</p>`:'';}
function uxCurrentIndex(){return (new Date(dayViewISO()+'T12:00:00').getDay()+6)%7;}
// Keto breakfast shows the cooked recipe name once Root's ketoBreakfastName ships.
function uxReadyBreakfast(day,p){return !!day?.readyB?.[p];}
function uxMealName(i,p,m){const day=state.days[i];if(m==='b'&&kept(day,'b')&&uxReadyBreakfast(day,p))return 'No cooked breakfast';return m==='e'?'Planned snacks & milk':isKeto(p)?m==='b'&&typeof ketoBreakfastName==='function'?ketoBreakfastName(ketoConfig(day,p,m,i)):ketoSuggestion(day,p,m).name:assignedBalancedTitle(day,p,m);}
// Keto breakfast line names the dish and its counted sides, so a whole-breakfast total is never read as the dish
// alone ("3 Egg Poach (5 ml oil) · avocado 50 g + whey + nuts 45 g"). Display only.
function uxBreakfastLine(i,p){const d=state.days[i],base=uxMealText(uxMealName(i,p,'b'));if(!isKeto(p)||!kept(d,'b'))return base;const cfg=ketoConfig(d,p,'b',i),ready=uxReadyBreakfast(d,p),s=typeof ketoBreakfastSides==='function'?ketoBreakfastSides(cfg)||{}:cfg,w=(p==='h'?d.wheyH:d.wheyW)?s.whey:0;
 const sides=typeof editSideSummary==='function'?editSideSummary({...s,whey:w},ready?'':cfg.breakfastRecipe,ready):'',oil=!ready&&cfg.breakfastRecipe==='eggPoach'&&cfg.oil>0?` (${F(cfg.oil)} ml oil)`:'',dahi=!ready&&cfg.breakfastRecipe==='dahiBowl'?` (curd ${F(s.curd||0)} g${w?` + whey ${F(w)} ${w===1?'scoop':'scoops'}`:''})`:'';return `${base}${oil}${dahi}${sides?' · '+sides:''}`;}
function uxMealBasis(i,m){return JSON.stringify(['w','h'].map(p=>meal(state.days[i],m,p)));}
function uxMealDone(i,m){const r=activityRecords[`done/${dateForDay(i)}/${m}`];return !!r?.complete&&r.basis===uxMealBasis(i,m);}
const UX_FOOD_NAMES={atta:'Roti atta',rice:'Rice',oats:'Oats',besan:'Besan',poha:'Poha',whey:'Whey',egg:'Whole eggs',eggWhite:'Extra whites',paneer:'Heritage paneer',paneerHP:'Heritage high-protein paneer',paneerMM:'Milky Mist paneer',soyN:'Nutrela chunks',soyS:'Saffola chunks',curd:'Milky Mist curd',curdH:'Heritage curd',milk:'Milk',nuts:'Mixed nuts',cashews:'Cashews',almonds:'Almonds',walnuts:'Walnuts',flax:'Ground flaxseed',butter:'Amul butter',butterH:'Heritage butter',chicken:'Chicken breast',corn:'Sweetcorn kernels'};
// Meal cards show generic food names; Settings, Shopping, carbs evidence and Adjust portions keep product names.
const UX_MEAL_LABELS={avocado:'Avocado',mushroom:'Mushroom',paneer:'Paneer',paneerMM:'Paneer',paneerHP:'High-protein paneer',soyN:'Soya chunks',soyS:'Soya chunks',curd:'Curd',curdH:'Curd',butter:'Butter',butterH:'Butter'};
// Visible text never says "raw": grams on food rows are before cooking unless marked cooked. Display only.
function uxDisplayText(s){return String(s??'').replace(/\s*\(raw\)/gi,'').replace(/\s*·\s*raw\s*(?=$|·)/gi,'').replace(/\braw,\s*/gi,'').replace(/,\s*raw\b/gi,'').replace(/\braw\s+/gi,'').replace(/\s+raw\b/gi,'').replace(/\s{2,}/g,' ').trim();}
// Source basis keeps its meaning on screen: a "raw" basis reads as before cooking. The stored basis is unchanged.
function uxBasisText(b){const t=String(b??'');return /\braw\b/i.test(t)?uxDisplayText(t)+' (before cooking)':t;}
function uxMealLabel(id){return uxDisplayText(UX_MEAL_LABELS[id]||UX_FOOD_NAMES[id]||String(DB[id]?.[0]||id).split(' · ')[0]);}
function uxMealText(s){return String(s).replace(/(?:Heritage |Milky Mist )?high-protein paneer/gi,'High-protein paneer').replace(/(?:Heritage|Milky Mist) paneer/g,'Paneer').replace(/(?:Heritage|Milky Mist) curd/g,'Curd').replace(/(?:Amul|Heritage) butter/g,'Butter').replace(/(?:Nutrela|Saffola) (?:chunks|soya)\b/g,'Soya chunks').replace(/ · (?:Nutrela|Saffola)\b/g,'');}
const UX_DRY_FOODS=new Set(['atta','rice','oats','besan','poha','soyN','soyS','moong','masoor','arhar','rajma','chickpea','kalachana','pasta','maida']);
const UX_RAW_FOODS=new Set(['chicken','onion','tomato','carrot','potato','gobi','bhindi','palak','arbi','mushroom','cucumber','beans','cabbage','corn','avocado']);
function uxFoodRow(x){const unit=x.id==='eggWhite'?'egg':DB[x.id]?.[3]||'g',label=uxMealLabel(x.id);if(unit==='serving')return {label,quantity:`${F(x.q)} ${F(x.q)>1?'scoops':'scoop'}`,detail:`${F(x.q*35)} g powder`};if(x.id==='eggWhite')return {label,quantity:`${F(x.q)} ${x.q===1?'white':'whites'}`,detail:'extra eggs needed'};const quantity=unit==='egg'?`${F(x.q)} ${x.q===1?'egg':'eggs'}`:`${F(x.q)} ${unit}${UX_DRY_FOODS.has(x.id)?' dry':''}`;return {label,quantity};}
// Whole-number parts for a shared pot. Zero shares stay 0. The first exact ratio within the cap wins; otherwise the
// smallest error is used and the result is flagged approximate so the display can mark it (≈).
function uxParts(shares,maxTotal=24){const sum=shares.reduce((n,x)=>n+(x>0?x:0),0);if(!(sum>0))return null;const frac=shares.map(x=>x>0?x/sum:0),live=frac.filter(f=>f>0).length;let best=null;
 for(let total=live;total<=maxTotal;total++){const parts=frac.map(f=>f>0?Math.max(1,Math.round(f*total)):0),t=parts.reduce((n,x)=>n+x,0),err=Math.max(...parts.map((x,k)=>Math.abs(x/t-frac[k])));if(!best||err<best.err-1e-12)best={parts,total:t,err};if(err<1e-9)break;}
 const g=best.parts.filter(x=>x>0).reduce((a,b)=>gcd(a,b));return {parts:best.parts.map(x=>x/g),total:best.total/g,exact:best.err<1e-9};}
function uxPotParts(i,dish,scope='all'){const specs=weighSpecs(i,dish,scope),r=uxParts(specs.map(x=>x.factor));return r?specs.map((x,k)=>({...x,parts:r.parts[k],total:r.total,exact:r.exact})):[];}
function uxPartsText(n,total,exact=true){const a=exact?'':'≈ ';return n===total?'Whole pot':exact&&total===2&&n===1?'Half the pot':`${a}${n} of ${total} parts`;}
function uxDishRow(i,m,p,component,lines){
 const d=state.days[i],date=mealDate(d),link=date&&batchLink(date,m,p,component);
 if(link)return {label:uxMealText(batchName(link.batch)),quantity:`${link.serving.grams} g cooked`,detail:'Prepared '+fmtMon(link.batch.cookedOn)};
 if(component==='protein'&&coveredComponent(d,m,p,'protein'))return null;
 const dish=component==='sabzi'?(differentSabzis(d)?'sabzi-'+p:'sabzi'):component==='dal'?'dal':'prot';
 const r=currentWeigh(i,dish),portion=r?.portions.find(x=>x.meal===m&&x.person===p);
 const pid=lines.find(x=>!['oil','spice'].includes(x.id))?.id,label=component==='sabzi'?uxMealText(recipeName(personRecipe(d,p))):component==='dal'?DALNAMES[d.dal]+' dal':UX_MEAL_LABELS[pid]||UX_FOOD_NAMES[pid]||'Dinner protein';
 if(portion)return {label,quantity:`${portion.grams} g cooked`,detail:m==='d'&&r.scope==='all'?'Reserved from the same daily batch':''};
 if(component==='protein')return null;
 const mine=uxPotParts(i,dish).find(x=>x.meal===m&&x.person===p);
 return {label,quantity:mine?uxPartsText(mine.parts,mine.total,mine.exact):'Weigh to get cooked grams',detail:'Split the whole pot (lunch + dinner) into equal parts',unweighed:true};
}
function uxServingRows(i,m,p){
 const day=state.days[i];let remaining=meal(day,m,p);const rows=[];
 if(!remaining.some(x=>x.q>0))return rows;
 if(['l','d'].includes(m)){
  for(const c of ['sabzi','dal','protein']){
   const link=mealDate(day)&&c!=='dal'&&batchLink(mealDate(day),m,p,c);
   const component=c==='dal'?isKeto(p)?[]:[L(day.dal,150*dalShare(p)),L('oil',oilUse().dal*dalShare(p))]:originalComponent(day,m,p,c);
   if(!link&&!component.some(x=>x.q>0)||c==='protein'&&coveredComponent(day,m,p,c)&&!link)continue;
   const row=uxDishRow(i,m,p,c,component);
   if(row){rows.push(row);remaining=subtractIngredients(remaining,link?BatchMath.portionLines(link.batch,link.serving):component);}
  }
 }
 rows.push(...uxLineRows(aggregateBatchLines(remaining)));
 return rows;
}
const UX_NUTS=['almonds','walnuts','cashews','nuts'];
function uxLineRows(lines){
 lines=lines.filter(x=>x.q>0&&!['oil','spice'].includes(x.id));const out=[],egg=lines.find(x=>x.id==='egg'),white=lines.find(x=>x.id==='eggWhite'),nuts=lines.filter(x=>UX_NUTS.includes(x.id));let eggDone=false,nutsDone=false;
 for(const x of lines){
  if(white&&(x.id==='egg'||x.id==='eggWhite')){if(eggDone)continue;eggDone=true;const whole=egg?.q||0,total=whole+white.q;out.push({label:'Eggs',quantity:`${F(total)} ${total===1?'egg':'eggs'}`,detail:whole?`keep ${F(whole)} ${whole===1?'yolk':'yolks'}`:'whites only'});continue;}
  if(UX_NUTS.includes(x.id)){if(nutsDone)continue;nutsDone=true;const total=nuts.reduce((n,y)=>n+y.q,0);out.push({label:'Nuts',quantity:`${F(total)} g`,...(nuts.length>1?{detail:nuts.map(y=>`${F(y.q)} g ${uxMealLabel(y.id).toLowerCase()}`).join(' · ')}:{})});continue;}
  out.push(uxFoodRow(x));
 }
 return out;
}
function uxRowsHTML(rows){return rows.length?`<ul class="meal-food-list">${rows.map(r=>`<li${r.unweighed?' class="meal-unweighed"':''}><span>${esc(r.label)}</span><strong>${esc(r.quantity)}</strong>${r.detail?`<small>${esc(r.detail)}</small>`:''}</li>`).join('')}</ul>`:'<p class="meal-none">None planned</p>';}
// One row per food with both people's amounts side by side; shared dishes appear once.
function uxMealRows(i,m){const order=[],cells={};for(const p of ['w','h']){const seen={};for(const r of uxServingRows(i,m,p)){const n=seen[r.label]=(seen[r.label]||0)+1,key=n>1?`${r.label}#${n}`:r.label;if(!cells[key]){cells[key]={label:r.label};order.push(key);}cells[key][p]=r;}}return order.map(k=>cells[k]);}
// "1 scoop" needs no second line; the powder weight stays on hover/long-press and in the carbs dialog.
function uxCellHTML(r){if(!r)return '<td class="meal-empty">—</td>';const quiet=/ g powder$/.test(r.detail||'');return `<td${r.unweighed?' class="meal-unweighed"':''}${quiet?` title="${esc(r.detail)}"`:''}><b>${esc(r.quantity)}</b>${r.detail&&!r.unweighed&&!quiet?`<small>${esc(r.detail)}</small>`:''}</td>`;}
function uxMealHead(food='<span class="sr-only">Food</span>'){return `<thead><tr><th scope="col">${food}</th>${['w','h'].map(p=>`<th scope="col">${PERSON_NAMES[p]}<small>${uxDietName(p)}</small></th>`).join('')}</tr></thead>`;}
function uxMealTable(i,m){
 const d=state.days[i],rows=uxMealRows(i,m),unweighed=rows.some(r=>['w','h'].some(p=>r[p]?.unweighed)),t=['w','h'].map(p=>comparisonSum(meal(d,m,p)));
 const head=uxMealHead();
 const names=['w','h'].map(p=>m==='b'?uxBreakfastLine(i,p):uxMealText(uxMealName(i,p,m))),menu=m!=='b'?'':`<p class="meal-menu">${names[0]===names[1]?esc(names[0]):['w','h'].map((p,n)=>`<b>${PERSON_NAMES[p]}</b> ${esc(names[n])}`).join(' <span>·</span> ')}</p>`;
 const body=rows.length?rows.map(r=>`<tr><th scope="row">${esc(r.label)}</th>${uxCellHTML(r.w)}${uxCellHTML(r.h)}</tr>`).join(''):'<tr><td colspan="3" class="meal-none">None planned</td></tr>';
 // Footer rows follow Show macros; a person with a macro off gets an empty cell. Food rows above never change.
 // The footer is its own table (same columns) so laptop cards can pin it to the bottom at one height.
 const metrics=[['k','<th scope="row">kcal</th>',x=>R(x.k)],['p','<th scope="row">Protein</th>',x=>F(x.p)+' g'],['c','<th scope="row" title="Counted available carbs">Carbs<span class="sr-only"> (counted available)</span></th>',x=>comparisonRange(x.a,x.aHi)+' g']].filter(([k])=>['w','h'].some(p=>uxMacroOn(p,k)));
 const foot=metrics.length?`<table class="meal-table meal-table-foot"><caption class="sr-only">${UX_MEALS[m]} totals: ${PERSON_NAMES.w}, ${PERSON_NAMES.h}</caption><colgroup><col><col class="meal-col"><col class="meal-col"></colgroup><tfoot>${metrics.map(([k,th,f])=>`<tr class="meal-${k}-row">${th}${t.map((x,n)=>`<td>${!uxMacroOn('wh'[n],k)?'':x.k?f(x):'—'}</td>`).join('')}</tr>`).join('')}</tfoot></table>`:'';
 return `${menu}<table class="meal-table">${head}<tbody>${body}</tbody></table>${unweighed?'<p class="meal-foot">Parts: stir the shared pot well, share paneer/soya pieces evenly, then split it into equal ladles for lunch + dinner. ≈ marks a rounded ratio; ladles are an even split, not measured nutrition. Weighing gives exact grams.</p>':''}${foot}`;
}
// Details popup: every planned ingredient of meal() (frozen batch portions included), one row per generic food,
// both people's raw amounts side by side. Oil and spices are summarised separately by inspect().
function uxIngredientRows(i,m){const order=[],cells={};for(const p of ['w','h']){const by={};for(const x of meal(state.days[i],m,p)){if(!(x.q>0)||['oil','spice'].includes(x.id))continue;const k=x.id+'|'+(DB[x.id]?.[3]||'g');(by[k]||={id:x.id,q:0}).q+=x.q;}for(const r of uxLineRows(Object.values(by))){const k=r.label;if(!cells[k]){cells[k]={label:r.label};order.push(k);}cells[k][p]=r;}}return order.map(k=>cells[k]);}
function uxIngredientTable(i,m){const rows=uxIngredientRows(i,m);return `<table class="meal-table meal-ingredients">${uxMealHead('Food')}<tbody>${rows.map(r=>`<tr><th scope="row">${esc(r.label)}</th>${uxCellHTML(r.w)}${uxCellHTML(r.h)}</tr>`).join('')||'<tr><td colspan="3" class="meal-none">None planned</td></tr>'}</tbody></table>`;}
// Details dialog title: generic names; keto breakfast uses the same per-person names as the card's menu line.
function uxDetailsTitle(i,m){if(m!=='b'||!['w','h'].some(isKeto))return uxMealText(batchMealTitle(state.days[i],m));const n=['w','h'].map(p=>uxMealText(uxMealName(i,p,m)));return n[0]===n[1]?n[0]:['w','h'].map((p,k)=>PERSON_NAMES[p]+': '+n[k]).join(' · ');}
function uxNutrition(i){return `<details class="ux-disclosure"><summary>Nutrition &amp; carb checks</summary><div class="ux-nutrition">${['w','h'].map(p=>{const t=assignedDayNutrition(i,p);return `<section><h3>${PERSON_NAMES[p]}</h3><p>${F(t.aHi)} g counted carbs · ${F(t.c)} g estimated total carbs · ${F(t.fb)} g counted fibre <button type="button" class="text-btn" data-ux-carbs="${i},${p}">Carbs breakdown</button></p>${isKeto(p)?`<ul>${dailyPlanChecks(t,p).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</section>`;}).join('')}</div><a href="#keto">Diet comparison and targets</a></details>`;}
// Read-only day carbs view. dayCarbBreakdown(i,p) ships with nutrition-runtime; until then only the day totals show.
const UX_CARB_CONVENTION='Counted available carbs subtract documented fibre only from USDA total-carb or IFCT total estimates. Packets keep their full declared carbohydrate because the convention is unverified. This conservative count is not guaranteed physiological net carbs.';
const UX_CARB_REASONS={'missing-carbohydrate-profile':['Missing carbohydrate profile','No carb value is on file for this food (for example the unspecified spice mix), so its whole weight counts toward the upper bound.'],'manual-label-missing-carbohydrates':['Manual label without carbs','A manual food label in Settings records calories and protein only, so the carbs of that food are not known.'],'legacy-batch-missing-carbohydrates':['Legacy batch without carbs','This prepared batch was saved before carbs were recorded. Current profiles are not substituted.'],'frozen-carbohydrate-data-incomplete':['Frozen snapshot with incomplete carb data','The saved batch snapshot has at least one ingredient whose carbs were unknown when it was frozen.']};
const UX_CARB_KINDS={live:'Current',frozen:'Frozen batch',legacy:'Old batch',override:'Manual label'};
function uxCarbsLink(i,p,t){const range=comparisonRange(t.a,t.aHi),budget=isKeto(p)?` / ${ketoOptions.carbBudget} g`:'';return `<button type="button" class="ux-carbs-link" data-ux-carbs="${i},${p}" aria-label="${PERSON_NAMES[p]}: ${range} g counted available carbs${budget?' of '+ketoOptions.carbBudget+' g budget':''}. View carbs breakdown">${range} g carbs${budget?`<small>${budget}</small>`:''}</button>`;}
function uxCarbDay(i){return DAYS[i]+(state.weekKey?', '+new Date(dateForDay(i)+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short'}):'');}
function uxCarbFood(f){return uxDisplayText(UX_FOOD_NAMES[f.id]||DB[f.id]?.[0]||f.id);}
function uxCarbQuantity(f){const q=F(f.quantity),one=f.quantity===1;return f.unit==='serving'?`${q} ${one?'scoop':'scoops'}`:f.unit==='egg'?`${q} ${f.id==='eggWhite'?(one?'white':'whites'):(one?'egg':'eggs')}`:`${q} ${f.unit||'g'}`;}
function uxCarbCell(n,k,unknown){return `<td>${unknown?`unknown<small>up to ${F(n[k+'Hi'])} g</small>`:`${comparisonRange(n[k],n[k+'Hi'])} g${n.carbUnknown?'<small>incl. unknown</small>':''}`}</td>`;}
function uxCarbsHTML(i,p){
 const keto=isKeto(p),budget=ketoOptions.carbBudget,b=typeof dayCarbBreakdown==='function'?dayCarbBreakdown(i,p):null,t=b?.totals||assignedDayNutrition(i,p);
 const toggle=`<div class="ux-carbs-person" role="group" aria-label="Person">${['w','h'].map(q=>`<button type="button" data-ux-carbs="${i},${q}" aria-pressed="${q===p}">${PERSON_NAMES[q]} <small>${uxDietName(q)}</small></button>`).join('')}</div>`;
 const figures=`<div class="ux-carbs-figures"><div><span>Counted available carbs</span><strong>${comparisonRange(t.a,t.aHi)} g</strong><small>${keto?`Keto budget ${budget} g`:'Balanced · no carb budget'}</small></div><div><span>Estimated total carbs</span><strong>${comparisonRange(t.c,t.cHi)} g</strong></div><div><span>Counted fibre</span><strong>≥${F(t.fb)} g</strong></div></div>`;
 // Informational only: never a pass state, and unknown data is always named.
 const status=`${t.carbUnknown?'<p class="ux-carbs-unknown" role="status">Unknown data — upper bound is conservative, not a measured amount.</p>':''}${keto&&t.aHi>budget?`<p class="ux-carbs-unknown">Upper bound ${F(t.aHi)} g is above the ${budget} g budget.</p>`:''}${t.k?'':'<p class="ux-note">No home meals counted for this day; eating-out intake is unknown.</p>'}<p class="ux-note">${UX_CARB_CONVENTION}</p>`;
 if(!b)return `<div class="ux-carbs">${toggle}${figures}${status}<p class="ux-note ux-carbs-missing">Per-food breakdown unavailable until the next update.</p></div>`;
 const foods=[...b.foods].sort((x,y)=>(y.nutrition?.aHi||0)-(x.nutrition?.aHi||0)),groups={};
 for(const f of foods)for(const r of f.reasons||[])(groups[r]||=[]).push(f);
 const rows=foods.map(f=>{const unknown=!!f.reasons?.length;return `<tr><th scope="row">${esc(uxCarbFood(f))}<small>${esc(uxCarbQuantity(f))} · <span class="ux-carbs-badge"${f.carbConvention?` title="${esc(f.carbConvention)}"`:''}>${esc(UX_CARB_KINDS[f.kind]||f.kind||'')}</span> ${esc(uxDisplayText(String(f.source||'').split(/[;(,]/)[0].trim()))}</small></th>${uxCarbCell(f.nutrition,'a',unknown)}${uxCarbCell(f.nutrition,'c',unknown)}</tr>`;}).join('')||'<tr><td colspan="3">No foods counted.</td></tr>';
 const meals=b.meals.map(x=>`<tr><th scope="row">${UX_MEALS[x.meal]||x.meal}</th>${uxCarbCell(x.nutrition,'a')}${uxCarbCell(x.nutrition,'c')}</tr>`).join('');
 const table=`<table class="ux-carbs-table"><caption class="sr-only">${PERSON_NAMES[p]} carbs by food and meal</caption><thead><tr><th scope="col">Food</th><th scope="col"><abbr title="Counted available carbs">Avail.</abbr></th><th scope="col"><abbr title="Estimated total carbs">Total</abbr></th></tr></thead><tbody>${rows}</tbody><tbody class="ux-carbs-meals"><tr><th scope="rowgroup" colspan="3">Meal subtotals</th></tr>${meals}<tr class="ux-carbs-day"><th scope="row">Day</th>${uxCarbCell(t,'a')}${uxCarbCell(t,'c')}</tr></tbody></table>`;
 const why=`<details class="ux-disclosure"><summary>Why some carbs are unknown</summary><div>${Object.entries(groups).map(([r,fs])=>`<h4>${esc(UX_CARB_REASONS[r]?.[0]||r)}</h4><p class="ux-note">${esc(UX_CARB_REASONS[r]?.[1]||'Carb data is incomplete for these foods.')}</p><ul>${fs.map(f=>`<li><b>${esc(uxCarbFood(f))}</b> · ${esc(UX_CARB_KINDS[f.kind]||f.kind||'')} · ${esc(uxDisplayText(f.source||'Unverified estimate'))}${f.basis?' · '+esc(uxBasisText(f.basis)):''}</li>`).join('')}</ul>`).join('')||'<p class="ux-note">No food on this day is missing carb data.</p>'}<p class="ux-note">Ranges represent undeclared ingredient data, not statistical confidence intervals. Unknown spices or frozen historical label differences prevent a verified carb pass. Manual labels keep calories and protein only. Saved prepared portions stay frozen; historical frozen batches are not rewritten.</p></div></details>`;
 return `<div class="ux-carbs">${toggle}${figures}${status}${table}${why}</div>`;
}
function openUXCarbs(i,p){const dlg=document.querySelector('#dlg');document.querySelector('#dlgTitle').textContent=`Carbs · ${uxCarbDay(i)}`;document.querySelector('#dlgBody').innerHTML=uxCarbsHTML(i,p);if(!dlg.open)dlg.showModal();document.querySelector(`#dlgBody [data-ux-carbs="${i},${p}"]`)?.focus();}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-ux-carbs]');if(!b)return;e.preventDefault();const [i,p]=b.dataset.uxCarbs.split(',');openUXCarbs(Number(i),p);});
// Phones: Breakfast / Lunch / Dinner / Snacks start collapsed; one meal open per day. View-only memory for this tab
// (never saved). Wider screens keep every card open.
let uxOpenMeal={};
function uxIsPhone(){return typeof matchMedia==='function'&&matchMedia('(max-width:600px)').matches;}
function uxMealKey(i){return (state.weekKey||'template')+':'+i;}
function uxMealSummary(i,m){const d=state.days[i];if(!(kept(d,m)||m==='e'&&!d.off))return 'Skipped';return ['w','h'].map(p=>{const t=comparisonSum(meal(d,m,p));return `${PERSON_NAMES[p][0]} ${t.k?R(t.k)+' kcal':'—'}`;}).join(' · ');}
function uxMealHTML(i,m,view='week'){
 const d=state.days[i],planned=kept(d,m)||m==='e'&&!d.off;
 const adjust=planned&&m!=='e'?['w','h'].filter(isKeto).map(p=>{const h=ketoEditHTML(d,i,p,m);return h?`<div class="meal-adjust"><span>${PERSON_NAMES[p]}</span>${h}</div>`:'';}).join(''):'';
 // One action band under the heading in every meal card: per-person Adjust portions left, Weigh & serve | Details right.
 // Breakfast has no weighing; an empty slot keeps Details in the same place as in Lunch and Dinner.
 const actions=planned&&m!=='e'?`<div class="meal-card-actions">${['l','d'].includes(m)?`<button class="ing" data-weigh="${i}" data-weigh-meal="${m}">Weigh &amp; serve</button>`:'<span class="meal-action-slot" aria-hidden="true"></span>'}<button class="ing meal-details-link" data-ing="${i},${m}" title="Ingredients, split ratios and nutrition">Details</button></div>`:'';
 const phone=uxIsPhone(),open=!phone||uxOpenMeal[uxMealKey(i)]===m,id=`meal-body-${view}-${i}-${m}`;
 const head=phone?`<div class="meal-card-head"><h3><button type="button" class="meal-toggle" data-ux-meal-toggle="${i},${m}" aria-expanded="${open}" aria-controls="${id}"><span>${UX_MEALS[m]}</span><small>${esc(uxMealSummary(i,m))}</small></button></h3></div>`:`<div class="meal-card-head"><h3>${UX_MEALS[m]}</h3></div>`;
 return `<section class="meal-card${m==='e'?' meal-snacks':''}${phone?' meal-collapsible':''}${open?'':' meal-collapsed'}" data-ux-meal="${m}">${head}<div class="meal-body" id="${id}"${open?'':' hidden'}>${actions?`<div class="meal-actions">${adjust}${actions}</div>`:''}${planned?uxMealTable(i,m)+(m==='e'&&['w','h'].some(isKeto)?'<p class="meal-note">Keto nuts are measured, counted foods listed with meals (about 120 g/day in the current draft); a snack from those portions is not extra food.</p>':''):'<p class="meal-none">Eating out / skipped. Home-food quantities excluded.</p>'}</div></section>`;
}
// Tap a meal header: open it and close the day's other meal; tap again to close. Re-renders keep the open meal.
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-ux-meal-toggle]');if(!b)return;const [i,m]=b.dataset.uxMealToggle.split(','),k=uxMealKey(Number(i));uxOpenMeal[k]=uxOpenMeal[k]===m?null:m;const page=b.closest('main')?.id;renderToday();renderWeek();document.querySelector(`#${page||'todayPage'} [data-ux-meal-toggle="${i},${m}"]`)?.focus();});
if(typeof matchMedia==='function')matchMedia('(max-width:600px)').addEventListener?.('change',()=>{if(typeof cloudReady!=='undefined'&&cloudReady){renderToday();renderWeek();}});
// Edit meals: breakfast previews follow side inputs as they are typed.
document.addEventListener('input',e=>{if(!e.target.matches?.('#dlgBody [data-es]')||typeof editRefreshPreviews!=='function')return;editRefreshPreviews();refreshEditDirty();});
function uxResolvedRecipe(raw){return raw&&typeof plannedRecipe==='function'?plannedRecipe(raw,state.weekKey||'template'):raw;}
function uxWeekRow(day,i){const r=Object.fromEntries(Object.entries(sharedRecipes[sharedKey(i)]||{}).map(([k,v])=>[k,uxResolvedRecipe(v)]));return `<div class="meal-recipe-fields" data-ux-week-day="${i}"><label>Shared sabzi<select aria-label="${DAYS[i]} shared sabzi" data-ux-recipe="${i}" data-ux-person="shared"><option value="original"${!r.recipe?' selected':''}>${esc(SABZIS[day.s])}</option>${uxRecipeOptions(r.recipe)}</select></label>${['w','h'].map(p=>`<label>${PERSON_NAMES[p]} sabzi<select aria-label="${DAYS[i]} ${PERSON_NAMES[p]} sabzi" data-ux-recipe="${i}" data-ux-person="${p}"><option value="shared"${!r[p]?' selected':''}>Use shared</option>${uxRecipeOptions(r[p])}</select></label>`).join('')}</div>`;}
function uxRecipeOptions(selected){return Object.entries({...SABZIS,...KETO_SHARED}).filter(([id])=>!KETO_RETIRED.includes(id)||id===selected).map(([id,name])=>`<option value="${id}"${selected===id?' selected':''}>${esc(name)}</option>`).join('');}
// Product identities for paneer and butter. Root's foodChoices/updateFoodChoice own the saved choice and the math.
const UX_PRODUCTS={paneer:{label:'Paneer',options:[['paneerMM','Milky Mist paneer · 500 g'],['paneer','Heritage regular paneer'],['paneerHP','Heritage NOURISH+ high-protein paneer']]},butter:{label:'Butter',options:[['butter','Amul salted butter'],['butterH','Heritage table butter']]}};
const UX_PRODUCT_DEFAULTS={paneer:'paneerMM',butter:'butter'};
function uxProductChoice(field){return typeof foodChoices!=='undefined'&&foodChoices?.[field]||UX_PRODUCT_DEFAULTS[field];}
function uxProductName(id){for(const f of Object.values(UX_PRODUCTS))for(const [v,n] of f.options)if(v===id)return n;return UX_FOOD_NAMES[id]||id;}
function uxProductChoicesHTML(){const ready=typeof updateFoodChoice==='function';return `<div class="ux-products">${Object.entries(UX_PRODUCTS).map(([f,{label,options}])=>`<label>${label}<select data-ux-food-choice="${f}"${ready?'':' disabled'}>${options.map(([v,n])=>`<option value="${v}"${uxProductChoice(f)===v?' selected':''}>${esc(n)}${v===UX_PRODUCT_DEFAULTS[f]?' (default)':''}</option>`).join('')}</select></label>`).join('')}<p class="ux-note">The product you buy. Its label nutrition is used for new meals; saved prepared batches keep the values they were cooked with.</p></div>`;}
const UX_WEIGHT_NOTE='Food weights are before cooking (dry for grains and dals); cooked grams appear after weighing. Calories include planned cooking oil.';
function uxDayHTML(i,today=false){
 const d=state.days[i],date=dateForDay(i);
 const totals=`<div class="meal-day-totals">${['w','h'].map(p=>{const t=assignedDayNutrition(i,p);const on={k:uxMacroOn(p,'k'),p:uxMacroOn(p,'p'),c:uxMacroOn(p,'c')};return `<div><span>${PERSON_NAMES[p]} <small>${uxDietName(p)}</small></span>${on.k?`<strong>${R(t.k)}<small> kcal</small></strong>`:''}${on.p?`<span>${F(t.p)} g protein</span>`:''}${on.c?uxCarbsLink(i,p,t):''}</div>`;}).join('')}</div>`;
 const actions=`<div class="day-actions"><button data-cook="${i}">1 · Cook list</button><button class="primary" data-weigh="${i}">2 · Serve</button><button data-edit="${i}">Edit meals</button></div>`;
 return `<article class="panel meal-day${today?' meal-day-today':''}" data-meal-day="${i}"><header class="meal-day-head">${today?`<h2 class="sr-only">${DAYS[i]}</h2>${totals}`:`<h2>${DAYS[i]}${state.weekKey?` <small>${fmtMon(date)}</small>`:''}</h2>`}${actions}</header>${today?'':totals}${uxWarning(i)}${uxDayStatus(i)}<div class="meal-cards">${['b','l','d','e'].map(m=>uxMealHTML(i,m,today?'today':'week')).join('')}</div><div class="meal-day-more"><details class="ux-disclosure" data-meal-details="choices-${i}"><summary>Sabzis &amp; vessels</summary>${uxWeekRow(d,i)}<div class="ut-use">${[['sabzi','Sabzi'],['dal','Dal'],['prot','Paneer / soya']].map(([k,n])=>`<label>${n} vessel<select data-utday="${i}" data-uk="${k}">${utOpts(utDayAt(i)[k])}</select></label>`).join('')}</div></details>${uxNutrition(i)}</div></article>`;
}
function uxPreserveDetails(el,html){const open=new Set([...el.querySelectorAll('details[open]')].map(x=>x.dataset.ketoEdit||x.dataset.mealDetails||x.querySelector('summary')?.textContent));el.innerHTML=html;el.querySelectorAll('details').forEach(x=>{x.open=open.has(x.dataset.ketoEdit||x.dataset.mealDetails||x.querySelector('summary')?.textContent);});}
function uxWeekContext(){const mon=mondayOf(dayViewISO()),range=esc(weekRangeText(mon));return `<p class="ux-note ux-week-context">${state.weekKey?`Week of <b>${range}</b> · changes here apply to this week only. <button class="text-btn" data-ux-calendar>Change week</button>`:`<b>${range}</b> has no saved plan yet, so it shows your weekly template. Editing a meal here saves this week first, leaving the template unchanged. <button class="text-btn" data-ux-calendar="${mon}">Save this week now</button>`}</p>`;}
// Week overview: one compact row per day (what's cooked, each person's kcal/carbs), tapping jumps to that day's card.
function uxWeekOverview(){return `<div class="ux-week-overview" role="list">${state.days.map((d,i)=>{const sab=differentSabzis(d)?['w','h'].map(p=>uxMealText(recipeName(personRecipe(d,p)))).join(' / '):uxMealText(recipeName(sharedRecipe(d)));const who=['w','h'].map(p=>{const t=assignedDayNutrition(i,p);return `<span><b>${PERSON_NAMES[p][0]}</b> ${t.k?R(t.k)+' kcal':'out'}${t.k&&uxMacroOn(p,'c')?` · ${comparisonRange(t.a,t.aHi)} g carbs`:''}</span>`;}).join('');return `<button type="button" role="listitem" class="ux-week-row" data-ux-jump="${i}"><span class="ux-week-day">${DAYS[i].slice(0,3)}</span><span class="ux-week-dish">${d.off?'Eating out':esc(sab)}</span><span class="ux-week-kcal">${who}</span></button>`;}).join('')}</div>`;}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-ux-jump]');if(!b)return;document.querySelector(`#weekPage [data-meal-day="${b.dataset.uxJump}"]`)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
function renderToday(){const el=document.querySelector('#todayPage');if(!el)return;const i=uxCurrentIndex(),date=new Date(dayViewISO()+'T12:00:00'),dateText=date.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});uxPreserveDetails(el,`<div class="ux-day-heading"><div class="ux-day-nav"><button data-daynav="-1" aria-label="Previous day">‹</button><h2>${esc(dateText)}</h2><button data-daynav="1" aria-label="Next day">›</button></div><div class="ux-day-tools">${dayOff?'<button class="text-btn" data-daynav="0">Today</button>':''}<button data-ux-calendar>Calendar</button></div></div>${uxWeekContext()}${uxDayHTML(i,true)}<p class="ux-note ux-foot">${UX_WEIGHT_NOTE}</p>`);}
function renderWeek(){const el=document.querySelector('#weekPage');if(!el)return;const mon=state.weekKey||mondayOf(dayViewISO());const batches=document.querySelector('#batchList')?.innerHTML||'<p>No prepared batches.</p>';uxPreserveDetails(el,`<div class="ux-section-heading"><div class="ux-week-nav"><button data-ux-week-shift="-1" aria-label="Previous week">‹</button><h2>${state.weekKey?esc(weekRangeText(mon)):'Weekly template'}</h2><button data-ux-week-shift="1" aria-label="Next week">›</button></div><div class="day-actions"><button data-ux-calendar>Calendar &amp; saved weeks</button>${state.weekKey?'<button data-ux-template>Edit template</button>':'<button class="primary" data-ux-calendar>Save week</button>'}</div></div>${state.weekKey?`<p class="ux-note">Changes here apply to this week only.</p>`:'<p class="ux-scope ux-scope-template" role="note"><b>Editing the weekly template.</b> Every week without its own saved plan changes too. Use <b>Save week</b> to fix these seven days to calendar dates first.</p>'}${uxWeekOverview()}${state.days.map((_,i)=>uxDayHTML(i)).join('')}<p class="ux-note">${UX_WEIGHT_NOTE}</p><details class="ux-disclosure"><summary>Prepared batches</summary>${batches}</details>`);}
function uxDietControlsHTML(){return `<div class="meal-assignments">${['w','h'].map(p=>`<div><b>${PERSON_NAMES[p]}</b><label class="sr-only" for="mealDiet-${p}">${PERSON_NAMES[p]} diet</label><select id="mealDiet-${p}" data-ux-diet="${p}"><option value="balanced"${!isKeto(p)?' selected':''}>Balanced</option><option value="keto"${isKeto(p)?' selected':''}>Keto</option></select>${!isKeto(p)?`<label class="sr-only" for="mealPortion-${p}">${PERSON_NAMES[p]} portion plan</label><select id="mealPortion-${p}" data-ux-portion="${p}">${[['easy','Low'],['medium','Medium'],['hard','High']].map(([k,n])=>`<option value="${k}"${personMode(p)===k?' selected':''}>${n}</option>`).join('')}</select>`:''}</div>`).join('')}</div><p class="ux-note">Changes every day's meals, cook list and shopping for that person. Saved Balanced menus stay available.</p>`;}
function renderMealControls(){const el=document.querySelector('#mealControls');if(!el)return;el.innerHTML=`<div class="meal-toolbar"><div class="meal-view-switch" role="group" aria-label="Planner view"><a href="#today"${uxRoute==='today'?' aria-current="page"':''}>Day plan</a><a href="#week"${uxRoute==='week'?' aria-current="page"':''}>Week plan</a></div>${uxMacrosHTML()}</div>`;const diet=document.querySelector('#uxDietSettings');if(diet)diet.innerHTML=uxDietControlsHTML();}
// Show macros: one shared toolbar popover, six checkboxes. Toggling re-renders Today and Week only (no saves).
function uxMacrosCount(){return ['w','h'].reduce((n,p)=>n+UX_MACROS.filter(([k])=>uxMacroOn(p,k)).length,0);}
function uxMacrosHTML(){return `<div class="meal-macros"><button type="button" class="meal-macros-btn" data-ux-macros-toggle aria-expanded="${uxMacrosOpen}" aria-controls="mealMacrosMenu">Show macros <small data-ux-macros-count>${uxMacrosCount()}/6</small></button><div class="meal-macros-menu" id="mealMacrosMenu" role="group" aria-label="Show macros"${uxMacrosOpen?'':' hidden'}>${['w','h'].map(p=>`<fieldset><legend>${PERSON_NAMES[p]}</legend>${UX_MACROS.map(([k,n])=>`<label class="ux-checkbox"><input type="checkbox" data-ux-macro="${p},${k}"${uxMacroOn(p,k)?' checked':''}> ${n}</label>`).join('')}</fieldset>`).join('')}</div></div>`;}
function uxSetMacrosOpen(open){uxMacrosOpen=open;const b=document.querySelector('[data-ux-macros-toggle]'),m=document.querySelector('#mealMacrosMenu');if(b)b.setAttribute('aria-expanded',String(open));if(m)m.hidden=!open;}
function uxMacrosOutside(e){const t=e.target;return uxMacrosOpen&&e.button===0&&!!t?.isConnected&&!t.closest?.('.meal-macros');}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-ux-macros-toggle]'))uxSetMacrosOpen(!uxMacrosOpen);});
document.addEventListener('change',e=>{const t=e.target;if(!t.matches?.('[data-ux-macro]'))return;const [p,k]=t.dataset.uxMacro.split(',');uxMacros[p][k]=t.checked;renderToday();renderWeek();const c=document.querySelector('[data-ux-macros-count]');if(c)c.textContent=uxMacrosCount()+'/6';});
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!uxMacrosOpen||document.querySelector('dialog[open]'))return;const inside=document.activeElement?.closest?.('.meal-macros');uxSetMacrosOpen(false);if(inside)document.querySelector('[data-ux-macros-toggle]')?.focus();});
function initializeUX(){const settings=document.querySelector('#settingsPage');if(!settings||settings.dataset.initialized)return;settings.dataset.initialized='true';settings.innerHTML='<details class="ux-disclosure" id="uxHousehold"><summary>Household diets</summary><div id="uxDietSettings"></div></details><details class="ux-disclosure" id="uxUtensils"><summary>Kitchen · utensil weights</summary></details><details class="ux-disclosure" id="uxLabels"><summary>Products &amp; food labels</summary></details><details class="ux-disclosure"><summary>Connection</summary><div id="uxOtherSettings"></div></details>';document.querySelector('#uxDietSettings').innerHTML=uxDietControlsHTML();document.querySelector('.portion-controls').hidden=true;document.querySelector('#uxUtensils').append(document.querySelector('#utensils'));document.querySelector('#uxLabels').append(document.querySelector('#labels'));document.querySelector('#uxOtherSettings').append(document.querySelector('#syncBtn'));document.querySelector('#resetBtn').hidden=true;document.querySelectorAll('[data-ux-nav]').forEach(a=>a.querySelector('span').insertAdjacentHTML('beforebegin',uxIcon(a.dataset.uxNav)));document.querySelector('#settingsLink').innerHTML=uxIcon('settings');}
function renderUX(){initializeUX();renderToday();renderWeek();showUXRoute(location.hash,false);renderMealControls();}
function showUXRoute(hash,refresh=true){
 const utility=['#settings','#labels','#utensils','#keto'].includes(hash),route=utility?uxRoute:hash==='#shopping'||hash==='#shop'?'shop':hash==='#week'||hash==='#planner'?'week':'today';const old=uxRoute;uxRoute=route;
 const desired=route==='today'?'day':'week';if(!refresh&&!utility)state.view=desired;if(refresh&&cloudReady&&!utility&&(state.view!==desired||old!==route)){state.view=desired;state.viewExplicit=true;if(route==='today')selectDayWeek();render();}
 document.querySelector('#regularPlan').hidden=true;for(const [id,name]of [['todayPage','today'],['weekPage','week'],['shopping','shop']])document.querySelector('#'+id).hidden=route!==name;document.querySelector('#mealControls').hidden=route==='shop';
 document.querySelectorAll('[data-ux-nav]').forEach(a=>{const active=a.dataset.uxNav===(route==='shop'?'shop':'meals');a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});document.body.dataset.uxRoute=route;
 const dlg=document.querySelector('#settingsDlg');if(utility){if(hash==='#utensils'||hash==='#labels')document.querySelector(hash==='#utensils'?'#uxUtensils':'#uxLabels').open=true;if(hash==='#keto'){document.querySelector('#uxDietReview').open=true;document.querySelector('#keto').hidden=false;}if(!dlg.open)dlg.showModal();}else if(dlg.open)dlg.close();
 document.querySelectorAll('.meal-view-switch a').forEach(a=>{if(a.hash==='#'+route)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
}
function queueUXSave(){clearTimeout(uxSaveTimer);uxSaveTimer=setTimeout(async()=>{if(cloudSaving){queueUXSave();return;}if(cloudReady)await saveChanges();},450);}
async function uxSaveActivity(key,value){MealCloud.validateRecord(key,value);activityRecords[key]=value;save();const ok=await saveChanges();render();return ok;}
document.addEventListener('change',e=>{const t=e.target;if(!t.matches?.('[data-ux-food-choice],[data-ux-yield],[data-ux-mushroom-size]'))return;
 if(!cloudReady||cloudSaving){render();return;}
 t.setCustomValidity?.('');
 try{
  if(t.matches('[data-ux-food-choice]')&&typeof updateFoodChoice==='function'){updateFoodChoice(t.dataset.uxFoodChoice,t.value);queueUXSave();}
  if(t.matches('[data-ux-yield]')&&typeof updateProduceYield==='function'){if(!t.checkValidity()){t.reportValidity();return;}updateProduceYield(t.dataset.uxYield,Number(t.value));queueUXSave();}
  if(t.matches('[data-ux-mushroom-size]')&&typeof updateMushroomPacketSize==='function'){updateMushroomPacketSize(Number(t.value));queueUXSave();}
 }catch(error){t.setCustomValidity?.(error.message);t.reportValidity?.();}
});
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-keto-use-cashews]');if(!b||typeof updateKetoPortion!=='function')return;const key=b.dataset.ketoUseCashews;try{if(updateKetoPortion(key,'cashews',b.dataset.ketoValue)&&updateKetoPortion(key,'walnuts',0))queueUXSave();}catch(error){b.title=error.message;}});
document.addEventListener('change',e=>{const t=e.target;if(!cloudReady)return;if(t.matches('[data-ux-diet]')){householdDiets[t.dataset.uxDiet]=t.value;save();render();queueUXSave();}if(t.matches('[data-ux-portion]')){state.personModes[t.dataset.uxPortion]=t.value;state.custom=true;save();render();queueUXSave();}if(t.matches('[data-ux-recipe]')){updateRecipe(+t.dataset.uxRecipe,t.dataset.uxPerson,t.value);queueUXSave();}if(t.closest('#settingsDlg,#todayPage,#weekPage')&&!t.closest('#dlg')&&!t.matches('[data-keto-breakfast]'))queueUXSave();});
document.addEventListener('click',async e=>{if(e.target.closest('[data-settings-close]'))document.querySelector('#settingsDlg').close();const cal=e.target.closest('[data-ux-calendar]');if(cal)openCal(cal.dataset.uxCalendar||null);if(e.target.closest('[data-ux-template]')){selectWeek(null);render();}const shift=e.target.closest('[data-ux-week-shift]');if(shift){const mon=addDate(state.weekKey||mondayOf(dayViewISO()),7*Number(shift.dataset.uxWeekShift));if(lockedWeeks[mon]){selectWeek(mon);render();}else openCal(mon);}if(e.target.closest('[data-keto-choice],[data-person-diet]')&&!e.target.closest('#dlg'))queueUXSave();});
// The Day page never edits the template by accident: the first change to a meal there saves the calendar week
// (a copy of the template, keto portions included) and then applies the change to that week.
function uxEnsureWeek(){if(state.weekKey||state.view!=='day')return false;const mon=mondayOf(dayViewISO());if(!mon)return false;if(!lockedWeeks[mon]){ensureUtDay();ensureOilUse();copyDietScope('template',mon);lockedWeeks[mon]={days:structuredClone(state.days),mode:state.mode,personModes:{...state.personModes},utDay:structuredClone(state.utDay),soya:state.soya,oilUse:structuredClone(state.oilUse),savedAt:Date.now()};persistWeeks();}state.weekKey=mon;return mon;}
function uxWeekFirst(e){const t=e.target;if(!cloudReady||cloudSaving||!t.closest?.('#todayPage'))return;const field=t.closest('[data-keto-key]');if(!field&&!t.matches?.('[data-ux-recipe],[data-utday]'))return;if(e.type==='click'&&!t.closest('[data-keto-choice]'))return;if(t.matches?.('[data-keto-field]')){t.setCustomValidity('');if(!t.checkValidity())return;}const mon=uxEnsureWeek();if(mon&&field)field.dataset.ketoKey=field.dataset.ketoKey.replace(/^keto\/template\//,`keto/${mon}/`);}
document.addEventListener('change',uxWeekFirst,true);document.addEventListener('click',uxWeekFirst,true);
// Save state in the header: short and always visible. Mirrors the sync bar's own status text.
function uxSaveLabel(t){return /saving/i.test(t)?['Saving…','busy']:/unsaved/i.test(t)?['Unsaved','warn']:/connection lost|not connected/i.test(t)?['Offline','warn']:/another device|conflict/i.test(t)?['Conflict','warn']:/loading/i.test(t)?['Loading…','busy']:/saved/i.test(t)?['Saved','ok']:[t?'Check sync':'','warn'];}
function uxRenderSaveStatus(){const el=document.querySelector('#uxSaveStatus');if(!el||typeof syncStatusText!=='string')return;const [label,kind]=uxSaveLabel(syncStatusText);if(el.textContent!==label)el.textContent=label;el.dataset.kind=kind;el.title=syncStatusText;}
setInterval(uxRenderSaveStatus,1000);
// One outside-click rule for every native dialog. Both the press and the click must land outside the box
// (scrollbar gutter and padding count as inside), so drags out of inputs keep it open. close() runs each dialog's own cleanup.
function uxPointerOutside(r,x,y){return x<r.left||x>r.right||y<r.top||y>r.bottom;}
function uxDialogOutside(e){const d=e.target;return d instanceof HTMLDialogElement&&d.open&&e.button===0&&uxPointerOutside(d.getBoundingClientRect(),e.clientX,e.clientY)?d:null;}
let uxDialogPress=null;
// The Show macros popover follows the same press-and-click rule, by containment instead of geometry.
document.addEventListener('pointerdown',e=>{uxDialogPress=e.isPrimary===false?null:uxDialogOutside(e);uxMacrosPress=e.isPrimary!==false&&uxMacrosOutside(e);},true);
document.addEventListener('click',e=>{const d=uxDialogPress,m=uxMacrosPress;uxDialogPress=null;uxMacrosPress=false;if(d&&uxDialogOutside(e)===d)d.close();if(m&&uxMacrosOutside(e))uxSetMacrosOpen(false);},true);
document.addEventListener('DOMContentLoaded',()=>{document.querySelector('#settingsDlg').addEventListener('close',()=>{if(['#settings','#labels','#utensils','#keto'].includes(location.hash))location.hash=uxRoute==='shop'?'shopping':uxRoute;});});

// Cook list = what the cook actually prepares, grouped by dish. Presentation only: oil, spices, whey and ready foods
// (dairy, milk, nuts, cucumber, avocado) are left out here but stay in nutrition, shopping and batch snapshots.
// A Keto husband cooks his own breakfast and protein, so only his share of the shared sabzi pot appears.
const UX_COOK_SKIP=new Set(['oil','spice','whey','curd','curdH','milk','almonds','cashews','walnuts','nuts','flax','cucumber','avocado']);
function uxCookLines(lines){return aggregateBatchLines(lines).filter(x=>x.q>0&&!UX_COOK_SKIP.has(x.id)).map(x=>`${uxDisplayText(DB[x.id]?.[0]||x.id)} — ${uxFoodRow(x).quantity}`);}
function uxSelfCooks(p){return p==='h'&&isKeto(p);}
function uxCookGroups(i){
 const d=state.days[i],groups=[],add=(title,lines)=>{const rows=uxCookLines(lines);if(rows.length)groups.push([title,rows]);};
 const batch=batchCookGroups(i);
 if(d.off)return [['Note',['Eating out — nothing to cook at home today.']],...batch];
 if(kept(d,'b')){
  const bal=['w','h'].filter(p=>!isKeto(p)&&!uxReadyBreakfast(d,p));
  if(bal.length)add(`Breakfast · ${BREAKFASTS[d.b]} (${bal.map(p=>PERSON_NAMES[p]).join(' + ')})`,bal.flatMap(p=>breakfast(d.b,p,d)));
  for(const p of ['w','h'].filter(p=>isKeto(p)&&!uxSelfCooks(p)&&!uxReadyBreakfast(d,p)))add(`Breakfast · ${PERSON_NAMES[p]} ${uxMealText(uxMealName(i,p,'b'))}`,meal(d,'b',p));
 }
 if(differentSabzis(d)){for(const p of ['w','h'])add(`Sabzi · ${uxMealText(recipeName(personRecipe(d,p)))} for ${PERSON_NAMES[p]} (lunch + dinner)`,['l','d'].flatMap(m=>coveredComponent(d,m,p,'sabzi')?[]:originalComponent(d,m,p,'sabzi')));}
 else add(`Sabzi · ${uxMealText(recipeName(sharedRecipe(d)))} (one pot for lunch + dinner)`,freshSabziLines(d));
 const balanced=['w','h'].filter(p=>!isKeto(p));
 add(`Dal · ${DALNAMES[d.dal]} (one pot for lunch + dinner)`,balanced.flatMap(p=>['l','d'].filter(m=>kept(d,m)).map(()=>L(d.dal,150*dalShare(p)))));
 add('Dinner paneer / soya',balanced.filter(p=>kept(d,'d')&&!coveredComponent(d,'d',p,'protein')).flatMap(p=>originalComponent(d,'d',p,'protein')));
 for(const p of ['w','h'].filter(p=>isKeto(p)&&!uxSelfCooks(p)))add(`${PERSON_NAMES[p]} protein (lunch + dinner)`,['l','d'].filter(m=>kept(d,m)&&!coveredComponent(d,m,p,'protein')).flatMap(m=>ketoComponent(d,p,m,'protein')));
 add('Rice / roti',balanced.flatMap(p=>['l','d'].filter(m=>kept(d,m)).flatMap(m=>freshMeal(d,m,p).filter(x=>['rice','atta'].includes(x.id)))));
 return [...groups,...batch];
}

// A single dish at a time. Existing allocation, global tare and frozen batches are reused.
let serveStep=1,serveDish='sabzi',serveRecord=null;
function serveDishes(i){return Object.keys(DISH_NAMES).filter(d=>weighSpecs(i,d).length);}
function openServe(i,meal='l'){
 if(!cloudReady)return;
 weighContext={i,date:dateForDay(i),meal,guided:true};
 const dishes=serveDishes(i);serveDish=dishes.find(d=>currentWeigh(i,d)?.portions.some(s=>s.meal===meal))||dishes[0];serveRecord=serveDish?currentWeigh(i,serveDish):null;serveStep=serveRecord?2:1;
 drawServe();document.querySelector('#dlg').showModal();
}
function serveTitle(i,dish){return uxMealText(dish==='sabzi'?recipeName(sharedRecipe(state.days[i])):dish==='dal'?DALNAMES[state.days[i].dal]+' dal':weighDishName(i,dish));}
function drawServe(){
 const {i,meal,date}=weighContext,dishes=serveDishes(i),r=serveDish?dailyWeights[date+'/'+serveDish]:null;
 document.querySelector('#dlgTitle').textContent='Weigh & serve';document.querySelector('#dlg').classList.add('ux-serve-dialog');
 const prepared=batchCookGroups(i).filter(g=>g[0].startsWith('Already prepared')).map(([t,rows])=>[uxMealText(t),rows]);
 if(!serveDish){document.querySelector('#dlgBody').innerHTML=`${prepared.map(g=>`<section><h3>${esc(g[0])}</h3>${g[1].map(x=>`<p>${esc(x)}</p>`).join('')}</section>`).join('')||'<p>No fresh dishes to weigh for this day.</p>'}<button data-weigh-close>Done</button>`;return;}
 const vessel=r?.vessel||utDayAt(i)[serveDish==='prot'?'prot':serveDish.startsWith('sabzi')?'sabzi':serveDish],weight=state.utensils[vessel]||0;
 const stale=r&&!currentWeigh(i,serveDish);
 let body='';
 if(serveStep===1){body=`<h3>${esc(serveTitle(i,serveDish))}</h3>${uxServePartsHTML(i,serveDish,meal,r?.scope||'all')}<section class="weigh-card ux-weigh-card" data-weigh-dish="${serveDish}"${r?.tare>0?` data-original-tare="${r.tare}"`:''}><p data-weigh-caption></p><label class="ux-weight-entry"><span data-weigh-reading-label>Pan + cooked food</span><div><input data-weigh-gross type="number" min="1" max="150000" step="1" inputmode="numeric" value="${r?.gross||''}" aria-label="Whole cooked batch weight"><span>g</span></div></label><details class="ux-disclosure"><summary>Vessel or meals</summary><label>Vessel<select data-weigh-vessel>${utOpts(vessel)}</select></label><label>Cooked for<select data-weigh-scope>${(serveDish==='prot'?[['d','Dinner']]:[['all','Lunch + dinner'],['l','Lunch only'],['d','Dinner only']]).map(([v,n])=>`<option value="${v}"${(r?.scope||'all')===v?' selected':''}>${n}</option>`).join('')}</select></label><label class="ux-checkbox"><input type="checkbox" data-weigh-includes${r?r.tare?' checked':'':weight?' checked':''}> Includes empty vessel</label></details>${!weight?'<p class="ux-note">Enter food-only weight, or <a href="#utensils" data-serve-settings>set the empty vessel weight</a>.</p>':''}${stale?'<p class="ux-warning">Plan changed. Review this weight and its new portions.</p>':''}<div data-weigh-output></div></section><button class="primary ux-primary" data-serve-preview>Show portions</button>`;}
 else if(serveStep===2){const portions=serveRecord.portions.filter(s=>s.meal===meal),progress=activityRecords[`serve/${date}/${serveDish}`],served=progress?.basis===ActivityMath.activityBasis(serveRecord)?progress.served:[],later=serveRecord.portions.filter(s=>s.meal!==meal&&!served.includes(s.meal+'/'+s.person));body=`<h3>${UX_MEALS[meal]} portions</h3><p class="ux-note">${esc(serveTitle(i,serveDish))} · ${serveRecord.netWeight} g cooked food</p><div class="ux-serve-portions">${portions.map(s=>`<div><span>${PERSON_NAMES[s.person]}<small>${uxDietName(s.person)}</small></span><strong>${s.grams} g</strong></div>`).join('')||'<p>No portions for this meal.</p>'}${later.length?`<h4>${meal==='l'?'Save for dinner':'Other planned meal'}</h4>${later.map(s=>`<div><span>${UX_MEALS[s.meal]} · ${PERSON_NAMES[s.person]}</span><strong>${s.grams} g</strong></div>`).join('')}`:''}</div><button class="primary ux-primary" data-serve-start${portions.length?'':' disabled'}>Start serving</button><button class="text-btn" data-serve-back>Change weight</button>`;}
 else{const activity=activityRecords[`serve/${date}/${serveDish}`],s=ActivityMath.servingState(serveRecord,activity,meal);body=`<h3>Serve ${UX_MEALS[meal].toLowerCase()}</h3><p>${esc(serveTitle(i,serveDish))}</p><div class="ux-food-left"><strong>${s.left} g</strong><span>food left now</span>${serveRecord.tare?`<small>Expected scale: ${s.left+serveRecord.tare} g with vessel</small>`:''}</div><div class="ux-serve-portions">${s.portions.map(p=>`<div class="${p.served?'ux-served':''}"><span>${PERSON_NAMES[p.person]}<small>${p.served?'Served':uxDietName(p.person)}</small></span><strong>${p.grams} g</strong><button class="${p.served?'text-btn':'primary'}" data-serve-mark="${p.meal}/${p.person}">${p.served?'Undo':'Mark served'}</button></div>`).join('')}</div>${meal==='l'&&s.dinner?`<p class="ux-reserved">${s.dinner} g stays for dinner</p>`:''}<button class="text-btn" data-serve-back>Change weight</button>`;}
 document.querySelector('#dlgBody').innerHTML=`<label class="ux-dish-select">Dish<select data-serve-dish-select aria-label="Dish">${dishes.map(d=>`<option value="${d}"${serveDish===d?' selected':''}>${esc(serveTitle(i,d))}</option>`).join('')}</select></label><div class="ux-serve-step">${serveStep} of 3</div>${body}${prepared.length?`<details class="ux-disclosure"><summary>Already prepared portions</summary>${prepared.map(g=>`<h4>${esc(g[0])}</h4>${g[1].map(x=>`<p>${esc(x)}</p>`).join('')}`).join('')}</details>`:''}<div class="ux-serve-footer"><button data-weigh-close>Done</button></div><p data-serve-status role="status"></p>`;
 if(serveStep===1)refreshServeCard(document.querySelector('[data-weigh-dish]'));
}
// Serve by parts first: water changes cooked weight, so equal ladles of the whole pot are the plan. Weighing is optional.
function uxServePartsHTML(i,dish,meal,scope='all'){const parts=uxPotParts(i,dish,scope);if(!parts.length)return '';const total=parts[0].total,exact=parts[0].exact,a=exact?'':'≈ ',row=m=>parts.filter(x=>x.meal===m);
 return `<section class="ux-serve-parts"><p><b>No scale needed:</b> stir the pot well, share any paneer/soya pieces evenly, then split it into <b>${a}${total}</b> equal parts (ladles).${exact?'':' These parts are rounded from the plan.'}</p><div class="ux-serve-portions">${['l','d'].filter(m=>row(m).length).map(m=>`<h4>${UX_MEALS[m]}${m===meal?' · now':''}</h4>${row(m).map(x=>`<div><span>${PERSON_NAMES[x.person]}<small>${uxDietName(x.person)}</small></span><strong>${exact?'':'≈ '}${x.parts} ${x.parts===1?'part':'parts'}</strong></div>`).join('')}`).join('')}</div><p class="ux-note">Ladles are an even split, not measured nutrition. Optional: weigh the pot below for exact cooked grams and to track what's left.</p></section>`;}
function refreshServeCard(card){
 const vessel=card.querySelector('[data-weigh-vessel]').value,inc=card.querySelector('[data-weigh-includes]').checked;
 const tare=inc?Number(card.dataset.originalTare??state.utensils[vessel]??0):0;
 card.querySelector('[data-weigh-caption]').textContent=UT_NAMES[vessel]+(tare?' · '+tare+' g empty':' · food only');card.querySelector('[data-weigh-reading-label]').textContent=inc?'Pan + cooked food':'Cooked food only';
 const parts=document.querySelector('#dlg .ux-serve-parts');if(parts)parts.outerHTML=uxServePartsHTML(weighContext.i,serveDish,weighContext.meal||'l',card.querySelector('[data-weigh-scope]').value);
 const out=card.querySelector('[data-weigh-output]');try{const r=readWeighCard(card);out.innerHTML=r?`<p class="ux-subtraction">${r.gross} − ${r.tare} = <b>${r.netWeight} g food</b></p>`:'';card.dataset.invalid='';}catch(e){out.innerHTML=`<p class="weigh-error" role="alert">${esc(e.message)}</p>`;card.dataset.invalid='true';}
}
document.addEventListener('click',async e=>{
 if(!weighContext?.guided||!document.querySelector('#dlg').open)return;
 if(e.target.closest('[data-serve-settings]'))document.querySelector('#dlg').close();
 if(e.target.closest('[data-serve-back]')){serveStep=1;drawServe();}
 const status=()=>document.querySelector('[data-serve-status]');
 if(e.target.closest('[data-serve-preview]'))try{serveRecord=readWeighCard(document.querySelector('[data-weigh-dish]'));if(!serveRecord)throw Error('Enter the cooked weight first.');serveStep=2;drawServe();}catch(err){status().textContent=err.message;}
 const start=e.target.closest('[data-serve-start]');if(start&&!cloudSaving){start.disabled=true;try{const mon=mondayOf(weighContext.date);if(!lockedWeeks[mon]){copyDietScope(state.weekKey||'template',mon);lockedWeeks[mon]={days:structuredClone(state.days),utDay:structuredClone(state.utDay),savedAt:Date.now()};}dailyWeights[weighContext.date+'/'+serveDish]=serveRecord;save();if(await saveChanges()){serveStep=3;drawServe();}else{status().textContent=syncStatusText;start.disabled=false;}}catch(err){status().textContent=err.message;start.disabled=false;}}
 const mark=e.target.closest('[data-serve-mark]');if(mark&&!cloudSaving){mark.disabled=true;const key=`serve/${weighContext.date}/${serveDish}`,basis=ActivityMath.activityBasis(serveRecord),old=activityRecords[key],served=old?.basis===basis?[...old.served]:[],item=mark.dataset.serveMark;const value={basis,served:served.includes(item)?served.filter(x=>x!==item):[...served,item],updatedAt:Date.now()};if(await uxSaveActivity(key,value))drawServe();else{status().textContent=syncStatusText;mark.disabled=false;}}
});
document.addEventListener('change',e=>{
 if(!weighContext?.guided||!document.querySelector('#dlg').open||!e.target.matches?.('[data-serve-dish-select]'))return;
 serveDish=e.target.value;serveRecord=currentWeigh(weighContext.i,serveDish);serveStep=serveRecord?2:1;drawServe();document.querySelector('[data-serve-dish-select]')?.focus();
});
document.addEventListener('DOMContentLoaded',()=>{document.querySelector('#dlg').addEventListener('close',()=>{document.querySelector('#dlg').classList.remove('ux-serve-dialog');weighContext=null;});});
