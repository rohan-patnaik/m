// One household list, independent of the planner/comparison view.
const PRODUCE_DEFAULTS={
 capsicum:{yield:.82,step:250,form:'Whole green capsicum · 82% edible estimate'},
 avocado:{yield:.7,step:100,form:'Whole avocado · 70% flesh estimate; weigh after peeling'},
 gobi:{yield:.6,step:100,form:'Whole cauliflower, trimmed'},arbi:{yield:650/750,step:250,form:'Whole arbi'},
 bhindi:{yield:.95,step:250,form:'Whole bhindi'},palak:{yield:.8,step:250,form:'Spinach bunch'},
 carrot:{yield:.9,step:250,form:'Whole carrots'},potato:{yield:.9,step:250,form:'Whole potatoes'},onion:{yield:.9,step:250,form:'Whole onions'},
 tomato:{yield:1,step:250,form:'Whole tomatoes'},mushroom:{yield:1,step:180,form:'Packaged mushrooms'},cucumber:{yield:1,step:250,form:'Cucumber with peel'},
 cabbage:{yield:.9,step:250,form:'Whole cabbage'},beans:{yield:.9,step:250,form:'Whole green beans'},corn:{yield:1,step:100,form:'Loose corn kernels, not ears'}
};
const PRODUCE_OPTION_DEFAULTS={yields:Object.fromEntries(Object.entries(PRODUCE_DEFAULTS).map(([id,x])=>[id,x.yield])),mushroomPacketSize:180};
let produceOptions=structuredClone(PRODUCE_OPTION_DEFAULTS);
function shoppingProduce(){return Object.fromEntries(Object.entries(PRODUCE_DEFAULTS).map(([id,x])=>[id,{...x,yield:produceOptions.yields[id]??x.yield,step:id==='mushroom'?produceOptions.mushroomPacketSize:x.step}]));}
function updateProduceYield(id,percent){if(!cloudReady||cloudSaving)return false;const next=structuredClone(produceOptions);next.yields[id]=Number(percent)/100;MealCloud.validateRecord('setting/produceOptions',next);produceOptions=next;save();render();return true;}
function updateMushroomPacketSize(size){if(!cloudReady||cloudSaving)return false;const next={...produceOptions,mushroomPacketSize:Number(size)};MealCloud.validateRecord('setting/produceOptions',next);produceOptions=next;save();render();return true;}
const SHOP_PACKETS={almonds:200,paneerMM:500,cashews:200,chicken:250,paneerHP:240,curdH:400,butterH:100,walnuts:200,flax:200,atta:1000,rice:1000,moong:500,masoor:500,arhar:500,besan:500,oats:500,poha:500,chana:200,rajma:500,chickpea:500,kalachana:500,pasta:500,maida:500,butter:100,paneer:500,soyN:200,soyS:200,curd:1000,milk:500,nuts:200,oil:1000};
const SHOP_NAMES={almonds:'Almonds · plain',paneerMM:'Milky Mist regular paneer',cashews:'Kaju / plain cashews',gobi:'Cauliflower',palak:'Palak / spinach',cucumber:'Cucumbers',cabbage:'Cabbage',chicken:'Chicken breast · boneless, skinless',paneerHP:'Heritage NOURISH+ high-protein paneer',curdH:'Heritage Total Curd',butterH:'Heritage table butter',walnuts:'Walnuts',flax:'Ground flaxseed',atta:'Pillsbury Chakki Fresh atta',oats:'Saffola plain oats',moong:'Tata moong dal',masoor:'Tata masoor dal',arhar:'Tata Sampann toor dal',paneer:'Heritage regular paneer',soyN:'Nutrela soya chunks',soyS:'Saffola soya chunks',pasta:'Borges durum wheat pasta',butter:'Amul salted butter',curd:'Milky Mist curd',milk:'Heritage green milk',oil:'Tata mustard oil',whey:'ATOM Isolate · Double Rich Chocolate',spice:'Spices (recipe estimate)'};
function householdShopping(){
 const quantities={...ledger()};if(quantities.eggWhite){quantities.egg=(quantities.egg||0)+quantities.eggWhite;delete quantities.eggWhite;}const produce=shoppingProduce(),market=[],supermarket=[];
 for(const [id,needed]of Object.entries(quantities)){
  if(!(needed>1e-8))continue;
  const row={id,name:SHOP_NAMES[id]||DB[id]?.[0]||id,needed,unit:DB[id]?.[3]||'g'};
  if(produce[id]){
   const {yield:y,step,form}=produce[id];row.yield=y;row.form=form;row.buy=Math.ceil((needed/y-1e-8)/step)*step;
   if(id==='mushroom'){row.size=step;row.packs=Math.ceil((needed/y-1e-8)/step);row.buy=row.packs*step;}
   row.leftover=row.buy*y-needed;market.push(row);
  }else{
   const size=SHOP_PACKETS[id];
   if(size){row.size=size;row.packs=Math.ceil((needed-1e-8)/size);row.buy=row.packs*size;row.leftover=row.buy-needed;}
   else if(id==='egg'){row.buy=Math.ceil(needed-1e-8);row.leftover=row.buy-needed;}
   else if(id==='whey'){row.buy=needed*35;}
   else row.buy=needed;
   if(id==='chicken'){row.largePacks=Math.ceil((needed-1e-8)/500);row.largeLeftover=row.largePacks*500-needed;}
   supermarket.push(row);
  }
 }
 for(const rows of [market,supermarket])rows.sort((a,b)=>a.name.localeCompare(b.name));
 return {market,supermarket};
}
function shoppingChecked(row){const r=typeof activityRecords==='object'?activityRecords[`buy/${state.weekKey||mondayOf(dayViewISO())}/${row.id}`]:null;return !!r?.checked&&typeof r.needed==='number'&&typeof r.buy==='number'&&r.needed+1e-8>=row.needed&&r.buy+1e-8>=row.buy;}
function shoppingPurchaseRecord(id,checked){const list=householdShopping(),row=[...list.market,...list.supermarket].find(x=>x.id===id);if(!row)throw Error('Shopping item changed; reopen the list');return {checked,updatedAt:Date.now(),needed:row.needed,buy:row.buy};}
function shoppingQuantity(q,unit='g'){
 if(unit==='egg')return `${F(q)} eggs`;
 if(unit==='serving')return `${F(q)} scoops (${F(q*35)} g powder)`;
 return unit==='g'&&q>=1000?`${+q.toFixed(1)/1000} kg`:unit==='ml'&&q>=1000?`${+q.toFixed(1)/1000} L`:`${F(q)} ${unit}`;
}
function shoppingBuy(row){
 if(row.id==='gobi')return `About ${shoppingQuantity(row.buy)} whole`;
 if(row.id==='mushroom')return row.packs&&row.size?`${row.packs} × ${shoppingQuantity(row.size)}<small>${shoppingQuantity(row.buy)} in packets</small>`:`${shoppingQuantity(row.buy)}<small>in packets</small>`;
 if(row.id==='whey')return shoppingQuantity(row.buy)+' powder';
 if(row.id==='chicken')return `${row.packs} × 250 g or ${row.largePacks} × 500 g${row.largeLeftover>1e-8?`<small>${shoppingQuantity(row.largeLeftover)} left with 500 g packs</small>`:''}`;
 if(row.id==='egg')return shoppingQuantity(row.buy,row.unit)+'<small class="ux-buy-note">Whole eggs plus any extra eggs bought only for their whites; those yolks go unused</small>';
 if(row.packs)return `${row.packs} × ${shoppingQuantity(row.size,row.unit)}`;
 return shoppingQuantity(row.buy,row.unit);
}
// Display-only labels and buying forms; quantities come from householdShopping().
const SHOP_LABELS={paneerMM:'Milky Mist paneer · 500 g',cashews:'Cashews · plain'};
const SHOP_FORMS={gobi:'Whole head',cabbage:'Whole head',palak:'Bunch',corn:'Loose kernels',mushroom:'Packaged',arbi:'Whole roots',bhindi:'Loose pods',carrot:'Loose',potato:'Loose',onion:'Loose',tomato:'Loose',cucumber:'Whole',beans:'Loose'};
const SHOP_YIELD_NAMES={avocado:'Avocado',gobi:'Cauliflower',arbi:'Arbi',bhindi:'Bhindi',palak:'Palak / spinach',carrot:'Carrot',potato:'Potato',onion:'Onion',tomato:'Tomato',mushroom:'Mushrooms',cucumber:'Cucumber',cabbage:'Cabbage',beans:'Beans',corn:'Sweetcorn'};
function shoppingYields(){const produce=shoppingProduce(),saved=typeof produceOptions!=='undefined'?produceOptions?.yields:null;return Object.fromEntries(Object.keys(SHOP_YIELD_NAMES).map(id=>[id,{yield:saved?.[id]??produce[id]?.yield,form:produce[id]?.form||SHOP_FORMS[id]}]));}
function shoppingForm(row,yields){const y=row.yield??yields[row.id]?.yield,form=row.form||yields[row.id]?.form;return [form,typeof y==='number'?`${F(y*100)}% usable`:null].filter(Boolean).join(' · ');}
function shoppingAssumptionsHTML(){
 const yields=shoppingYields(),editable=typeof updateProduceYield==='function',size=typeof produceOptions!=='undefined'&&produceOptions?.mushroomPacketSize||180;
 return `<details class="ux-disclosure ux-buying" data-shopping-assumptions><summary>Buying assumptions</summary><div><p class="ux-note">Edible yield only changes how much to buy. Recipe grams, calories and nutrition always use the trimmed edible weight. Already trimmed or prepped? Buy the Need amount.</p><div class="ux-yield-grid">${Object.entries(yields).map(([id,x])=>`<label><span>${esc(SHOP_YIELD_NAMES[id])}<small>${esc(x.form||'')}</small></span><span class="ux-yield-input"><input type="number" min="1" max="100" step="0.1" inputmode="decimal" value="${typeof x.yield==='number'?F(x.yield*100):''}" data-ux-yield="${id}" aria-label="${esc(SHOP_YIELD_NAMES[id])} edible yield percent"${editable?'':' disabled'}>%</span></label>`).join('')}<label><span>Mushroom packet<small>Packaged</small></span><select data-ux-mushroom-size aria-label="Mushroom packet size"${typeof updateMushroomPacketSize==='function'?'':' disabled'}>${[180,200].map(g=>`<option value="${g}"${size===g?' selected':''}>${g} g</option>`).join('')}</select></label></div></div></details>`;
}
function shoppingTable(rows,market){
 const yields=market?shoppingYields():{};
 if(!rows.length)return '<p class="hintline">Nothing needed for the planned home meals.</p>';
 return `<table class="shopping-table"><thead><tr><th scope="col" class="ux-buy-check"><span class="sr-only">Bought</span></th><th scope="col">Item</th><th scope="col" class="num">Buy</th></tr></thead><tbody>${rows.map(row=>{const stored=typeof activityRecords==='object'&&activityRecords[`buy/${state.weekKey||mondayOf(dayViewISO())}/${row.id}`],checked=typeof shoppingChecked==='function'?shoppingChecked(row):!!stored?.checked,recheck=!!stored?.checked&&!checked;return `<tr data-shopping-item="${row.id}" class="${checked?'ux-bought':''}"${checked&&typeof uxHideBought!=='undefined'&&uxHideBought?' hidden':''}><td class="ux-buy-check"><input type="checkbox" data-ux-buy="${row.id}" aria-label="${esc(typeof uxDisplayText==='function'?uxDisplayText(row.name):row.name)} bought"${checked?' checked':''}></td><th scope="row">${esc(typeof uxDisplayText==='function'?uxDisplayText(SHOP_LABELS[row.id]||row.name):SHOP_LABELS[row.id]||row.name)}${recheck?'<small class="ux-recheck">quantity changed — re-check</small>':''}${market&&shoppingForm(row,yields)?`<small class="ux-buy-form">${esc(shoppingForm(row,yields))}</small>`:''}</th><td class="num" data-shopping-buy data-raw-need="${shoppingQuantity(row.needed,row.unit)} needed"><strong>${shoppingBuy(row)}</strong><small class="ux-shop-need" data-shopping-need>recipes use ${shoppingQuantity(row.needed,row.unit)}${market?' (trimmed)':''}</small></td></tr>`;}).join('')}</tbody></table>`;
}
function renderShopping(){
 const root=document.querySelector('#shopping');if(!root)return;
 const list=householdShopping(),open=new Set([...(root.querySelectorAll?.('details[open]')||[])].map(x=>x.querySelector('summary')?.textContent));
 root.innerHTML=`<div class="shophead"><div><h2>Shopping list</h2><p>${state.weekKey?`For the week of ${fmtMon(state.weekKey)} – ${fmtMon(addDate(state.weekKey,6))}`:'For your weekly template (no saved week) · 7 days'} · Both people</p></div></div><div class="ux-shop-tools"><div class="shopping-diets">${['w','h'].map(p=>`<span>${PERSON_NAMES[p]} <b>${isKeto(p)?'Keto':'Balanced'}</b></span>`).join('')}</div><label class="ux-checkbox"><input type="checkbox" data-ux-hide-bought${typeof uxHideBought!=='undefined'&&uxHideBought?' checked':''}> Hide bought</label></div>
 <div class="shopping-groups"><section aria-labelledby="marketHeading"><h3 id="marketHeading">Farmers’ market</h3>${shoppingTable(list.market,true)}</section><section aria-labelledby="supermarketHeading"><h3 id="supermarketHeading">Supermarket <small>DMart / Walmart</small></h3><p class="ux-note">Check what is already at home.</p>${shoppingTable(list.supermarket,false)}</section></div>
 ${shoppingAssumptionsHTML()}
 <details class="ux-disclosure"><summary>Buying estimates</summary><p>Buy assumes no stock at home. Whole vegetables allow for the edible yield in Buying assumptions; packets are rounded up. Chicken is bought uncooked, whey uses your 35 g scoop, cooking oil and prepared batches are counted once. Salt, fresh herbs, ginger and garlic aren’t separately quantified.</p></details>`;
 if(open.size)root.querySelectorAll('details').forEach(x=>{x.open=open.has(x.querySelector('summary')?.textContent);});
}
document.addEventListener('change',async e=>{const t=e.target;if(t.hasAttribute('data-ux-hide-bought')){uxHideBought=t.checked;renderShopping();}if(t.hasAttribute('data-ux-buy')&&cloudReady&&!cloudSaving){const key=`buy/${state.weekKey||mondayOf(dayViewISO())}/${t.dataset.uxBuy}`;t.disabled=true;await uxSaveActivity(key,typeof shoppingPurchaseRecord==='function'?shoppingPurchaseRecord(t.dataset.uxBuy,t.checked):{checked:t.checked,updatedAt:Date.now()});}});
