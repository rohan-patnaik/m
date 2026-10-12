// One household list, independent of the planner/comparison view.
const PRODUCE_DEFAULTS={
 gobi:{yield:.6,step:100,form:'Whole cauliflower, trimmed'},arbi:{yield:650/750,step:250,form:'Whole arbi'},
 bhindi:{yield:.95,step:250,form:'Whole bhindi'},palak:{yield:.8,step:250,form:'Spinach bunch'},
 carrot:{yield:.9,step:250,form:'Whole carrots'},potato:{yield:.9,step:250,form:'Whole potatoes'},onion:{yield:.9,step:250,form:'Whole onions'},
 tomato:{yield:1,step:250,form:'Whole tomatoes'},mushroom:{yield:1,step:180,form:'Packaged mushrooms'},cucumber:{yield:1,step:250,form:'Cucumber with peel'},
 cabbage:{yield:.9,step:250,form:'Whole cabbage'},beans:{yield:.9,step:250,form:'Whole green beans'},corn:{yield:1,step:100,form:'Loose corn kernels, not ears'}
};
const PRODUCE_OPTION_DEFAULTS={yields:Object.fromEntries(Object.entries(PRODUCE_DEFAULTS).map(([id,x])=>[id,x.yield])),mushroomPacketSize:180};
let produceOptions=structuredClone(PRODUCE_OPTION_DEFAULTS);
function shoppingProduce(){return Object.fromEntries(Object.entries(PRODUCE_DEFAULTS).map(([id,x])=>[id,{...x,yield:produceOptions.yields[id],step:id==='mushroom'?produceOptions.mushroomPacketSize:x.step}]));}
function updateProduceYield(id,percent){if(!cloudReady||cloudSaving)return false;const next=structuredClone(produceOptions);next.yields[id]=Number(percent)/100;MealCloud.validateRecord('setting/produceOptions',next);produceOptions=next;save();render();return true;}
function updateMushroomPacketSize(size){if(!cloudReady||cloudSaving)return false;const next={...produceOptions,mushroomPacketSize:Number(size)};MealCloud.validateRecord('setting/produceOptions',next);produceOptions=next;save();render();return true;}
const SHOP_PACKETS={paneerMM:500,cashews:200,chicken:250,paneerHP:240,curdH:400,butterH:100,walnuts:200,flax:200,atta:1000,rice:1000,moong:500,masoor:500,arhar:500,besan:500,oats:500,poha:500,chana:200,rajma:500,chickpea:500,kalachana:500,pasta:500,maida:500,butter:100,paneer:500,soyN:200,soyS:200,curd:1000,milk:500,nuts:200,oil:1000};
const SHOP_NAMES={paneerMM:'Milky Mist regular paneer',cashews:'Kaju / plain cashews',gobi:'Cauliflower',palak:'Palak / spinach',cucumber:'Cucumbers',cabbage:'Cabbage',chicken:'Chicken breast · raw boneless, skinless',paneerHP:'Heritage NOURISH+ high-protein paneer',curdH:'Heritage Total Curd',butterH:'Heritage table butter',walnuts:'Walnuts',flax:'Ground flaxseed',atta:'Pillsbury Chakki Fresh atta',oats:'Saffola plain oats',moong:'Tata moong dal',masoor:'Tata masoor dal',arhar:'Tata Sampann toor dal',paneer:'Heritage regular paneer',soyN:'Nutrela soya chunks',soyS:'Saffola soya chunks',pasta:'Borges durum wheat pasta',butter:'Amul salted butter',curd:'Milky Mist curd',milk:'Heritage green milk',oil:'Tata mustard oil',whey:'ATOM Isolate · Double Rich Chocolate',spice:'Spices (recipe estimate)'};
function householdShopping(){
 const quantities=ledger(),produce=shoppingProduce(),market=[],supermarket=[];
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
function shoppingQuantity(q,unit='g'){
 if(unit==='egg')return `${F(q)} eggs`;
 if(unit==='serving')return `${F(q)} scoops (${F(q*35)} g powder)`;
 return unit==='g'&&q>=1000?`${+q.toFixed(1)/1000} kg`:unit==='ml'&&q>=1000?`${+q.toFixed(1)/1000} L`:`${F(q)} ${unit}`;
}
function shoppingBuy(row){
 if(row.id==='gobi')return `About ${shoppingQuantity(row.buy)} whole`;
 if(row.id==='mushroom')return `${Math.ceil(row.needed/180)} packets<small>180–200 g per packet</small>`;
 if(row.id==='whey')return shoppingQuantity(row.buy)+' powder';
 if(row.id==='chicken')return `${row.packs} × 250 g or ${row.largePacks} × 500 g${row.largeLeftover>1e-8?`<small>${shoppingQuantity(row.largeLeftover)} left with 500 g packs</small>`:''}`;
 if(row.packs)return `${row.packs} × ${shoppingQuantity(row.size,row.unit)}`;
 return shoppingQuantity(row.buy,row.unit);
}
function shoppingTable(rows,market){
 if(!rows.length)return '<p class="hintline">Nothing needed for the planned home meals.</p>';
 return `<table class="shopping-table"><thead><tr><th scope="col" class="ux-buy-check"><span class="sr-only">Bought</span></th><th scope="col">Item</th><th scope="col" class="num">${market?'Need (trimmed)':'Need'}</th><th scope="col" class="num">Buy</th></tr></thead><tbody>${rows.map(row=>{const checked=typeof activityRecords==='object'&&activityRecords[`buy/${state.weekKey||mondayOf(dayViewISO())}/${row.id}`]?.checked;return `<tr data-shopping-item="${row.id}" class="${checked?'ux-bought':''}"${checked&&typeof uxHideBought!=='undefined'&&uxHideBought?' hidden':''}><td class="ux-buy-check"><input type="checkbox" data-ux-buy="${row.id}" aria-label="${esc(row.name)} bought"${checked?' checked':''}></td><th scope="row">${esc(row.name)}${row.id==='gobi'?'<details class="ux-buy-note"><summary>Whole or trimmed?</summary><p>Need is trimmed raw food. Buy assumes 60% usable after leaves/stalk; actual yield varies. Already trimmed: about '+shoppingQuantity(Math.ceil(row.needed/100)*100)+'.</p></details>':''}</th><td class="num" data-shopping-need>${shoppingQuantity(row.needed,row.unit)}</td><td class="num" data-shopping-buy data-raw-need="${shoppingQuantity(row.needed,row.unit)} needed"><strong>${shoppingBuy(row)}</strong></td></tr>`;}).join('')}</tbody></table>`;
}
function renderShopping(){
 const root=document.querySelector('#shopping');if(!root)return;
 const list=householdShopping();
 root.innerHTML=`<div class="shophead"><div><h2>Shopping list</h2><p>${state.weekKey?`${fmtMon(state.weekKey)} – ${fmtMon(addDate(state.weekKey,6))}`:'Weekly template · 7 days'} · Both people</p></div></div><div class="ux-shop-tools"><div class="shopping-diets">${['w','h'].map(p=>`<span>${PERSON_NAMES[p]} <b>${isKeto(p)?'Keto draft':'Balanced'}</b></span>`).join('')}</div><label class="ux-checkbox"><input type="checkbox" data-ux-hide-bought${typeof uxHideBought!=='undefined'&&uxHideBought?' checked':''}> Hide bought</label></div>
 <div class="shopping-groups"><section aria-labelledby="marketHeading"><h3 id="marketHeading">Farmers’ market</h3>${shoppingTable(list.market,true)}</section><section aria-labelledby="supermarketHeading"><h3 id="supermarketHeading">Supermarket <small>DMart / Walmart</small></h3><p class="ux-note">Check what is already at home.</p>${shoppingTable(list.supermarket,false)}</section></div>
 <details class="ux-disclosure"><summary>Buying estimates</summary><p>Buy assumes no stock at home. Whole vegetables allow for estimated trimming; packets are rounded up. Chicken is raw, whey uses your 35 g scoop, cooking oil and prepared batches are counted once. Salt, fresh herbs, ginger and garlic aren’t separately quantified.</p></details>`;
}
document.addEventListener('change',async e=>{const t=e.target;if(t.hasAttribute('data-ux-hide-bought')){uxHideBought=t.checked;renderShopping();}if(t.hasAttribute('data-ux-buy')&&cloudReady&&!cloudSaving){const key=`buy/${state.weekKey||mondayOf(dayViewISO())}/${t.dataset.uxBuy}`;t.disabled=true;await uxSaveActivity(key,{checked:t.checked,updatedAt:Date.now()});}});
