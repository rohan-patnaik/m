// One household list, independent of the planner/comparison view.
function shoppingProduce(){return {
 gobi:{yield:YIELDS.gobi/300,step:300},arbi:{yield:YIELDS.arbi/750,step:250},
 bhindi:{yield:YIELDS.bhindi/500,step:250},palak:{yield:YIELDS.palak/500,step:250},
 carrot:{yield:.9,step:250},potato:{yield:.9,step:250},onion:{yield:.9,step:250},
 tomato:{yield:1,step:250},mushroom:{yield:1,step:200},cucumber:{yield:1,step:250},
 cabbage:{yield:.9,step:250},beans:{yield:.9,step:250}
};}
const SHOP_PACKETS={chicken:250,paneerHP:240,curdH:400,butterH:100,walnuts:200,flax:200,atta:1000,rice:1000,moong:500,masoor:500,arhar:500,besan:500,oats:500,poha:500,chana:200,rajma:500,chickpea:500,kalachana:500,pasta:500,maida:500,butter:100,paneer:500,soyN:200,soyS:200,curd:1000,milk:500,nuts:200,oil:1000};
const SHOP_NAMES={gobi:'Cauliflower',palak:'Palak / spinach',cucumber:'Cucumbers',cabbage:'Cabbage',chicken:'Chicken breast · raw boneless, skinless',paneerHP:'Heritage NOURISH+ high-protein paneer',curdH:'Heritage Total Curd',butterH:'Heritage table butter',walnuts:'Walnuts',flax:'Ground flaxseed',atta:'Pillsbury Chakki Fresh atta',oats:'Saffola plain oats',moong:'Tata moong dal',masoor:'Tata masoor dal',arhar:'Tata Sampann toor dal',paneer:'Heritage regular paneer',soyN:'Nutrela soya chunks',soyS:'Saffola soya chunks',pasta:'Borges durum wheat pasta',butter:'Amul salted butter',curd:'Milky Mist curd',milk:'Heritage green milk',oil:'Tata mustard oil',whey:'ATOM Isolate · Double Rich Chocolate',spice:'Spices (recipe estimate)'};
function householdShopping(){
 const quantities=ledger(),produce=shoppingProduce(),market=[],supermarket=[];
 for(const [id,needed]of Object.entries(quantities)){
  if(!(needed>1e-8))continue;
  const row={id,name:SHOP_NAMES[id]||DB[id]?.[0]||id,needed,unit:DB[id]?.[3]||'g'};
  if(produce[id]){
   const {yield:y,step}=produce[id];row.buy=Math.ceil((needed/y-1e-8)/step)*step;market.push(row);
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
 if(row.id==='whey')return shoppingQuantity(row.buy)+' powder';
 if(row.id==='chicken')return `${row.packs} × 250 g or ${row.largePacks} × 500 g${row.largeLeftover>1e-8?`<small>${shoppingQuantity(row.largeLeftover)} left with 500 g packs</small>`:''}`;
 if(row.packs)return `${row.packs} × ${shoppingQuantity(row.size,row.unit)}`;
 return shoppingQuantity(row.buy,row.unit);
}
function shoppingTable(rows,market){
 if(!rows.length)return '<p class="hintline">Nothing needed for the planned home meals.</p>';
 return `<table class="shopping-table"><thead><tr><th scope="col">Item</th><th scope="col" class="num">${market?'Raw edible need':'Weekly need'}</th><th scope="col" class="num">Buy</th></tr></thead><tbody>${rows.map(row=>`<tr data-shopping-item="${row.id}"><th scope="row">${esc(row.name)}</th><td class="num" data-shopping-need>${shoppingQuantity(row.needed,row.unit)}</td><td class="num" data-shopping-buy><strong>${shoppingBuy(row)}</strong></td></tr>`).join('')}</tbody></table>`;
}
function renderShopping(){
 const root=document.querySelector('#shopping');if(!root)return;
 const list=householdShopping();
 root.innerHTML=`<div class="shophead"><div><h2>Shopping list</h2><p>${state.weekKey?`${fmtMon(state.weekKey)} – ${fmtMon(addDate(state.weekKey,6))}`:'Weekly template · 7 days'}</p></div><div class="shopping-diets">${['w','h'].map(p=>`<span>${PERSON_NAMES[p]}: <b>${isKeto(p)?'Strict keto':'Balanced'}</b></span>`).join('')}</div></div>
 <p class="shopping-note">For both people’s assigned meals. Buy assumes no stock at home; quantities update with meal and portion edits.</p>
 <div class="shopping-groups"><section aria-labelledby="marketHeading"><h3 id="marketHeading">Farmers’ market</h3><p class="hintline">Buy weights allow for estimated trimming and rounding.</p>${shoppingTable(list.market,true)}</section><section aria-labelledby="supermarketHeading"><h3 id="supermarketHeading">Supermarket / DMart / Walmart</h3><p class="hintline">Dry staples, dairy, protein and pantry items. Packet sizes are buying estimates.</p>${shoppingTable(list.supermarket,false)}</section></div>
 <p class="shopping-note">Cooking oil and prepared batches are counted once. Whey uses your 35 g scoop; chicken weights are raw. Salt, fresh herbs, ginger and garlic aren’t separately quantified in the recipes.</p>`;
}
