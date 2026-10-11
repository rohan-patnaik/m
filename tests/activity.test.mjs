import test from 'node:test';
import assert from 'node:assert/strict';
import {activityBasis,servingState} from '../activity-math.js';
import {validateRecord,mergeRecords} from '../records.js';
const r={basis:'recipe',gross:1600,tare:1000,netWeight:600,portions:[{meal:'l',person:'w',grams:130},{meal:'l',person:'h',grams:183},{meal:'d',person:'w',grams:104},{meal:'d',person:'h',grams:183}]};
test('serving either person first conserves food and reserves the exact dinner amount',()=>{
 const progress=served=>({basis:activityBasis(r),served,updatedAt:1});
 assert.equal(servingState(r,progress([]),'l').left,600);
 assert.equal(servingState(r,progress(['l/w']),'l').left,470);
 assert.equal(servingState(r,progress(['l/h']),'l').left,417);
 const lunch=servingState(r,progress(['l/w','l/h']),'d');assert.equal(lunch.left,287);assert.equal(lunch.dinner,287);
 assert.equal(servingState(r,progress(['l/w','l/h','d/w','d/h']),'d').left,0);
 // Undo removes only the selected portion from the served set.
 assert.equal(servingState(r,progress(['l/h']),'l').portions.find(p=>p.person==='w').served,false);
});
test('a new gross weight, recipe or portion assignment invalidates old serving progress',()=>{
 const activity={basis:activityBasis(r),served:['l/w','l/h'],updatedAt:1};
 assert.equal(servingState({...r,gross:1800,netWeight:800},activity,'l').left,800);
 assert.equal(servingState({...r,basis:'different recipe'},activity,'l').left,600);
 assert.equal(servingState({...r,portions:[...r.portions].reverse()},activity,'l').left,600);
 assert.equal(activityBasis({...r,portions:r.portions.map(s=>({grams:s.grams,person:s.person,meal:s.meal}))}),activityBasis(r));
});
test('checklist records reject malformed paths, dates and duplicate/unknown servings',()=>{
 const v={basis:activityBasis(r),served:['l/w'],updatedAt:1};
 assert.doesNotThrow(()=>validateRecord('serve/2026-10-07/sabzi',v));
 assert.doesNotThrow(()=>validateRecord('done/2026-10-07/b',{basis:'meal',complete:true,updatedAt:1}));
 assert.doesNotThrow(()=>validateRecord('buy/2026-10-05/gobi',{checked:true,updatedAt:1}));
 for(const key of ['serve/2026-02-30/sabzi','serve/2026-10-07/wrong','buy/2026-10-06/gobi','done/2026-10-07/e'])assert.throws(()=>validateRecord(key,v));
 for(const served of [['l/w','l/w'],['b/w'],['l/x'],['junk']])assert.throws(()=>validateRecord('serve/2026-10-07/sabzi',{...v,served}));
 assert.throws(()=>validateRecord('buy/2026-10-05/gobi',{checked:1,updatedAt:1}));
});
test('two devices editing different dishes merge, while the same serving record conflicts',()=>{
 const base={a:{value:{served:[],basis:'a',updatedAt:1},revision:1},b:{value:{served:[],basis:'b',updatedAt:1},revision:1}};
 const draft={a:{served:['l/w'],basis:'a',updatedAt:2},b:base.b.value};
 const incoming={a:base.a,b:{value:{served:['l/h'],basis:'b',updatedAt:2},revision:2}};
 assert.deepEqual(mergeRecords(base,draft,incoming).conflicts,[]);
 assert.deepEqual(mergeRecords(base,draft,{...incoming,a:{value:{served:['l/h'],basis:'a',updatedAt:2},revision:2}}).conflicts,['a']);
});
