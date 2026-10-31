import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{handleTool,QlooBudget,boundedResponse} from '../src/worker.mjs';
const MAX_QLOO_BYTES=2097152;
const movie='b7f09b1e-dd1c-4a40-86a9-5acfd8876967';
const resultMovie={entity_id:'9b4225b9-feda-4c9f-b782-012345678900',name:'Synthetic upstream test film',subtype:'urn:entity:movie'};
const envLive=()=>({QLOO_LIVE_ENABLED:'true',QLOO_STOP:'false',QLOO_TOTAL_REQUEST_LIMIT:'1',QLOO_EXPIRES_AT:new Date(Date.now()+3600000).toISOString(),QLOO_API_KEY:'synthetic-test-only'});
const request=(path,body,headers={})=>new Request('https://demo.example'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const people=['sea','space','forest'].map((id,i)=>({name:['Alex','Morgan','Sam'][i],seeds:[id]}));
async function choices(env={},queries=['Quiet Harbor','Orbit','Forest']){
  const selections=[];
  for(let i=0;i<3;i++){
    const found=await handleTool('resolve_movie',{participant:i,query:queries[i]},env);
    selections.push({participant:i,token:found.token,id:found.choices[0].id,confirmed:true});
  }
  return selections;
}
function ledger(env,initial={}){
  const data=new Map(Object.entries(initial));let chain=Promise.resolve();
  const ctx={storage:{async get(k){return data.get(k);},async put(k,v){if(typeof k==='object')for(const [key,value]of Object.entries(k))data.set(key,value);else data.set(k,v);}},blockConcurrencyWhile(fn){const task=chain.then(fn);chain=task.catch(()=>{});return task;}};
  return {instance:new QlooBudget(ctx,env,(url,options)=>env.__testFetch(url,options)),data};
}
const ledgerRequest=()=>request('/recommend',{id:movie});
const upstream=()=>new Response(JSON.stringify({success:true,results:{entities:[resultMovie]}}),{status:200});
test('Worker fixture API preserves three-list ranking and provenance',async()=>{
  const response=await worker.fetch(request('/api/recommend',{people}),{});const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.provider,'fixture');assert.equal(body.apiVerified,false);assert.equal(body.candidates.length,3);
  assert.equal((await (await worker.fetch(request('/api/options'),{})).json()).length,4);
  const discovery=await (await worker.fetch(request('/api/tools'),{})).json();assert.equal(discovery.tools.length,2);assert.equal(discovery.tools[0].type,'function');assert.deepEqual(discovery.tools[0].function.parameters.required,['participant','query']);
});
test('Worker fixture partial, failure without fallback and recovery',async()=>{
  const partial=structuredClone(people);partial[2].seeds=['solo'];
  assert.equal((await (await worker.fetch(request('/api/recommend',{people:partial}),{})).json()).status,'needs-discussion');
  const failure=await worker.fetch(request('/api/recommend',{people,fail:true}),{});assert.equal(failure.status,400);assert.equal((await failure.json()).candidates,undefined);
  assert.equal((await worker.fetch(request('/api/recommend',{people}),{})).status,200);
});
test('Worker rejects cross-origin requests and non-JSON',async()=>{
  for(const headers of [{Origin:'https://other.invalid'},{'Content-Type':'text/plain'},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await worker.fetch(request('/api/recommend',{people},headers),{})).status,403);
});
test('Worker bounds request bytes and rejects malformed/null input',async()=>{
  assert.equal((await worker.fetch(request('/api/recommend',{padding:'x'.repeat(4100)}),{})).status,413);
  for(const body of ['{','null','[]'])assert.equal((await worker.fetch(new Request('https://demo.example/api/recommend',{method:'POST',headers:{'Content-Type':'application/json'},body}),{})).status,400);
});
test('Worker status remains replay with a secret alone, missing gate, stop, expiry or excess cap',async()=>{
  for(const env of [{},{QLOO_API_KEY:'synthetic-test-only'},{...envLive(),QLOO_STOP:'true'},{...envLive(),QLOO_EXPIRES_AT:'invalid'},{...envLive(),QLOO_TOTAL_REQUEST_LIMIT:'4'}]){
    const body=await (await worker.fetch(request('/api/live/status'),env)).json();assert.equal(body.mode,'mock-only');assert.equal(body.liveConfigured,false);assert.equal(JSON.stringify(body).includes('synthetic-test-only'),false);
  }
});
test('Worker replay resolution presents ambiguity and no automatic selection',async()=>{
  const result=await handleTool('resolve_movie',{participant:1,query:'Orbit'},{});assert.equal(result.choices.length,2);assert.equal(result.status,'needs-confirmation');assert.equal(result.mode,'mock-only');
  await assert.rejects(()=>handleTool('resolve_movie',{participant:0,query:'\n'},{}));
});
test('Worker rejects missing confirmation, duplicate participant, foreign choice and token',async()=>{
  const original=await choices();
  for(const edit of [s=>s[2].confirmed=false,s=>s[2].participant=0,s=>s[2].id=movie,s=>s[2].token='forged']){const selections=structuredClone(original);edit(selections);await assert.rejects(()=>handleTool('compare_confirmed_movies',{selections},{}));}
});
test('Worker recorded replay explicitly reuses one observed movie; never requests Qloo',async()=>{
  const result=await handleTool('compare_confirmed_movies',{selections:await choices()},{});
  assert.equal(result.mode,'mock-only');assert.equal(result.apiVerified,false);assert.equal(result.candidates[0].id,movie);assert.match(result.notice,/not independent/);assert.equal(result.candidates[0].coverage,3);
});
test('Worker visitors have no mutable shared selection slots',async()=>{
  const a=await choices(),b=await choices({},['Forest','Quiet Harbor','Orbit']);
  assert.equal((await handleTool('compare_confirmed_movies',{selections:a},{})).candidates[0].id,movie);
  assert.equal((await handleTool('compare_confirmed_movies',{selections:b},{})).candidates[0].id,movie);
});
test('Worker live catalog only resolves the observed public movie locally',async()=>{
  assert.equal((await handleTool('resolve_movie',{participant:0,query:'Inglourious'},envLive())).choices[0].id,movie);
  assert.equal((await handleTool('resolve_movie',{participant:0,query:'Orbit'},envLive())).choices.length,0);
});
test('Worker live compare uses one ledger lookup for identical confirmed seeds',async()=>{
  const env=envLive();let calls=0;env.QLOO_BUDGET={idFromName(name){assert.equal(name,'qloo-lifetime-v1');return name;},get(){return {async fetch(){calls++;return new Response(JSON.stringify({list:[{id:resultMovie.entity_id,name:resultMovie.name}]}));}};}};
  const selections=await choices(env,Array(3).fill('Inglourious Basterds'));const result=await handleTool('compare_confirmed_movies',{selections},env);
  assert.equal(calls,1);assert.equal(result.candidates[0].coverage,3);assert.equal(JSON.stringify(result).includes(env.QLOO_API_KEY),false);
});
test('Worker live mode without durable ledger fails closed',async()=>{
  const env=envLive(),selections=await choices(env,Array(3).fill('Inglourious'));await assert.rejects(()=>handleTool('compare_confirmed_movies',{selections},env));
});
test('Ledger disabled config makes zero outgoing requests',async()=>{
  let calls=0;const {instance}=ledger({__testFetch(){calls++;}});assert.equal((await instance.fetch(ledgerRequest())).status,503);assert.equal(calls,0);
});
test('Ledger reserves durably before fixed-host fetch, then reuses public result',async()=>{
  const env=envLive();let calls=0;const {instance,data}=ledger(env);
  env.__testFetch=async(url,options)=>{calls++;assert.equal(data.get('used'),1);assert.equal(data.get('pending'),true);assert.equal(url.origin,'https://hackathon.api.qloo.com');assert.equal(url.pathname,'/v2/insights');assert.equal(url.searchParams.get('signal.interests.entities'),movie);assert.equal(options.redirect,'manual');assert.equal(options.headers['X-Api-Key'],'synthetic-test-only');return upstream();};
  for(let i=0;i<3;i++)assert.equal((await instance.fetch(ledgerRequest())).status,200);
  assert.equal(calls,1);assert.equal(data.get('pending'),false);assert.equal(data.get('used'),1);
});
test('Ledger serializes concurrent reservations across visitors',async()=>{
  let calls=0;const env={...envLive(),__testFetch:async()=>{calls++;await Promise.resolve();return upstream();}};const {instance,data}=ledger(env);
  const result=await Promise.all([instance.fetch(ledgerRequest()),instance.fetch(ledgerRequest())]);assert.ok(result.every(x=>x.status===200));assert.equal(calls,1);assert.equal(data.get('used'),1);
});
test('Ledger lifetime exhaustion and crash-pending marker prevent sending',async()=>{
  for(const initial of [{used:1},{used:1,pending:true},{stopped:true}]){let calls=0;const {instance}=ledger({...envLive(),__testFetch(){calls++;}},initial);assert.notEqual((await instance.fetch(ledgerRequest())).status,200);assert.equal(calls,0);}
});
test('Ledger redirect/auth/rate/contract errors stop permanently without retry',async()=>{
  for(const response of [new Response('',{status:302}),new Response('',{status:401}),new Response('',{status:429}),new Response('{}'),new Response(JSON.stringify({success:true,results:[{...resultMovie,subtype:'urn:entity:artist'}]}))]){
    let calls=0;const {instance,data}=ledger({...envLive(),__testFetch:async()=>{calls++;return response;}});
    assert.equal((await instance.fetch(ledgerRequest())).status,503);assert.equal((await instance.fetch(ledgerRequest())).status,503);assert.equal(calls,1);assert.equal(data.get('stopped'),true);assert.equal(data.get('used'),1);
  }
});
test('Ledger unknown transport failure consumes reservation and discloses no diagnostics',async()=>{
  const {instance,data}=ledger({...envLive(),__testFetch:async()=>{throw new Error('synthetic-private-diagnostic');}});
  const response=await instance.fetch(ledgerRequest());assert.equal(response.status,503);assert.equal((await response.text()).includes('synthetic-private-diagnostic'),false);assert.equal(data.get('pending'),true);
});
test('Ledger rejects oversize upstream response without returning its contents',async()=>{
  const {instance}=ledger({...envLive(),__testFetch:async()=>new Response('x'.repeat(MAX_QLOO_BYTES+1))});assert.equal((await instance.fetch(ledgerRequest())).status,503);
});
test('Ledger accepts genuine empty results, empty error fields and movie type fallback',async()=>{
  for(const body of [{success:true,errors:[],error:null,results:[]},{success:true,error:{},results:[{entity_id:resultMovie.entity_id,name:resultMovie.name,type:'urn:entity:movie'}]}]){
    const {instance}=ledger({...envLive(),__testFetch:async()=>new Response(JSON.stringify(body))});assert.equal((await instance.fetch(ledgerRequest())).status,200);
  }
});
test('Worker asset fallback does not expose server source itself',async()=>{
  let forwarded;const env={ASSETS:{fetch(request){forwarded=request.url;return new Response('asset placeholder');}}};
  assert.equal(await (await worker.fetch(request('/live'),env)).text(),'asset placeholder');assert.match(forwarded,/\/live$/);
  assert.equal((await worker.fetch(request('/api/unknown'),{})).status,404);
});
test('read-only budget status preserves consumed state and never invokes fetch',async()=>{
  let calls=0;const initial={used:1,pending:true,stopped:true};const {instance,data}=ledger({...envLive(),__testFetch:async()=>{calls++;return upstream();}},initial);
  const response=await instance.fetch(new Request('https://ledger.internal/read-only-status'));const result=await response.json();
  assert.equal(response.status,200);assert.deepEqual(result,{grantProtocolVersion:5,grantConfiguration:{protocolVersion:5,id:null,expiresAt:null,enabled:false},used:1,pending:true,stopped:true,maximumQlooRequests:1,additionalQlooAllowed:false,httpStatus:null});assert.equal(calls,0);assert.deepEqual(Object.fromEntries(data),initial);
});
test('public budget route calls only the stable ledger read path',async()=>{
  let target;const env={QLOO_BUDGET:{idFromName(name){assert.equal(name,'qloo-lifetime-v1');return name;},get(){return {async fetch(url){target=url;return new Response(JSON.stringify({used:1,stopped:true,additionalQlooAllowed:false}));}};}}};
  assert.equal((await worker.fetch(request('/api/live/budget'),env)).status,200);assert.equal(target,'https://ledger.internal/read-only-status');
});

