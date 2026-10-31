export function operatorReady(env){
  return env.QLOO_OPERATOR_STOP==='false'&&/^[0-9a-f-]{36}$/.test(env.QLOO_OPERATOR_RUN_ID??'')&&Date.parse(env.QLOO_OPERATOR_EXPIRES_AT)>Date.now()&&typeof env.QLOO_API_KEY==='string'&&!!env.QLOO_API_KEY;
}
export async function verifyOperator(request,env,action){
  if(!operatorReady(env)||!['once','status'].includes(action)||request.method!=='POST')return false;
  const signature=request.headers.get('X-TasteBridge-Authorization')??'';
  if(!/^[0-9a-f]{64}$/.test(signature))return false;
  const signatureBytes=Uint8Array.from(signature.match(/../g),x=>parseInt(x,16));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.QLOO_API_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',key,signatureBytes,new TextEncoder().encode(`TasteBridge operator v1\n${env.QLOO_OPERATOR_RUN_ID}\n${action}`));
}
