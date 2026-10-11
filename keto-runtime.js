// A derived comparison only. No plan, shopping, batch or cloud records are written here.
let ketoPerson='both';
const KETO_SOURCES={
 harvard:'https://nutritionsource.hsph.harvard.edu/healthy-weight/diet-reviews/ketogenic-diet/',
 heart:'https://newsroom.heart.org/news/10-popular-diets-scored-for-heart-healthy-elements-some-need-improvement',
 diabetes:'https://www.diabetes.org.uk/living-with-diabetes/eating/meal-plans/low-carb',
 calories:'https://www.nhs.uk/better-health/lose-weight/calorie-counting/',
 vegetarian:'https://health.clevelandclinic.org/im-a-vegetarian-why-cant-i-lose-weight'
};
const KETO_VIDEOS=[
 {id:'p5N7x8TQrt8',doctor:'Ken Berry, MD',title:'7 Steps to Starting the Keto Diet',time:62,stamp:'1:02–3:20; 6:17–7:00',take:'Reduce sugar and grains; build meals around ordinary whole foods.',qualification:'The blanket claims about grain inflammation and seed oils, and the salt/supplement advice, are not adopted.'},
 {id:'RM354ysZ5xM',doctor:'Eric Westman, MD',title:'Avoid These Keto Foods',time:199,stamp:'3:19–5:18; 7:55–9:18',take:'Keto drinks, MCT coffee and special keto products are unnecessary. Cheese, cream, oil and vegetables still need portions.',qualification:'His prescription-strength approach excludes nuts. Other doctors allow them; the preview treats nuts as optional, weighed and counted.'},
 {id:'gg6uTQ0EC_Q',doctor:'Annette Bosworth, MD (Dr. Boz)',title:'How to Begin Keto',time:84,stamp:'1:24–3:32; 4:01–5:11',take:'A gradual transition can start with drinks, then starches, plus planning and household support.',qualification:'Her no-calorie-drinks rule is a transition tactic, not a reason to automatically discard your whey. Check its actual carb panel.'},
 {id:'zrRDnLJdjmQ',doctor:'Andreas Eenfeldt, MD · Diet Doctor',title:'A Keto Diet for Beginners',time:136,stamp:'2:16–2:37; 6:11–6:25',take:'Replace grain/starch staples with protein, vegetables and fats; vegetarian plans are possible.',qualification:'The claims about effortless weight loss and not needing calorie counts are not promises. Your oil and portion calories still count.'},
 {id:'da1vvigy5tQ',doctor:'Sarah Hallberg, DO · TEDxPurdueU',title:'Type 2 Diabetes',time:664,stamp:'11:04–12:45; 13:51–14:20',take:'Low carb is not zero carb. Plan real food you enjoy; replace grain and potato sides with other foods.',qualification:'This 2015 talk focuses on diabetes treatment. Its patient outcomes do not predict your results or justify changing medication yourselves.'}
];
const KETO_DISHES={
 S1:{name:'Bhindi + tofu',note:'Keep bhindi; add a protein portion in place of dal. Count onion and gravy too.'},
 S2:{name:'Gobi + green beans + tofu',note:'Remove potato; reduce carrot if needed for the carb budget. Keep gobi.'},
 S3:{name:'Palak paneer or palak tofu',note:'Keep spinach and a measured protein portion. Avoid flour-thickened gravy; no automatic extra paneer.'},
 S4:{name:'Lauki + tofu',note:'Replace arbi with lauki or cabbage, plus a protein portion.'},
 S5:{name:'Mushrooms + tofu',note:'Keep mushrooms; add a protein portion in place of dal.'},
 S6:{name:'Cabbage + tofu',note:'Replace the usual dry rajma portion; its carbs need counting even after cooking.'},
 S7:{name:'Gobi + tofu',note:'Replace the usual dry chana portion; retain the masala flavour with measured gravy.'},
 S8:{name:'Tofu + capsicum',note:'Tofu is the draft replacement. Nutrela/Saffola chunks may fit in a measured portion only after checking that brand’s carb and fibre panel.'},
 S9:{name:'Palak + tofu',note:'Replace the usual kala chana portion; add a measured protein source.'},
 S10:{name:'Zucchini + mushrooms + tofu',note:'Replace pasta and maida sauce with a sauté. Butter and dairy still need counting.'},
 S11:{name:'Green beans + gobi + tofu',note:'Remove potato; reduce carrot if needed. Add protein in place of dal.'}
};
function ketoDish(recipe){return KETO_DISHES[recipe]||{name:'Vegetables + measured protein',note:'Review the recipe ingredients and carbohydrate portions.'};}
function ketoSuggestion(day,person,mealKey,recipe){
 if(day.off||day.skip?.[mealKey])return {skipped:true,name:'Eating out / not planned',note:'No home meal proposed. Restaurant food also uses the day’s carb and calorie budget.'};
 if(mealKey==='b'){
  const eggs=person==='h'&&day.eggH;
  const whey=person==='h'?day.wheyH:day.wheyW;
  return {skipped:false,name:eggs?'Your eggs + sautéed vegetables':'Tofu bhurji + vegetables',note:(whey?'Keep your whey option, mixed with water; count its carbs. ':'')+'Replace oats, poha and besan/moong chillas. Protein portions need recalculating.'};
 }
 const dish=ketoDish(recipe||day.s);
 return {skipped:false,...dish,note:dish.note+' Replace the usual dal and rice/roti sides; include cucumber/salad. Paneer can substitute for tofu if its portion fits.'};
}
function ketoBefore(day,person,m){
 if(day.off||day.skip?.[m])return 'Eating out / skipped';
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
 const entries=['b','l','d'].map(m=>{
  const rows=persons.map(p=>{
   const link=m!=='b'&&mealDate(day)?batchLink(mealDate(day),m,p,'sabzi'):null;
   const proposal=ketoSuggestion(day,p,m,link?.batch.recipe);
   const batchNote=m!=='b'&&mealDate(day)&&['sabzi','protein'].some(c=>batchLink(mealDate(day),m,p,c));
   return `<div class="keto-meal-row"><span class="keto-person">${PERSON_NAMES[p]}</span><div><span class="keto-col-label">Current</span>${esc(ketoBefore(day,p,m))}</div><div><span class="keto-col-label">Proposed swap</span><b>${esc(proposal.name)}</b><p>${esc(proposal.note)}</p>${batchNote&&!proposal.skipped?'<p class="keto-batch-note">A prepared batch is assigned here. Review its actual ingredients before reusing it for keto.</p>':''}</div></div>`;
  }).join('');
  return `<div class="keto-meal"><h4>${{b:'Breakfast',l:'Lunch',d:'Dinner'}[m]}</h4>${rows}</div>`;
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
 const current=persons.map(p=>{
  const avg=state.days.reduce((a,_,i)=>{const t=daily(i,p).total;return{k:a.k+t.k/7,p:a.p+t.p/7};},{k:0,p:0});
  const mode={easy:'Low',medium:'Medium',hard:'High'}[personMode(p)];
  return `<div class="keto-baseline"><h3>${PERSON_NAMES[p]} <span>${mode} plan</span></h3><p><b>${R(avg.k)} kcal</b> · ${R(avg.p)} g protein/day</p><p>${p==='w'?'Vegetarian preview. Tofu offers an alternative to increasing your evening paneer portion.':'Eggs appear only on days where your existing egg option is on. Other meals stay vegetarian.'}</p></div>`;
 }).join('');
 root.innerHTML=`<div class="keto-heading"><div><h2 id="ketoTitle" tabindex="-1">What would keto change?</h2><p>${state.weekKey?'Week of '+fmtMon(state.weekKey):'Your week template'}</p></div><div class="keto-filter" role="group" aria-label="Keto comparison for"><button data-keto-person="both" aria-pressed="${ketoPerson==='both'}">Both</button><button data-keto-person="w" aria-pressed="${ketoPerson==='w'}">Wife</button><button data-keto-person="h" aria-pressed="${ketoPerson==='h'}">Husband</button></div></div>
 <p class="keto-intro">A proposed menu to compare with your current meals. Your saved meals, shopping and prepared portions stay as they are.</p>
 <div class="keto-baselines">${current}</div>
 <p class="keto-caption">Current home-food estimates, cooking oil included, averaged over 7 days. Eating-out meals contribute zero here, not zero to your actual intake.</p>
 <div class="keto-budget"><div><h3>Carbs become a daily budget</h3><p>Ketogenic diets often restrict <b>total carbs to about 20–50 g/day per person</b>. This is general context, not a personal target or a guarantee of ketosis. <a href="${KETO_SOURCES.harvard}" target="_blank" rel="noopener">Harvard diet review</a></p></div><div><h3>Keto totals: not calculated yet</h3><p>The planner tracks calories, protein and some fibre, but not carbs or fat. These swaps need measured portions and carb panels before we can verify a full keto week.</p></div></div>
 <div class="keto-section-head"><h3>Your week, meal by meal</h3><button data-keto-expand>Expand all days</button></div>
 <p class="keto-caption">Draft combinations, not gram-for-gram replacements. Tofu is a new option to confirm; it is not Nutrela/Saffola chunks. Lunch and dinner may use one shared cooked batch.</p>
 <div class="keto-week">${state.days.map(ketoDayHTML).join('')}</div>
 <section class="keto-notes"><h3>Changes that apply every day</h3><dl>
 <div><dt>Milk, curd and whey</dt><dd>Replace the usual evening glass of Heritage milk with water or unsweetened tea; any milk used still counts. Check portions of Milky Mist curd and your 35 g chocolate whey against their carb panels. Plain does not mean carb-free.</dd></div>
 <div><dt>Protein and dinner size</dt><dd>Removing dal/chillas also removes protein. Recalculate a replacement rather than just deleting those foods. Your wife can split protein across meals instead of adding a large paneer portion at night.</dd></div>
 <div><dt>Oil, butter and nuts</dt><dd>Measure cooking oil once per batch. Do not add unlimited butter, cream, cheese or “fat bombs.” Prefer unsaturated fats; nuts are optional, weighed and type-specific. <a href="${KETO_SOURCES.heart}" target="_blank" rel="noopener">AHA guidance</a></dd></div>
 <div><dt>Cooking and shopping</dt><dd>Use more leafy greens, gobi, mushrooms, cabbage and cucumber, plus the chosen protein. Rice/atta/oats/poha/pasta/dal/beans would leave the regular keto shopping list or need tightly budgeted portions. Weigh the whole cooked batch once; divide into the selected date/meal/person boxes.</dd></div>
 </dl></section>
 <details class="keto-info"><summary>Before treating this as a ready-to-follow keto plan</summary><div>
 <p><b>Labels still needed for keto calculations:</b> total carbohydrate, fibre, fat and serving size for Heritage paneer/milk, Milky Mist curd, ATOM Double Rich Chocolate whey, each chunk brand, the chosen tofu, and the actual nuts/seeds. Confirm the label’s carbohydrate definition before subtracting fibre; avoid subtracting it twice.</p>
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
 document.querySelector('#regularPlan').hidden=keto;
 document.querySelector('#keto').hidden=!keto;
 document.querySelectorAll('.tabs a').forEach(a=>{const active=keto?a.hash==='#keto':a.hash===(hash||'#planner');a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
}
window.addEventListener('hashchange',()=>showKetoRoute(location.hash));
document.addEventListener('click',e=>{
 const person=e.target.closest('[data-keto-person]');
 if(person){ketoPerson=person.dataset.ketoPerson;renderKeto();document.querySelector(`[data-keto-person="${ketoPerson}"]`).focus();return;}
 if(e.target.closest('[data-keto-expand]')){
  const days=[...document.querySelectorAll('[data-keto-day]')],expand=days.some(x=>!x.open);
  days.forEach(x=>x.open=expand);e.target.closest('[data-keto-expand]').textContent=expand?'Collapse all days':'Expand all days';
 }
});
