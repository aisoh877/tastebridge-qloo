import {fixtureProvider,seedOptions,verifiedQlooSample} from './fixtures.mjs';
import {findAgreement} from './ranking.mjs';
import {toolDefinitions} from './tools.mjs';
import {verifyOperator,operatorReady} from './operator.mjs';
import {verifyGrant,grantConfiguration} from './grant.mjs';

const MAX_QLOO_BYTES=2097152;
const QLOO_TIMEOUT_MS=8000;
const MOVIE=Object.freeze({id:'b7f09b1e-dd1c-4a40-86a9-5acfd8876967',name:'Inglourious Basterds'});
const invented=['The Quiet Harbor','Orbit Letters','The Forest Kitchen','Orbit Letters (another invented film)'];
const syntheticId=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(code,message)=>Object.assign(new Error(message),{code});
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(status,value)=>new Response(JSON.stringify(value),{status,headers});
const liveReady=env=>env.QLOO_LIVE_ENABLED==='true'&&env.QLOO_STOP==='false'&&typeof env.QLOO_API_KEY==='string'&&!!env.QLOO_API_KEY&&Number.isInteger(Number(env.QLOO_TOTAL_REQUEST_LIMIT))&&Number(env.QLOO_TOTAL_REQUEST_LIMIT)>=1&&Number(env.QLOO_TOTAL_REQUEST_LIMIT)<=3&&Number.isFinite(Date.parse(env.QLOO_EXPIRES_AT))&&Date.parse(env.QLOO_EXPIRES_AT)>Date.now();
function status(env){
  const live=liveReady(env);
  return {mode:live?'live':'mock-only',enabled:true,apiVerified:false,liveConfigured:live,notice:live?'Fixed public film catalog. One list is reused when everyone selects the same movie. No title search or external model.':'Recorded public API sample with invented input films. Live connection is not configured; no new Qloo request. Reused lists are not independent recommendations.'};
}
const catalog=env=>liveReady(env)?[MOVIE]:invented.map((name,i)=>({id:syntheticId(i+1),name}));
const token=(mode,id)=>`${mode}:catalog-v1:${id}`;

async function readJSON(request){
  if(Number(request.headers.get('content-length'))>4000)throw fail('SIZE','Request too large.');
  const reader=request.body?.getReader();let bytes=0;const chunks=[];
  if(!reader)throw fail('INPUT','Expected JSON.');
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4000){await reader.cancel();throw fail('SIZE','Request too large.');}chunks.push(value);}
  const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(joined));}catch{throw fail('INPUT','Invalid JSON.');}
}

export async function handleTool(name,args,env){
  const state=status(env),choices=catalog(env);
  if(name==='resolve_movie'){
    if(!exact(args,['participant','query'])||!Number.isInteger(args.participant)||args.participant<0||args.participant>2||typeof args.query!=='string'||!args.query.trim()||args.query.length>120||/[\x00-\x1f]/.test(args.query))throw fail('INPUT','Choose participant 0–2 and a public catalog title.');
    const matches=choices.filter(x=>x.name.toLowerCase().includes(args.query.trim().toLowerCase()));
    // Choices are immutable, versioned public catalogs; no shared visitor slots.
    return {...state,participant:args.participant,token:token(state.mode,'lookup'),choices:matches,status:matches.length?'needs-confirmation':'empty'};
  }
  if(name!=='compare_confirmed_movies')throw fail('UNKNOWN_TOOL','Unknown tool.');
  if(!exact(args,['selections'])||!Array.isArray(args.selections)||args.selections.length!==3)throw fail('INPUT','Confirm all three selections.');
  const seen=new Set();
  const selections=args.selections.map(x=>{
    if(!exact(x,['participant','token','id','confirmed'])||!Number.isInteger(x.participant)||x.participant<0||x.participant>2||seen.has(x.participant)||x.confirmed!==true||x.token!==token(state.mode,'lookup')||!choices.some(c=>c.id===x.id))throw fail('CONFIRMATION_REQUIRED','Each current catalog choice requires explicit confirmation.');
    seen.add(x.participant);return x;
  }).sort((a,b)=>a.participant-b.participant);
  const lists=new Map();
  const provider={name:state.mode==='live'?'qloo-rest':'recorded-replay',async recommend(ids){
    const id=ids[0];if(lists.has(id))return lists.get(id);
    let list;
    if(state.mode==='mock-only')list=[{...MOVIE}];
    else{
      if(!env.QLOO_BUDGET)throw fail('LIVE_DISABLED','Live request ledger is unavailable.');
      const stub=env.QLOO_BUDGET.get(env.QLOO_BUDGET.idFromName('qloo-lifetime-v1'));
      const response=await stub.fetch('https://ledger.internal/recommend',{method:'POST',body:JSON.stringify({id})});
      const result=await response.json();if(!response.ok)throw fail(result.code??'QLOO_FAILURE',result.error??'Live request stopped.');
      list=result.list;
    }
    lists.set(id,list);return list;
  }};
  const people=selections.map(x=>({name:['Alex','Morgan','Sam'][x.participant],seeds:[x.id]}));
  const result=await findAgreement(people,provider);
  return {...result,...state,notice:state.notice,selected:selections.map(x=>({participant:x.participant,id:x.id,name:choices.find(c=>c.id===x.id).name}))};
}

