// Comparison profiles only. Original recipe calories/protein are retained.
// USDA carbohydrate includes fibre; IFCT available carbohydrate has fibre added once.
// Packet carbohydrate is as declared: no unverified net-carb subtraction.
const COMPARE_NUTRIENTS={
 "onion":{"source":"USDA SR Legacy (generic estimate)","fdc":170000,"basis":"100 g raw edible","s":4.24,"f":0.1,"c":9.34,"k":40.0,"sat":0.042,"p":1.1,"fb":1.7,"name":"Onions, raw"},
 "tomato":{"source":"USDA SR Legacy (generic estimate)","fdc":170457,"basis":"100 g raw edible","s":2.63,"c":3.89,"k":18.0,"sat":0.028,"f":0.2,"fb":1.2,"p":0.88,"name":"Tomatoes, red, ripe, raw, year round average"},
 "carrot":{"source":"USDA SR Legacy (generic estimate)","fdc":170393,"basis":"100 g raw edible","sat":0.032,"p":0.93,"f":0.24,"s":4.74,"c":9.58,"k":41.0,"fb":2.8,"name":"Carrots, raw"},
 "potato":{"source":"USDA SR Legacy (generic estimate)","fdc":170026,"basis":"100 g raw edible","f":0.09,"k":77.0,"sat":0.025,"p":2.05,"fb":2.1,"c":17.49,"s":0.82,"name":"Potatoes, flesh and skin, raw"},
 "gobi":{"source":"USDA SR Legacy (generic estimate)","fdc":169986,"basis":"100 g raw edible","c":4.97,"k":25.0,"sat":0.13,"p":1.92,"fb":2.0,"s":1.91,"f":0.28,"name":"Cauliflower, raw"},
 "bhindi":{"source":"USDA SR Legacy (generic estimate)","fdc":169260,"basis":"100 g raw edible","fb":3.2,"sat":0.026,"p":1.93,"s":1.48,"f":0.19,"c":7.45,"k":33.0,"name":"Okra, raw"},
 "palak":{"source":"USDA SR Legacy (generic estimate)","fdc":168462,"basis":"100 g raw edible","p":2.86,"fb":2.2,"s":0.42,"f":0.39,"c":3.63,"k":23.0,"sat":0.063,"name":"Spinach, raw"},
 "arbi":{"source":"USDA SR Legacy (generic estimate)","fdc":169308,"basis":"100 g raw edible","s":0.4,"k":112.0,"sat":0.041,"fb":4.1,"p":1.5,"f":0.2,"c":26.46,"name":"Taro, raw"},
 "mushroom":{"source":"USDA SR Legacy (generic estimate)","fdc":169251,"basis":"100 g raw edible","s":1.98,"sat":0.05,"fb":1.0,"f":0.34,"p":3.09,"c":3.26,"k":22.0,"name":"Mushrooms, white, raw"},
 "cucumber":{"source":"USDA SR Legacy (generic estimate)","fdc":168409,"basis":"100 g raw edible","c":3.63,"k":15.0,"s":1.67,"sat":0.037,"f":0.11,"fb":0.5,"p":0.65,"name":"Cucumber, with peel, raw"},
 "beans":{"source":"USDA SR Legacy (generic estimate)","fdc":169961,"basis":"100 g raw edible","f":0.22,"s":3.26,"p":1.83,"fb":2.7,"c":6.97,"k":31.0,"sat":0.05,"name":"Beans, snap, green, raw"},
 "cabbage":{"source":"USDA SR Legacy (generic estimate)","fdc":169975,"basis":"100 g raw edible","f":0.1,"c":5.8,"k":25.0,"s":3.2,"p":1.28,"fb":2.5,"sat":0.034,"name":"Cabbage, raw"},
 "egg":{"source":"USDA SR Legacy (generic estimate)","fdc":171287,"basis":"1 egg, estimated 50 g edible","k":143.0,"sat":1.563,"p":12.56,"s":0.185,"f":4.755,"c":0.36,"fb":0.0,"name":"Egg, whole, raw, fresh"},
 "nuts":{"source":"USDA SR Legacy (generic estimate)","fdc":170587,"basis":"100 g raw edible","p":20.04,"fb":7.0,"sat":8.711,"f":53.95,"c":21.05,"k":607.0,"s":4.15,"name":"Nuts, mixed nuts, oil roasted, with peanuts, without salt added"},
 "besan":{"source":"USDA SR Legacy (generic estimate)","fdc":174288,"basis":"100 g raw edible","s":10.85,"c":57.82,"k":387.0,"p":22.39,"sat":0.693,"fb":10.8,"f":6.69,"name":"Chickpea flour (besan)"},
 "rajma":{"source":"USDA SR Legacy (generic estimate)","fdc":173744,"basis":"100 g raw edible","s":2.1,"c":61.29,"k":337.0,"p":22.53,"fb":15.2,"sat":0.154,"f":1.06,"name":"Beans, kidney, red, mature seeds, raw"},
 "chickpea":{"source":"USDA SR Legacy (generic estimate)","fdc":173756,"basis":"100 g raw edible","s":10.7,"c":62.95,"k":378.0,"fb":12.2,"p":20.47,"sat":0.603,"f":6.04,"name":"Chickpeas (garbanzo beans, bengal gram), mature seeds, raw"},
 "kalachana":{"source":"USDA SR Legacy (generic estimate)","fdc":173756,"basis":"100 g raw edible","s":10.7,"c":62.95,"k":378.0,"fb":12.2,"p":20.47,"sat":0.603,"f":6.04,"name":"Chickpeas (garbanzo beans, bengal gram), mature seeds, raw"},
 "moong":{"c":61.96,"f":1.35,"s":0.95,"source":"IFCT 2017 B010; available carbohydrate + fibre estimated total","basis":"100 g dry","fb":9.37},
 "masoor":{"c":62.96,"f":0.75,"s":1.95,"source":"IFCT 2017 B013; available carbohydrate + fibre estimated total","basis":"100 g dry","fb":10.43},
 "rice":{"c":81.05,"f":0.52,"s":0.69,"source":"IFCT 2017 A015; available carbohydrate + fibre estimated total","basis":"100 g dry","fb":2.81},
 "poha":{"c":80.21,"f":1.14,"s":0.34,"source":"IFCT 2017 A011; available carbohydrate + fibre estimated total","basis":"100 g dry","fb":3.46},
 "maida":{"c":77.03,"f":0.76,"s":1.79,"source":"IFCT 2017 A018; available carbohydrate + fibre estimated total","basis":"100 g dry","fb":2.76},
 "chana":{"c":60,"f":6,"s":null,"fb":17,"source":"Roasted chana rough estimate; unused by current recipes","basis":"100 g"},
 "spice":{"c":null,"f":null,"s":null,"source":"Unspecified spice mixture; unknown macros","basis":"100 g"},
 "oats":{"c":66.8,"f":8,"s":0.5,"added":0,"sat":1.6,"source":"Matched public packet panel, audited 2026-10-04","basis":"100 g dry","url":"https://www.dmart.in/product/saffola-oats-poats0saff9xx90520?selectedProd=713312"},
 "atta":{"c":74.5,"f":2.2,"s":4.6,"added":0,"sat":0.5,"source":"Matched public packet panel, audited 2026-10-04","basis":"100 g dry","url":"https://www.dmart.in/product/pillsbury-chakki-fresh-atta?selectedProd=11161"},
 "pasta":{"c":72,"f":1.5,"s":2.5,"added":0,"sat":0.5,"source":"Matched public packet panel, audited 2026-10-04","basis":"100 g dry","url":"https://www.dmart.in/product/borges-penne-rigate-durum-wheat-pasta?selectedProd=11614"},
 "butter":{"c":0,"f":80,"s":0,"added":0,"sat":48,"source":"Matched public packet panel, audited 2026-10-04","basis":"100 g","url":"https://www.dmart.in/product/amul-butter?selectedProd=113502"},
 "arhar":{"c":64.3,"f":1.3,"s":0.5,"added":0,"sat":0.4,"source":"Matched public packet panel, audited 2026-10-04","basis":"100 g dry","url":"https://www.dmart.in/product/tata-sampann-toor-dal?selectedProd=99529"},
 "curd":{"c":4.8,"f":3,"s":4.8,"added":0,"sat":"<1.9","source":"Matched public packet panel, audited 2026-10-04","basis":"100 g","url":"https://www.bigbasket.com/pd/40262046/milky-mist-curd-fresh-no-preservatives-creamy-1-kg/"},
 "paneer":{"c":3,"f":22,"s":null,"added":0,"sat":14.5,"source":"Matched public packet panel, audited 2026-10-04","basis":"100 g","url":"https://www.bigbasket.com/pd/214024/heritage-paneer-500-g-pouch/"},
 "milk":{"c":4.6,"f":3,"s":null,"added":0,"sat":2,"source":"Matched public packet panel, audited 2026-10-04","basis":"100 g (NOT100 ml)","url":"https://www.bigbasket.com/pd/40147597/heritage-daily-health-toned-milk-500-ml-pouch/"},
 "soyN":{"c":33.5,"f":0.82,"s":7.18,"added":0,"sat":"<=0.19","source":"Matched public packet panel, audited 2026-10-04","basis":"100 g dry","url":"https://www.dmart.in/product/nutrela-soya-chunks?selectedProd=46502"},
 "soyS":{"c":30.2,"f":1,"s":2.9,"added":0,"sat":0.3,"source":"Matched public packet panel, audited 2026-10-04","basis":"100 g dry","url":"https://www.dmart.in/product/saffola-mealmaker-soya-chunks--psoya0saff3xx40121?selectedProd=823503"},
 "whey":{"c":2.8,"f":1,"s":1.2,"added":0,"sat":0.5,"source":"Matched public packet panel, audited 2026-10-04","basis":"35 g powder","url":"https://asitisnutrition.com/products/atomwheyproteinisolate?variant=41170886262835"},
 "oil":{"c":0,"f":99.7,"s":0,"added":0,"sat":6.2,"source":"Matched public packet panel, audited 2026-10-04","basis":"100 g","url":"https://www.tatasimplybetter.com/products/tata-simply-better-coldpressed-mustard-oil-1l?variant=50349740097856"}
};

