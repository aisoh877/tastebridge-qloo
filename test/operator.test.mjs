import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{QlooBudget,handleTool} from '../src/worker.mjs';
import {verifyOperator} from '../src/operator.mjs';
const runId='c9b2516a-a340-4c41-bfe4-012345678900';
const envForTest=()=>({QLOO_API_KEY:'synthetic-test-only',QLOO_LIVE_ENABLED:'false',QLOO_STOP:'true',QLOO_TOTAL_REQUEST_LIMIT:'0',QLOO_OPERATOR_STOP:'false',QLOO_OPERATOR_RUN_ID:runId,QLOO_OPERATOR_EXPIRES_AT:new Date(Date.now()+600000).toISOString()});
async function signed(action,env,signatureAction=action){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.QLOO_API_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`TasteBridge operator v1\n${env.QLOO_OPERATOR_RUN_ID}\n${signatureAction}`));
  const sig=[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
  return new Request(`https://demo.example/operator/${action}`,{method:'POST',headers:{'Content-Type':'application/json','X-TasteBridge-Authorization':sig},body:JSON.stringify({runId:env.QLOO_OPERATOR_RUN_ID})});
}
function ledger(env,send,initial={}){
  const data=new Map(Object.entries(initial));let chain=Promise.resolve();
  const ctx={storage:{async get(k){return data.get(k);},async put(k,v){if(typeof k==='object')for(const [a,b]of Object.entries(k))data.set(a,b);else data.set(k,v);}},blockConcurrencyWhile(fn){const p=chain.then(fn);chain=p.catch(()=>{});return p;}};
  return {instance:new QlooBudget(ctx,env,send),data};
}
const response=()=>new Response(JSON.stringify({success:true,results:[{entity_id:'9b4225b9-feda-4c9f-b782-012345678900',name:'Synthetic operator result',subtype:'urn:entity:movie'}]}));
test('operator rejects unsigned, wrong-action, expired and stopped requests',async()=>{
  const env=envForTest();assert.equal(await verifyOperator(new Request('https://demo.example/operator/once',{method:'POST'}),env,'once'),false);
  assert.equal(await verifyOperator(await signed('once',env,'status'),env,'once'),false);
  for(const modified of [{...env,QLOO_OPERATOR_STOP:'true'},{...env,QLOO_OPERATOR_EXPIRES_AT:'2000-01-01'}])assert.equal(await verifyOperator(await signed('once',env),modified,'once'),false);
});
test('operator signature grants no public live activation and public replay cannot consume the slot',async()=>{
  const env=envForTest();let calls=0;env.QLOO_BUDGET={idFromName(){calls++;throw new Error('must not reach ledger');}};
  const status=await (await worker.fetch(new Request('https://demo.example/api/live/status'),env)).json();assert.equal(status.mode,'mock-only');assert.equal(status.liveConfigured,false);
  const selections=[];for(let i=0;i<3;i++){const row=await handleTool('resolve_movie',{participant:i,query:['Quiet Harbor','Orbit','Forest'][i]},env);selections.push({participant:i,token:row.token,id:row.choices[0].id,confirmed:true});}
  await handleTool('compare_confirmed_movies',{selections},env);assert.equal(calls,0);
  const denied=await worker.fetch(new Request('https://demo.example/api/operator/once',{method:'POST',body:'{}'}),env);assert.equal(denied.status,403);assert.equal(calls,0);
});
test('operator reserves exactly one request, returns sanitized result, stops, and status is read-only',async()=>{
  const env=envForTest();let calls=0;const {instance,data}=ledger(env,async(url,options)=>{calls++;assert.equal(data.get('used'),1);assert.equal(data.get('pending'),true);assert.equal(url.origin,'https://hackathon.api.qloo.com');assert.equal(options.redirect,'manual');return response();});
  const first=await instance.fetch(await signed('once',env));assert.equal(first.status,200);const result=await first.json();assert.equal(result.httpStatus,200);assert.equal(result.requestAttempts,1);assert.equal(result.stopped,true);assert.equal(result.list.length,1);
  assert.equal((await instance.fetch(await signed('once',env))).status,429);
  const status=await (await instance.fetch(await signed('status',env))).json();assert.equal(status.used,1);assert.equal(status.additionalQlooAllowed,false);assert.equal(status.stopped,true);assert.equal(status.httpStatus,200);assert.equal(calls,1);
});
test('operator concurrent signatures cannot race past the one-request cap',async()=>{
  const env=envForTest();let calls=0;const {instance}=ledger(env,async()=>{calls++;return response();});
  const all=await Promise.all([instance.fetch(await signed('once',env)),instance.fetch(await signed('once',env))]);assert.deepEqual(all.map(x=>x.status),[200,429]);assert.equal(calls,1);
});
test('operator uncertain/crashed attempts remain consumed with no resend',async()=>{
  const env=envForTest();let calls=0;const {instance,data}=ledger(env,async()=>{calls++;throw new Error('synthetic private diagnostic');});
  assert.equal((await instance.fetch(await signed('once',env))).status,503);assert.equal((await instance.fetch(await signed('once',env))).status,429);assert.equal(data.get('pending'),true);assert.equal(calls,1);
  const crashed=ledger(env,async()=>{throw new Error('must not call');},{used:1,pending:true});assert.equal((await crashed.instance.fetch(await signed('once',env))).status,429);
});
test('operator direct ledger endpoint also authenticates; unavailable key makes no call',async()=>{
  let calls=0;const env=envForTest(),{instance}=ledger(env,async()=>{calls++;return response();});
  assert.equal((await instance.fetch(new Request('https://ledger.internal/operator/once',{method:'POST',body:'{}'}))).status,403);
  const req=await signed('once',env);delete env.QLOO_API_KEY;assert.equal((await instance.fetch(req)).status,403);assert.equal(calls,0);
});
test('operator refuses reflecting its credential in a movie title or ID',async()=>{
  for(const field of ['name','entity_id']){
    const env=envForTest();if(field==='entity_id')env.QLOO_API_KEY='9b4225b9-feda-4c9f-b782-012345678900';
    const {instance,data}=ledger(env,async()=>new Response(JSON.stringify({success:true,results:[{entity_id:'9b4225b9-feda-4c9f-b782-012345678900',name:'Synthetic result',subtype:'urn:entity:movie',[field]:env.QLOO_API_KEY}]})));
    const result=await instance.fetch(await signed('once',env));assert.equal(result.status,503);assert.equal((await result.text()).includes(env.QLOO_API_KEY),false);assert.equal(data.has('sample-list'),false);
  }
});