export default {async fetch(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
  try{
    if(path==='/api/grant/readiness'&&request.method==='GET'){
      const stub=env.QLOO_BUDGET.get(env.QLOO_BUDGET.idFromName('qloo-lifetime-v1'));
      const response=await stub.fetch('https://ledger.internal/read-only-status');
      return json(response.status,{worker:grantConfiguration(env),ledger:await response.json()});
    }
    if(path==='/api/grant/once'){
      if(!await verifyGrant(request,env))return json(403,{code:'GRANT_DENIED'});
      const input=await readJSON(request);
      if(!exact(input,['grantId'])||input.grantId!==env.QLOO_GRANT_ID)return json(400,{code:'INPUT'});
      const stub=env.QLOO_BUDGET.get(env.QLOO_BUDGET.idFromName('qloo-lifetime-v1'));
      return stub.fetch('https://ledger.internal/grant/once',{method:'POST',headers:{'X-TasteBridge-Grant':request.headers.get('X-TasteBridge-Grant')},body:JSON.stringify(input)});
    }
    if(['/api/operator/once','/api/operator/status'].includes(path)){
      const action=path.split('/').at(-1);
      if(!await verifyOperator(request,env,action))return json(403,{code:'OPERATOR_DENIED',error:'Operator request unavailable.'});
      const input=await readJSON(request);
      if(!exact(input,['runId'])||input.runId!==env.QLOO_OPERATOR_RUN_ID)return json(400,{error:'Invalid operator request.'});
      const stub=env.QLOO_BUDGET.get(env.QLOO_BUDGET.idFromName('qloo-lifetime-v1'));
      return stub.fetch(`https://ledger.internal/operator/${action}`,{method:'POST',headers:{'Content-Type':'application/json','X-TasteBridge-Authorization':request.headers.get('X-TasteBridge-Authorization')},body:JSON.stringify(input)});
    }
    if(request.method==='GET'&&path==='/api/verified-sample')return json(200,verifiedQlooSample);
    if(request.method==='GET'&&path==='/api/options')return json(200,seedOptions);
    if(request.method==='GET'&&path==='/api/live/status')return json(200,status(env));
    if(request.method==='GET'&&path==='/api/live/budget'){
      const stub=env.QLOO_BUDGET.get(env.QLOO_BUDGET.idFromName('qloo-lifetime-v1'));
      return stub.fetch('https://ledger.internal/read-only-status');
    }
    if(request.method==='GET'&&path==='/api/tools')return json(200,{...status(env),tools:toolDefinitions});
    if(request.method==='POST'&&['/api/recommend','/api/tools/call'].includes(path)){
      if(request.headers.get('content-type')!=='application/json'||(request.headers.has('origin')&&request.headers.get('origin')!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')return json(403,{error:'Same-origin JSON only.'});
      const input=await readJSON(request);
      if(path==='/api/recommend'){
        if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['people','fail'].includes(k)))throw fail('INPUT','Invalid fixture input.');
        return json(200,await findAgreement(input.people,fixtureProvider({fail:input.fail===true})));
      }
      if(!exact(input,['name','arguments'])||typeof input.name!=='string')throw fail('INPUT','Expected tool name and arguments.');
      return json(200,await handleTool(input.name,input.arguments,env));
    }
    return json(404,{error:'Not found.'});
  }catch(error){return json(error.code==='SIZE'?413:error.code==='LIVE_DISABLED'?503:error.code==='LOCAL_BUDGET'?429:400,{error:error.message,code:error.code??'INPUT'});}
}};