// Official documented fields, projected for a contract test, not captured HTTP.
test('documented nested Insights shape accepts generic entity type plus movie subtype',async()=>{
  const response=new Response(JSON.stringify({success:true,results:{entities:[{name:'Everything Everywhere All at Once',entity_id:'F0D354AA-BA7E-49D2-8ABA-9A8250F5C852',type:'urn:entity',subtype:'urn:entity:movie'}]}}));
  const result=await boundedResponse(response,'fake-diagnostic-key');assert.equal(result.list[0].id,'f0d354aa-ba7e-49d2-8aba-9a8250f5c852');assert.equal(result.validation.stage,'validated');assert.equal(result.validation.envelope,'results_entities');assert.equal(result.validation.validMovieCount,1);
});
// Known safe fields from a verified summary; not a reconstruction of raw JSON.
test('earlier success summary projection is accepted without claiming a raw replay',async()=>{
  const result=await boundedResponse(new Response(JSON.stringify({success:true,results:{entities:[{entity_id:'b7f09b1e-dd1c-4a40-86a9-5acfd8876967',name:'Inglourious Basterds',subtype:'urn:entity:movie'}]}})),'fake-diagnostic-key');assert.equal(result.list.length,1);assert.equal(result.validation.jsonValid,true);
});
const diagnosticCases=[
 ['http',()=>new Response('never copied',{status:401})],
 ['empty_body',()=>new Response(null)],
 ['body_limit',()=>new Response('x'.repeat(MAX_QLOO_BYTES+1))],
 ['body_read',()=>new Response(new ReadableStream({start(c){c.error(new Error('fake-diagnostic-key must not leak'));}}))],
 ['json_decode',()=>new Response('{fake-diagnostic-key')],
 ['success_flag',()=>new Response(JSON.stringify({success:false,results:[]}))],
 ['application_error',()=>new Response(JSON.stringify({success:true,error:{private:'fake-diagnostic-key'},results:[]}))],
 ['results_envelope',()=>new Response(JSON.stringify({success:true,results:{movies:[]}}))],
 ['row_limit',()=>new Response(JSON.stringify({success:true,results:Array(11).fill(resultMovie)}))],
 ['row_object',()=>new Response(JSON.stringify({success:true,results:[null]}))],
 ['movie_uuid',()=>new Response(JSON.stringify({success:true,results:[{...resultMovie,entity_id:'fake-diagnostic-key'}]}))],
 ['movie_type',()=>new Response(JSON.stringify({success:true,results:[{...resultMovie,subtype:'urn:entity:person'}]}))],
 ['movie_title',()=>new Response(JSON.stringify({success:true,results:[{...resultMovie,name:'unsafe\nname'}]}))],
 ['credential_reflection',()=>new Response(JSON.stringify({success:true,results:[{...resultMovie,name:'fake-diagnostic-key'}]}))]
];
for(const [stage,build]of diagnosticCases)test(`safe diagnostics identify ${stage} with no raw values`,async()=>{
  await assert.rejects(boundedResponse(build(),'fake-diagnostic-key'),error=>{
    assert.equal(error.validation.stage,stage);const serialized=JSON.stringify({message:error.message,validation:error.validation});assert.equal(serialized.includes('fake-diagnostic-key'),false);assert.equal(serialized.includes('unsafe'),false);assert.ok(error.validation.bytesRead<=MAX_QLOO_BYTES+1);return true;
  });
});
test('bounded response accepts exactly 2MiB and rejects one byte above',async()=>{
 const body=JSON.stringify({success:true,results:{entities:[resultMovie]}});const exact=body+' '.repeat(MAX_QLOO_BYTES-new TextEncoder().encode(body).length);
 const accepted=await boundedResponse(new Response(exact),'fake-only');assert.equal(accepted.validation.bytesRead,MAX_QLOO_BYTES);assert.equal(accepted.list.length,1);
 await assert.rejects(boundedResponse(new Response(exact+' '),'fake-only'),e=>e.validation.stage==='body_limit'&&e.validation.bytesRead===MAX_QLOO_BYTES+1);
 await assert.rejects(boundedResponse(new Response('x'.repeat(MAX_QLOO_BYTES)),'fake-only'),e=>e.validation.stage==='json_decode');
});
test('stalled response stream obeys an overall deadline without retry',async()=>{
 let cancelled=false;const body=new ReadableStream({pull(){return new Promise(()=>{})},cancel(){cancelled=true}});
 await assert.rejects(boundedResponse(new Response(body),'fake-only',{deadlineAt:Date.now()+10}),e=>e.validation.stage==='body_timeout');assert.equal(cancelled,true);
});test('verified replay returns only the ten observed public movies without ledger access',async()=>{
 const env={QLOO_BUDGET:{idFromName(){throw Error('must not access ledger')}}};const response=await worker.fetch(new Request('https://demo.example/api/verified-sample'),env);assert.equal(response.status,200);const value=await response.json();assert.equal(value.kind,'recorded-worker-response');assert.equal(value.seed.id,movie);assert.equal(value.movies.length,10);assert.equal(value.movies[0].name,'Pulp Fiction');assert.equal(value.jsonValidated,true);assert.match(value.notice,/zero Qloo requests/);assert.deepEqual(Object.keys(value.movies[0]).sort(),['id','name']);
});