function comparisonEmpty(){return{k:0,p:0,c:0,cHi:0,f:0,fHi:0,s:0,sHi:0,fb:0,oil:0,sat:0,unknown:false};}
function comparisonSum(lines){
 const out=comparisonEmpty();
 for(const x of lines){
  if(!(x.q>0))continue;
  const ref=COMPARE_NUTRIENTS[x.id]||{},unit=DB[x.id]?.[3],factor=unit==='serving'||unit==='egg'?x.q:x.q/100;
  const density=x.id==='milk'?milkDensity():x.id==='oil'?.91:1;
  const n=!DB[x.id]?{k:ref.k*factor,p:ref.p*factor,fb:ref.fb*factor}:val(x);
  out.k+=n.k;out.p+=n.p;out.fb+=n.fb||0;
  const f=factor*density,upper=x.id==='egg'?50:x.id==='whey'?35:100;
  const c=ref.c==null?0:ref.c;
  out.c+=c*f;out.cHi+=(ref.c==null?upper:c)*f;
  out.f+=(ref.f||0)*f;out.fHi+=(ref.f==null?upper:ref.f)*f;
  out.sat+=(typeof ref.sat==='number'?ref.sat:0)*f;
  out.s+=(ref.s||0)*f;out.sHi+=(ref.s==null?(ref.c==null?upper:c):ref.s)*f;
  out.unknown ||= ref.c==null||ref.f==null||ref.s==null||!!x.n||!!state.labels[x.id];
  if(x.id==='oil')out.oil+=x.q;
 }
 return out;
}
function comparisonAdd(a,b,scale=1){for(const k of ['k','p','c','cHi','f','fHi','s','sHi','fb','oil','sat'])a[k]+=b[k]*scale;a.unknown ||= b.unknown;return a;}
// Explicit example portions, not a prescribed diet. All weights are raw edible or packet weights.
function ketoDraftMeal(day,p,m){
 if(day.off||day.skip?.[m])return[];
 const h=p==='h';
 if(m==='e')return[];
 if(m==='b')return [L('paneer',h?100:75),L('palak',50),L('mushroom',50),L('oil',h?7:6),...((h?day.wheyH:day.wheyW)?[L('whey',1)]:[]),...(h&&day.eggH?[L('egg',2)]:[])];
 const date=mealDate(day),link=date?batchLink(date,m,p,'sabzi'):null;
 const recipe=link?.batch.recipe||day.s;
 const veg={S1:'bhindi',S2:'gobi',S3:'palak',S4:'cabbage',S5:'mushroom',S6:'cabbage',S7:'gobi',S8:'gobi',S9:'palak',S10:'gobi',S11:'cabbage'}[recipe]||'gobi';
 return [L('paneer',m==='l'?(h?125:100):(h?100:75)),L(soyaId(),h?5:10),L(veg,veg==='bhindi'?60:80),L('onion',10),L('tomato',20),L('cucumber',h?50:37.5),L('oil',h?9:7),L('spice',1),...(m==='l'?[L('curd',50)]:[])];
}
const ketoFixed=x=>x.id==='whey'||x.id==='egg';
function comparisonWeek(p){
 const balanced=comparisonEmpty(),raw=comparisonEmpty(),fixed=comparisonEmpty();
 for(const d of state.days)for(const m of ['b','l','d','e']){
  comparisonAdd(balanced,comparisonSum(meal(d,m,p)),1/7);
  const lines=ketoDraftMeal(d,p,m);
  comparisonAdd(raw,comparisonSum(lines),1/7);
  comparisonAdd(fixed,comparisonSum(lines.filter(ketoFixed)),1/7);
 }
 // Keep enabled 35g whey scoops / 2 eggs unchanged. Match energy by scaling other foods.
 const scale=raw.k>fixed.k?Math.max(0,(balanced.k-fixed.k)/(raw.k-fixed.k)):1,keto=comparisonEmpty();
 for(const d of state.days)for(const m of ['b','l','d','e'])comparisonAdd(keto,comparisonSum(ketoDraftMeal(d,p,m).map(x=>({...x,q:x.q*(ketoFixed(x)?1:scale)}))),1/7);
 return{balanced,keto,scale};
}
function ketoPortionedMeal(day,p,m){const {scale}=comparisonWeek(p);return ketoDraftMeal(day,p,m).map(x=>({...x,q:x.q*(ketoFixed(x)?1:scale)}));}
function comparisonRange(lo,hi){return Math.abs(hi-lo)<.05?String(F(lo)):F(lo)+'–'+F(hi);}
function comparisonTable(p){
 const {balanced:a,keto:b}=comparisonWeek(p);
 const rows=[['Calories',R(a.k)+' kcal',R(b.k)+' kcal'],['Protein',F(a.p)+' g',F(b.p)+' g'],['Carbs¹',comparisonRange(a.c,a.cHi)+' g',comparisonRange(b.c,b.cHi)+' g'],['Total sugars²',comparisonRange(a.s,a.sHi)+' g',comparisonRange(b.s,b.sHi)+' g'],['Added sugar³','0 g','0 g'],['Fat',comparisonRange(a.f,a.fHi)+' g',comparisonRange(b.f,b.fHi)+' g'],['Saturated fat⁴','≥'+F(a.sat)+' g','≥'+F(b.sat)+' g'],['Fibre⁴','≥'+F(a.fb)+' g','≥'+F(b.fb)+' g'],['Cooking oil',F(a.oil)+' ml',F(b.oil)+' ml']];
 return `<section class="nutrition-compare"><h3>${PERSON_NAMES[p]} <small>${{easy:'Low',medium:'Medium',hard:'High'}[personMode(p)]} portions</small></h3><table><caption>Daily average · 7-day home meals</caption><thead><tr><th scope="col">Nutrient</th><th scope="col">Balanced</th><th scope="col">Keto draft</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table><p class="keto-caption">Weekly energy: ${R(a.k*7).toLocaleString()} kcal in each model.</p></section>`;
}
function ketoPortionHTML(day,p,m){
 const lines=ketoPortionedMeal(day,p,m);
 if(!lines.length)return '';
 const names={tofu:'firm tofu',cabbage:'cabbage',capsicum:'capsicum',zucchini:'zucchini'};
 return `<p class="keto-portions">${lines.map(x=>`${F(x.q)} ${DB[x.id]?.[3]==='egg'?'eggs':DB[x.id]?.[3]==='serving'?'scoops':DB[x.id]?.[3]==='ml'?'ml':'g'} ${esc(names[x.id]||DB[x.id]?.[0].split(' · ')[0]||x.id)}`).join(' · ')}</p>`;
}