export async function boundedResponse(response,sensitiveValue,{deadlineAt=Date.now()+QLOO_TIMEOUT_MS}={}){
  // Only fixed enums, bounded counts and HTTP status may leave this validator.
  // Never retain raw upstream body, headers, field values, credentials or exceptions.
  const validation={version:1,stage:'http',httpStatus:response.status,bytesRead:0,maximumBytes:MAX_QLOO_BYTES};
  const reject=(stage,code='QLOO_CONTRACT')=>{throw Object.assign(fail(code,'Qloo response rejected; no retry.'),{validation:{...validation,stage}});};
  if(response.status!==200)reject('http',response.status===401||response.status===403?'QLOO_AUTH':response.status===429?'QLOO_RATE_LIMIT':'QLOO_FAILURE');
  const reader=response.body?.getReader();if(!reader)reject('empty_body');
  let size=0;const chunks=[];
  try{
    while(true){let timer;const remaining=deadlineAt-Date.now();if(remaining<=0)reject('body_timeout');let part;try{part=await Promise.race([reader.read(),new Promise((_,rejectTimeout)=>{timer=setTimeout(()=>rejectTimeout(Object.assign(new Error('deadline'),{timedOut:true})),remaining);})]);}catch(error){if(error.timedOut){void reader.cancel().catch(()=>{});reject('body_timeout');}throw error;}finally{clearTimeout(timer);}const {done,value}=part;if(done)break;size+=value.byteLength;validation.bytesRead=Math.min(size,MAX_QLOO_BYTES+1);if(size>MAX_QLOO_BYTES){try{void reader.cancel().catch(()=>{});}catch{}reject('body_limit');}chunks.push(value);}
  }catch(error){if(error.validation)throw error;reject('body_read');}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{reject('json_decode');}
  validation.jsonValid=true;
  validation.successFlag=body?.success===true?'true':body?.success===false?'false':body&&typeof body==='object'&&Object.hasOwn(body,'success')?'invalid':'absent';
  const hasError=value=>Array.isArray(value)?value.length>0:value&&typeof value==='object'?Object.keys(value).length>0:!!value;
  validation.applicationError=hasError(body?.error)||hasError(body?.errors);
  if(body?.success!==true)reject('success_flag');
  if(validation.applicationError)reject('application_error');
  const rows=Array.isArray(body.results)?body.results:body.results?.entities;
  validation.envelope=Array.isArray(body.results)?'results_array':Array.isArray(body.results?.entities)?'results_entities':'unsupported';
  if(!Array.isArray(rows))reject('results_envelope');
  validation.rowCount=Math.min(rows.length,11);
  if(rows.length>10)reject('row_limit');
  const list=[];
  for(const [index,x]of rows.entries()){
    validation.rowIndex=index;
    if(!x||typeof x!=='object'||Array.isArray(x))reject('row_object');
    if(typeof x.entity_id!=='string'||!UUID.test(x.entity_id))reject('movie_uuid');
    if((x.subtype??x.type)!=='urn:entity:movie')reject('movie_type');
    if(typeof x.name!=='string'||!x.name.trim()||x.name.length>300||/[\x00-\x1f\x7f]/.test(x.name))reject('movie_title');
    if(sensitiveValue&&(x.name.includes(sensitiveValue)||x.entity_id.includes(sensitiveValue)))reject('credential_reflection');
    list.push({id:x.entity_id.toLowerCase(),name:x.name});
  }
  delete validation.rowIndex;validation.stage='validated';validation.validMovieCount=list.length;
  return {list,validation};
}

