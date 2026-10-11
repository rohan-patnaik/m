// Diet views and a derived, energy-matched comparison; saved meals are not replaced.
let ketoPerson='both';
const KETO_SOURCES={
 harvard:'https://nutritionsource.hsph.harvard.edu/healthy-weight/diet-reviews/ketogenic-diet/',
 heart:'https://newsroom.heart.org/news/10-popular-diets-scored-for-heart-healthy-elements-some-need-improvement',
 diabetes:'https://www.diabetes.org.uk/living-with-diabetes/eating/meal-plans/low-carb',
 calories:'https://www.nhs.uk/better-health/lose-weight/calorie-counting/',
 vegetarian:'https://health.clevelandclinic.org/im-a-vegetarian-why-cant-i-lose-weight'
};
// Printed values from the existing 2026-10-04 package-labels.json audit.
// Carbohydrate means the label's declaration; no net-carb subtraction is inferred.
const KETO_PACKETS=[
 {name:'ATOM Isolate · Double Rich Chocolate',basis:'35 g powder',carbs:2.8,fat:1,fibre:null,url:'https://asitisnutrition.com/products/atomwheyproteinisolate?variant=41170886262835'},
 {name:'Heritage fresh paneer',basis:'100 g',carbs:3,fat:22,fibre:null,url:'https://www.bigbasket.com/pd/214024/heritage-paneer-500-g-pouch/'},
 {name:'Milky Mist curd · 1 kg pouch',basis:'100 g',carbs:4.8,fat:3,fibre:null,url:'https://www.bigbasket.com/pd/40262046/milky-mist-curd-fresh-no-preservatives-creamy-1-kg/'},
 {name:'Heritage green toned milk',basis:'100 g, not 100 ml',carbs:4.6,fat:3,fibre:null,url:'https://www.bigbasket.com/pd/40147597/heritage-daily-health-toned-milk-500-ml-pouch/'},
 {name:'Nutrela chunks',basis:'100 g dry',carbs:33.5,fat:.82,fibre:null,url:'https://www.dmart.in/product/nutrela-soya-chunks?selectedProd=46502'},
 {name:'Saffola Mealmaker chunks',basis:'100 g dry',carbs:30.2,fat:1,fibre:15.5,url:'https://www.dmart.in/product/saffola-mealmaker-soya-chunks--psoya0saff3xx40121?selectedProd=823503'}
];
const KETO_VIDEOS=[
 {id:'p5N7x8TQrt8',doctor:'Ken Berry, MD',title:'7 Steps to Starting the Keto Diet',time:62,stamp:'1:02–3:20; 6:17–7:00',take:'Reduce sugar and grains; build meals around ordinary whole foods.',qualification:'The blanket claims about grain inflammation and seed oils, and the salt/supplement advice, are not adopted.'},
 {id:'RM354ysZ5xM',doctor:'Eric Westman, MD',title:'Avoid These Keto Foods',time:199,stamp:'3:19–5:18; 7:55–9:18',take:'Keto drinks, MCT coffee and special keto products are unnecessary. Cheese, cream, oil and vegetables still need portions.',qualification:'His prescription-strength approach excludes nuts. Other doctors allow them; the preview treats nuts as optional, weighed and counted.'},
 {id:'gg6uTQ0EC_Q',doctor:'Annette Bosworth, MD (Dr. Boz)',title:'How to Begin Keto',time:84,stamp:'1:24–3:32; 4:01–5:11',take:'A gradual transition can start with drinks, then starches, plus planning and household support.',qualification:'Her no-calorie-drinks rule is a transition tactic, not a reason to automatically discard your whey. Check its actual carb panel.'},
 {id:'zrRDnLJdjmQ',doctor:'Andreas Eenfeldt, MD · Diet Doctor',title:'A Keto Diet for Beginners',time:136,stamp:'2:16–2:37; 6:11–6:25',take:'Replace grain/starch staples with protein, vegetables and fats; vegetarian plans are possible.',qualification:'The claims about effortless weight loss and not needing calorie counts are not promises. Your oil and portion calories still count.'},
 {id:'da1vvigy5tQ',doctor:'Sarah Hallberg, DO · TEDxPurdueU',title:'Type 2 Diabetes',time:664,stamp:'11:04–12:45; 13:51–14:20',take:'Low carb is not zero carb. Plan real food you enjoy; replace grain and potato sides with other foods.',qualification:'This 2015 talk focuses on diabetes treatment. Its patient outcomes do not predict your results or justify changing medication yourselves.'}
];
const KETO_DISHES={
 S1:{name:'Bhindi + paneer + measured chunks'},
 S2:{name:'Cauliflower + paneer + measured chunks'},
 S3:{name:'Palak paneer + measured chunks'},
 S4:{name:'Cabbage + paneer + measured chunks'},
 S5:{name:'Mushrooms + paneer + measured chunks'},
 S6:{name:'Cabbage + paneer + measured chunks'},
 S7:{name:'Cauliflower + paneer + measured chunks'},
 S8:{name:'Cauliflower + paneer + measured chunks'},
 S9:{name:'Palak paneer + measured chunks'},
 S10:{name:'Cauliflower + paneer + measured chunks'},
 S11:{name:'Cabbage + paneer + measured chunks'}
};
function ketoDish(recipe){return KETO_DISHES[recipe]||{name:'Vegetables + paneer + measured chunks'};}
function ketoSuggestion(day,person,mealKey,recipe){
 if(day.off||day.skip?.[mealKey])return {skipped:true,name:'Eating out / not planned',note:'Restaurant food also uses the day’s carb and calorie budget.'};
 if(mealKey==='e')return{skipped:false,name:'Water / unsweetened tea',note:'Milk and mixed nuts are omitted from this draft to leave room for paneer and measured chunks.'};
 if(mealKey==='b'){
  const eggs=person==='h'&&day.eggH;
  const whey=person==='h'?day.wheyH:day.wheyW;
  return {skipped:false,name:'Paneer bhurji + vegetables'+(eggs?' + eggs':''),note:(whey?'Keep whey mixed with water. ':'')+'Replace oats, poha and chillas; portions below are raw edible weights.'};
 }
 return {skipped:false,...ketoDish(recipe||day.s),note:'Replace dal and rice/roti with counted paneer and dry chunks. Lunch has a small packaged-curd portion; keep the smaller paneer share for dinner.'};
}
function ketoBefore(day,person,m){
 if(day.off||day.skip?.[m])return 'Eating out / skipped';
 if(m==='e')return day.off?'Eating out / skipped':'Milk'+(cardioDone(day,person)&&P(person).nuts?' + nuts':'');
 if(m==='b'){
  const base=day.b==='B5'?(person==='w'?'Oats':'Poha'):BREAKFASTS[day.b];
  return [base,(person==='w'?day.wheyW:day.wheyH)?'whey':null,person==='h'&&day.eggH?'2 eggs':null].filter(Boolean).join(' + ');
 }
 const lines=meal(day,m,person),ids=new Set(lines.filter(x=>x.q>0).map(x=>x.id));
 const date=mealDate(day),link=date?batchLink(date,m,person,'sabzi'):null;
 const bits=[link?batchName(link.batch):SABZIS[day.s]];
 for(const [id,name]of [['rice','rice'],['atta','roti'],['moong','moong dal'],['masoor','masoor dal'],['arhar','toor dal'],['curd','curd'],['cucumber','cucumber']])if(ids.has(id))bits.push(name);
 if(m==='d'){
  const proteinBatch=date?batchLink(date,m,person,'protein'):null;
  if(proteinBatch)bits.push(batchName(proteinBatch.batch)+' (prepared protein)');
  else if(!coveredComponent(day,m,person,'protein')&&!NO_EXTRA(day.s))bits.push(PROTEINS[day.p]);
 }
 return bits.join(' + ');
}
function ketoDayHTML(day,i){
 const persons=ketoPerson==='both'?['w','h']:[ketoPerson];
 const entries=['b','l','d','e'].map(m=>{
  const rows=persons.map(p=>{
   const link=m!=='b'&&mealDate(day)?batchLink(mealDate(day),m,p,'sabzi'):null;
   const proposal=ketoSuggestion(day,p,m,link?.batch.recipe);
   const batchNote=m!=='b'&&mealDate(day)&&['sabzi','protein'].some(c=>batchLink(mealDate(day),m,p,c));
   return `<div class="keto-meal-row"><span class="keto-person">${PERSON_NAMES[p]}</span><div><span class="keto-col-label">Current</span>${esc(ketoBefore(day,p,m))}</div><div><span class="keto-col-label">Proposed swap</span><b>${esc(proposal.name)}</b><p>${esc(proposal.note)}</p>${ketoPortionHTML(day,p,m)}${batchNote&&!proposal.skipped?'<p class="keto-batch-note">A prepared batch is assigned here. Review its actual ingredients before reusing it for keto.</p>':''}</div></div>`;
  }).join('');
  return `<div class="keto-meal"><h4>${{b:'Breakfast',l:'Lunch',d:'Dinner',e:'Evening'}[m]}</h4>${rows}</div>`;
 }).join('');
 const date=state.weekKey?fmtMon(dateForDay(i)):'';
 const skipped=day.off||day.skip?.l&&day.skip?.d;
 // Summaries come from served recipes too, including different prepared batches for each person.
 const lunchNames=persons.map(p=>{
  const m=day.skip?.l?'d':'l',link=mealDate(day)?batchLink(mealDate(day),m,p,'sabzi'):null;
  return ketoDish(link?.batch.recipe||day.s).name;
 });
 const overview=skipped?'Eating out / not planned':[...new Set(lunchNames)].join(' / ');
 return `<details class="keto-day" data-keto-day="${i}"${i===0?' open':''}><summary><span><b>${DAYS[i]}</b>${date?`<small>${date}</small>`:''}</span><span>${esc(overview)}</span></summary><div class="keto-day-body">${entries}</div></details>`;
}
function renderKeto(){
 const root=document.querySelector('#keto');if(!root)return;
 const opened=new Set([...root.querySelectorAll('[data-keto-day][open]')].map(x=>x.dataset.ketoDay));
 const hadDays=!!root.querySelector('[data-keto-day]');
 const persons=ketoPerson==='both'?['w','h']:[ketoPerson];
 const current=persons.map(comparisonTable).join('');
 root.innerHTML=`<div class="keto-heading"><div><h2 id="ketoTitle" tabindex="-1">Balanced vs Keto</h2><p>${state.weekKey?'Week of '+fmtMon(state.weekKey):'Your week template'}</p></div><div class="keto-filter" role="group" aria-label="Keto comparison for"><button data-keto-person="both" aria-pressed="${ketoPerson==='both'}">Both</button><button data-keto-person="w" aria-pressed="${ketoPerson==='w'}">Wife</button><button data-keto-person="h" aria-pressed="${ketoPerson==='h'}">Husband</button></div></div>
 <p class="keto-intro">Compare your current meals with a paneer-based keto draft. The switch changes views; saved meals and shopping stay as they are.</p>
 <div class="keto-baselines">${current}</div>
 <p class="keto-caption">Cooking oil included. Keto portions are scaled to match your current weekly calories for a fair comparison, not to recommend a new calorie target. Eating-out meals are not counted.</p>
 <details class="keto-info"><summary>How to read the numbers</summary><div><p>¹ Carbs combine packet declarations with estimated total carbohydrate from food tables. IFCT available carbs have fibre added once; packet fibre is never blindly subtracted. These are not verified net carbs.</p><p>² Sugar ranges cover undeclared sugars: known sugar is the lower bound; missing sugar is bounded above by that ingredient’s carbs. They are data-gap bounds, not statistical confidence intervals. Sugar is already inside carbs, never added twice.</p><p>³ Neither modeled recipe adds sugar; this assumes unsweetened products and spices. Drinks, sauces, snacks and restaurant meals outside this plan still count.</p><p>⁴ ≥ means a known subtotal. Undeclared fibre or saturated fat is not zero. Generic vegetables, staples and the unspecified nut mix are estimates. Legacy prepared-batch macros are estimated from saved ingredient quantities; manually edited calorie/protein labels do not also update carb/fat/sugar panels.</p><p>References: <a href="https://fdc.nal.usda.gov/download-datasets/" target="_blank" rel="noopener">USDA SR Legacy</a> · <a href="https://www.nin.res.in/ebooks/IFCT2017_16122024.pdf" target="_blank" rel="noopener">ICMR-NIN IFCT 2017</a> · matched packet audit of 4 October 2026.</p></div></details>
 <div class="keto-budget"><div><h3>Check each day’s carbs</h3><p>General ketogenic diets often restrict carbs to about 20–50 g/day. This draft does not guarantee ketosis. ${persons.map(p=>{const days=state.days.map((d,i)=>{const t=comparisonEmpty();for(const m of ['b','l','d','e'])comparisonAdd(t,comparisonSum(ketoPortionedMeal(d,p,m)));return{day:DAYS[i],hi:t.cHi};});return '<b>'+PERSON_NAMES[p]+':</b> '+days.filter(d=>d.hi>50).map(d=>d.day+' '+F(d.hi)+' g').join(', ')+(days.some(d=>d.hi>50)?' exceed the general 50 g reference.':'all modeled home-food days stay below 50 g.');}).join(' ')} <a href="${KETO_SOURCES.harvard}" target="_blank" rel="noopener">Harvard review</a></p></div><div><h3>Paneer raises saturated fat</h3><p>This no-tofu draft uses paneer across breakfast, lunch and dinner. Its saturated-fat subtotal is high; treat it as a comparison to review with a dietitian before following it. More oil or butter does not accelerate fat loss. <a href="${KETO_SOURCES.heart}" target="_blank" rel="noopener">AHA guidance</a></p></div></div>
 <div class="keto-section-head"><h3>Your week, meal by meal</h3><button data-keto-expand>Expand all days</button></div>
 <p class="keto-caption">Draft raw quantities per person, before cooking water changes the weight. Paneer is spread across meals; Nutrela/Saffola chunks are counted dry. Lunch and dinner can share one batch. Your enabled 35 g whey scoop and 2 eggs stay unchanged; other draft portions scale to match weekly calories.</p>
 <div class="keto-week">${state.days.map(ketoDayHTML).join('')}</div>
 <section class="keto-notes"><h3>Changes that apply every day</h3><dl>
 <div><dt>Milk, curd and whey</dt><dd>Replace the usual evening glass of Heritage milk with water or unsweetened tea; any milk used still counts. The current Milky Mist curd panel is used; Heritage curd needs its own label if you switch brands. Check portions of Milky Mist curd and your 35 g chocolate whey against their carb panels. Plain does not mean carb-free.</dd></div>
 <div><dt>Protein and dinner size</dt><dd>Paneer is split across breakfast, lunch and dinner, with a smaller dinner portion. Dry chunks and the enabled whey/egg options replace some protein lost by removing dal and chillas.</dd></div>
 <div><dt>Oil, butter and nuts</dt><dd>Measure cooking oil once per batch. Do not add unlimited butter, cream, cheese or “fat bombs.” Prefer unsaturated fats; nuts are optional, weighed and type-specific. <a href="${KETO_SOURCES.heart}" target="_blank" rel="noopener">AHA guidance</a></dd></div>
 <div><dt>Cooking and shopping</dt><dd>Use spinach, cauliflower, mushrooms, cabbage, bhindi and cucumber, plus paneer and measured chunks. No tofu, brinjal or lauki. Rice/atta/oats/poha/pasta/dal/beans would leave the regular keto shopping list or need tightly budgeted portions. Weigh the whole cooked batch once; divide into the selected date/meal/person boxes.</dd></div>
 </dl></section>
 <details class="keto-info"><summary>Before treating this as a ready-to-follow keto plan</summary><div>
 <p><b>Already available from the earlier packet audit:</b> the printed carb/fat values below. Check that your current packet matches. These facts now feed this comparison. Your active Balanced meal calculations are unchanged.</p>
 <div class="keto-packet-scroll"><table class="keto-packets"><thead><tr><th>Product / basis</th><th>Carbs</th><th>Fat</th><th>Fibre</th></tr></thead><tbody>${KETO_PACKETS.map(x=>`<tr><td><a href="${x.url}" target="_blank" rel="noopener">${x.name}</a><small>${x.basis}</small></td><td>${x.carbs} g</td><td>${x.fat} g</td><td>${x.fibre===null?'ND':x.fibre+' g'}</td></tr>`).join('')}</tbody></table></div>
 <p class="keto-caption">Public packet panels transcribed on 4 October 2026; your actual batch supersedes them. ND = not declared, not zero. Carbs are as printed, not a verified net-carb figure. Do not transfer dry-chunk values to cooked grams.</p>
 <p><b>What remains:</b> your actual nuts, confirmation of paneer-heavy portions and current packet panels, and whether fibre is included in each carb declaration. Do not subtract fibre twice. Milk measured in ml also needs a density estimate or an actual gram weight.</p>
 <p><b>Calories still matter for fat loss.</b> We have not reduced either person’s target. Choose sustainable calories and adequate protein with a dietitian, then calculate the proposed recipes including oil. <a href="${KETO_SOURCES.calories}" target="_blank" rel="noopener">NHS calorie guidance</a></p>
 <p>Keto can make fibre and food variety harder to maintain and does not reliably outperform less restrictive diets long term. Review suitability with a clinician/dietitian, especially with diabetes medication, kidney/liver disease, pregnancy or breastfeeding. Do not change medications, salt or potassium supplements on the basis of these videos. <a href="${KETO_SOURCES.harvard}" target="_blank" rel="noopener">Harvard</a> · <a href="${KETO_SOURCES.diabetes}" target="_blank" rel="noopener">Diabetes UK</a></p>
 <p>These are proposed vegetarian substitutions, not claims that grains or legumes are unhealthy for everyone. <a href="${KETO_SOURCES.vegetarian}" target="_blank" rel="noopener">Cleveland Clinic: vegetarian protein choices</a></p>
 </div></details>
 <details class="keto-info"><summary>Five doctor video transcripts checked</summary><div><p>Five relevant physician-led/physician-featured YouTube videos, selected for beginner advice and practical planning; not a verified global “top five” ranking. English captions retrieved and reviewed on 11 October 2026 (automatic captions may contain errors).</p>
 ${KETO_VIDEOS.map(v=>`<article class="keto-video"><h4>${esc(v.doctor)}</h4><a href="https://www.youtube.com/watch?v=${v.id}&t=${v.time}s" target="_blank" rel="noopener">${esc(v.title)}</a><small>${v.stamp}</small><p>${esc(v.take)}</p><p class="keto-caption">${esc(v.qualification)}</p></article>`).join('')}
 <p>Shared lesson applied: plan the carbohydrate replacements, count all portions and use real foods. Where advice conflicts, the draft keeps individual portion checks and cardiovascular guidance instead of treating every video as a clinical rule.</p></div></details>`;
 if(hadDays)root.querySelectorAll('[data-keto-day]').forEach(x=>x.open=opened.has(x.dataset.ketoDay));
 const allDays=[...root.querySelectorAll('[data-keto-day]')];
 if(allDays.length&&allDays.every(x=>x.open))root.querySelector('[data-keto-expand]').textContent='Collapse all days';
}
function showKetoRoute(hash){
 const keto=hash==='#keto';
 document.querySelectorAll('[data-diet]').forEach(b=>{const active=b.dataset.diet===(keto?'keto':'balanced');b.setAttribute('aria-pressed',String(active));b.classList.toggle('active',active);});
 document.querySelector('#regularPlan').hidden=keto;
 document.querySelector('#keto').hidden=!keto;
 document.querySelectorAll('.tabs a').forEach(a=>{const active=keto?a.hash==='#keto':a.hash===(hash||'#planner');a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
}
window.addEventListener('hashchange',()=>showKetoRoute(location.hash));
document.addEventListener('click',e=>{
 const diet=e.target.closest('[data-diet]');if(diet){location.hash=diet.dataset.diet==='keto'?'keto':'planner';showKetoRoute(location.hash);return;}
 const person=e.target.closest('[data-keto-person]');
 if(person){ketoPerson=person.dataset.ketoPerson;renderKeto();document.querySelector(`[data-keto-person="${ketoPerson}"]`).focus();return;}
 if(e.target.closest('[data-keto-expand]')){
  const days=[...document.querySelectorAll('[data-keto-day]')],expand=days.some(x=>!x.open);
  days.forEach(x=>x.open=expand);e.target.closest('[data-keto-expand]').textContent=expand?'Collapse all days':'Expand all days';
 }
});
