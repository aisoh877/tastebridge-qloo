// One expiring capability for a separately approved request. Never uses a Qloo key client-side.
export async function verifyGrant(request,env){
  if(request.method!=='POST'||env.QLOO_GRANT_STOP!=='false'||!env.QLOO_API_KEY||!/^[0-9a-f-]{36}$/.test(env.QLOO_GRANT_ID??'')||!Number.isFinite(Date.parse(env.QLOO_GRANT_EXPIRES_AT))||Date.parse(env.QLOO_GRANT_EXPIRES_AT)<=Date.now()||!/^[0-9a-f]{64}$/.test(env.QLOO_GRANT_HASH??''))return false;
  const token=request.headers.get('X-TasteBridge-Grant')??'';if(!/^[0-9a-f]{64}$/.test(token))return false;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  const expected=Uint8Array.from(env.QLOO_GRANT_HASH.match(/../g),x=>parseInt(x,16));
  let diff=0;new Uint8Array(bytes).forEach((x,i)=>{diff|=x^expected[i];});return diff===0;
}

export function grantConfiguration(env){return {protocolVersion:4,id:env.QLOO_GRANT_ID??null,expiresAt:env.QLOO_GRANT_EXPIRES_AT??null,enabled:env.QLOO_GRANT_STOP==='false'&&/^[0-9a-f]{64}$/.test(env.QLOO_GRANT_HASH??'')&&Date.parse(env.QLOO_GRANT_EXPIRES_AT)>Date.now()&&!!env.QLOO_API_KEY};}