export class QlooBudget {
  constructor(ctx,env,fetchImpl=fetch){this.ctx=ctx;this.env=env;this.fetchImpl=fetchImpl;}
  async fetch(request){
    return this.ctx.blockConcurrencyWhile(async()=>{
      const path=new URL(request.url).pathname,operator=path.startsWith('/operator/'),action=path.split('/').at(-1);
      if(request.method==='GET'&&path==='/read-only-status'){
        const used=(await this.ctx.storage.get('used'))??0,pending=(await this.ctx.storage.get('pending'))??false,stopped=(await this.ctx.storage.get('stopped'))??false;
        if(!Number.isInteger(used)||used<0||typeof pending!=='boolean'||typeof stopped!=='boolean')return json(503,{error:'Budget state unavailable.'});
        const grant=(await this.ctx.storage.get('additional-grant'))??null,diagnosticGrant=(await this.ctx.storage.get('diagnostic-grant'))??null,sizedGrant=(await this.ctx.storage.get('sized-grant'))??null;
        return json(200,{grantProtocolVersion:5,grantConfiguration:grantConfiguration(this.env),used,pending,stopped,...(grant?{grant,cumulativeUsed:used+grant.used+(diagnosticGrant?.used??0)+(sizedGrant?.used??0)}:{}),...(diagnosticGrant?{diagnosticGrant}:{}),...(sizedGrant?{sizedGrant}:{}),maximumQlooRequests:1,additionalQlooAllowed:used<1&&!pending&&!stopped&&(liveReady(this.env)||operatorReady(this.env)),httpStatus:(await this.ctx.storage.get('last-http-status'))??null});
      }
      if(path==='/grant/once'){
        if(!await verifyGrant(request,this.env))return json(403,{code:'GRANT_DENIED'});
        let input;try{input=await readJSON(request);}catch{return json(400,{code:'INPUT'});}
        if(!exact(input,['grantId'])||input.grantId!==this.env.QLOO_GRANT_ID)return json(400,{code:'INPUT'});
        // Preserve the old consumed/uncertain ledger. This is one separately approved grant.
        if((await this.ctx.storage.get('used'))!==1||(await this.ctx.storage.get('stopped'))!==true)return json(503,{code:'PRIOR_STATE_CHANGED'});
        const previousGrant=await this.ctx.storage.get('additional-grant');
        const previousDiagnostic=await this.ctx.storage.get('diagnostic-grant');
        if(previousDiagnostic&&!previousGrant)return json(503,{code:'PRIOR_STATE_CHANGED'});
        const storageKey=previousDiagnostic?'sized-grant':previousGrant?'diagnostic-grant':'additional-grant';
        if(previousDiagnostic&&(previousDiagnostic.id===input.grantId||previousDiagnostic.used!==1||previousDiagnostic.stopped!==true))return json(429,{code:'GRANT_CONSUMED'});
        if(previousGrant&&(previousGrant.id===input.grantId||previousGrant.used!==1||previousGrant.stopped!==true))return json(429,{code:'GRANT_CONSUMED'});
        if(await this.ctx.storage.get(storageKey))return json(429,{code:'GRANT_CONSUMED'});
        const grant={id:input.grantId,used:1,pending:true,stopped:true,additionalQlooAllowed:false,httpStatus:null,startedAt:new Date().toISOString()};
        await this.ctx.storage.put(storageKey,grant);
        try{
          const endpoint=new URL('https://hackathon.api.qloo.com/v2/insights');
          endpoint.searchParams.set('filter.type','urn:entity:movie');endpoint.searchParams.set('signal.interests.entities',MOVIE.id);endpoint.searchParams.set('take','10');
          const deadlineAt=Date.now()+QLOO_TIMEOUT_MS;
          const response=await this.fetchImpl.call(globalThis,endpoint,{method:'GET',headers:{Accept:'application/json','X-Api-Key':this.env.QLOO_API_KEY},redirect:'manual',signal:AbortSignal.timeout(QLOO_TIMEOUT_MS)});
          grant.httpStatus=response.status;await this.ctx.storage.put(storageKey,grant);
          const {list,validation}=await boundedResponse(response,this.env.QLOO_API_KEY,{deadlineAt});
          Object.assign(grant,{validation});
          Object.assign(grant,{pending:false,jsonValidated:true,movieCount:list.length,finishedAt:new Date().toISOString()});
          await this.ctx.storage.put(storageKey,grant);
          return json(200,{grant,list,httpStatus:response.status,requestAttempts:1,stopped:true});
        }catch(error){
          Object.assign(grant,{...(error.validation?{validation:error.validation}:{}),finishedAt:new Date().toISOString(),failureCode:['QLOO_AUTH','QLOO_RATE_LIMIT','QLOO_CONTRACT'].includes(error.code)?error.code:'QLOO_FAILURE'});
          await this.ctx.storage.put(storageKey,grant);return json(503,{grant,code:grant.failureCode});
        }
      }
      if(operator){
        if(!await verifyOperator(request,this.env,action))return json(403,{code:'OPERATOR_DENIED',error:'Operator request unavailable.'});
      }else if(!liveReady(this.env))return json(503,{code:'LIVE_DISABLED',error:'Live requests are disabled or not configured.'});
      if(request.method!=='POST'||(!operator&&path!=='/recommend'))return json(404,{error:'Not found.'});
      let input;try{input=await readJSON(request);}catch{return json(400,{error:'Invalid ledger request.'});}
      if(operator){
        if(!exact(input,['runId'])||input.runId!==this.env.QLOO_OPERATOR_RUN_ID)return json(400,{error:'Invalid operator request.'});
        const used=(await this.ctx.storage.get('used'))??0,pending=(await this.ctx.storage.get('pending'))??false,stopped=(await this.ctx.storage.get('stopped'))??false;
        if(action==='status')return json(200,{used,pending,stopped,maximumQlooRequests:1,additionalQlooAllowed:used<1&&!pending&&!stopped,httpStatus:(await this.ctx.storage.get('last-http-status'))??null,finishedAt:(await this.ctx.storage.get('finished-at'))??null});
        if(used>=1)return json(429,{code:'LOCAL_BUDGET',error:'One-request authorization consumed. No resend.'});
      }else if(!exact(input,['id'])||input.id!==MOVIE.id)return json(400,{error:'Only the fixed public sample movie is allowed.'});
      const stopped=await this.ctx.storage.get('stopped');if(stopped)return json(503,{code:'QLOO_STOPPED',error:'Live access stopped. Owner review required.'});
      if(await this.ctx.storage.get('pending'))return json(503,{code:'QLOO_STOPPED',error:'An earlier request outcome is uncertain. Owner review required.'});
      const cached=await this.ctx.storage.get('sample-list');if(cached)return json(200,{list:cached,reused:true});
      const used=(await this.ctx.storage.get('used'))??0;
      if(used>=(operator?1:Number(this.env.QLOO_TOTAL_REQUEST_LIMIT)))return json(429,{code:'LOCAL_BUDGET',error:'Lifetime Qloo request limit reached.'});
      // A durable reservation precedes sending; failures/uncertainty never refund it.
      await this.ctx.storage.put({used:used+1,pending:true});
      try{
        const endpoint=new URL('https://hackathon.api.qloo.com/v2/insights');
        endpoint.searchParams.set('filter.type','urn:entity:movie');endpoint.searchParams.set('signal.interests.entities',MOVIE.id);endpoint.searchParams.set('take','10');
        const deadlineAt=Date.now()+QLOO_TIMEOUT_MS;
          const response=await this.fetchImpl.call(globalThis,endpoint,{method:'GET',headers:{Accept:'application/json','X-Api-Key':this.env.QLOO_API_KEY},redirect:'manual',signal:AbortSignal.timeout(QLOO_TIMEOUT_MS)});
        await this.ctx.storage.put('last-http-status',response.status);
        const {list,validation}=await boundedResponse(response,this.env.QLOO_API_KEY,{deadlineAt});await this.ctx.storage.put('last-validation',validation);await this.ctx.storage.put({'sample-list':list,pending:false,'finished-at':new Date().toISOString(),...(operator?{stopped:true}:{})});return json(200,{list,reused:false,httpStatus:response.status,requestAttempts:1,stopped:operator});
      }catch(error){
        await this.ctx.storage.put('stopped',true);
        if(error.validation)await this.ctx.storage.put('last-validation',error.validation);
        return json(503,{code:['QLOO_AUTH','QLOO_RATE_LIMIT','QLOO_CONTRACT'].includes(error.code)?error.code:'QLOO_FAILURE',error:'Qloo request failed or is uncertain. Stopped without retry or fallback.'});
      }
    });
  }
}
