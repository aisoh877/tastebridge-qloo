export async function mountLiveWorkflow(document,fetchImpl=fetch) {
  const $=s=>document.querySelector(s), rows=[];
  let enabled=false,busy=false,mode='disabled',revision=0;
  function clear(){ $('#live-results').replaceChildren();$('#live-trace').replaceChildren(); }
  function controls(){
    for(const row of rows){
      row.query.disabled=row.search.disabled=busy||!enabled;
      row.select.disabled=busy||!enabled||!row.choices.length;
      row.confirm.disabled=busy||!enabled||!row.select.value;
    }
    $('#live-compare').disabled=busy||!enabled||rows.some(r=>!r.token||!r.select.value||!r.confirm.checked);
    $('#retry-status').disabled=busy;
  }
  function invalidate(row){revision++;row.confirm.checked=false;clear();controls();$('#live-status').textContent='Choices changed. Confirm each current selection before comparing.';}
  async function call(name,args){
    const response=await fetchImpl('/api/tools/call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,arguments:args}),signal:AbortSignal.timeout(name==='resolve_movie'?10000:30000)});
    const body=await response.json();
    if(!response.ok)throw new Error(body?.error??'Workflow failed. No fallback.');
    if(body?.mode!==mode)throw new Error('Connection mode changed. Reload and review before continuing.');
    return body;
  }
  ['Alex','Morgan','Sam'].forEach((name,i)=>{
    const form=document.createElement('form'),fieldset=document.createElement('fieldset'),legend=document.createElement('legend');
    legend.textContent=name;fieldset.append(legend);
    function labelled(text,element,id){const label=document.createElement('label');label.htmlFor=id;label.textContent=text;element.id=id;fieldset.append(label,element);return element;}
    const query=labelled(`${name}: movie title`,document.createElement('input'),`query${i}`);query.type='search';query.maxLength=120;query.required=true;
    const search=document.createElement('button');search.type='submit';search.textContent=`Resolve ${name}'s title`;fieldset.append(search);
    const select=labelled(`${name}: matching movie`,document.createElement('select'),`choice${i}`);
    const confirm=labelled(`${name}: I confirm this movie and its ID`,document.createElement('input'),`confirmed${i}`);confirm.type='checkbox';
    const detail=document.createElement('p');detail.className='fine';fieldset.append(detail);
    form.append(fieldset);$('#live-people').append(form);
    const row={query,search,select,confirm,detail,choices:[],token:null};rows.push(row);
    query.addEventListener('input',()=>{row.token=null;row.choices=[];select.replaceChildren();detail.textContent='';invalidate(row);});
    select.addEventListener('change',()=>{const choice=row.choices.find(c=>c.id===select.value);detail.textContent=choice?`Selected movie: ${choice.name} · ID: ${choice.id}`:'';invalidate(row);});
    confirm.addEventListener('change',()=>{revision++;clear();controls();});
    form.onsubmit=async event=>{
      event.preventDefault();if(busy||!enabled)return;
      busy=true;row.token=null;row.choices=[];select.replaceChildren();detail.textContent='';invalidate(row);controls();
      $('#live-status').textContent=`Resolving ${name}'s title…`;
      const requestRevision=revision;
      try {
        const result=await call('resolve_movie',{participant:i,query:query.value});
        if(requestRevision!==revision)return;
        if(!Array.isArray(result.choices)||typeof result.token!=='string')throw new Error('Invalid title response.');
        row.choices=result.choices;row.token=result.token;
        const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=result.choices.length?'Choose a match; no automatic selection':'No movie matched. Refine the title.';select.append(placeholder);
        for(const choice of result.choices){const option=document.createElement('option');option.value=choice.id;option.textContent=choice.name+(choice.year?` (${choice.year})`:'')+' · '+choice.id;select.append(option);}
        $('#live-status').textContent=result.choices.length?'Inspect the matches and explicitly confirm the intended movie.':'No movie matched. Refine the title; no recommendation was requested.';
      } catch(error){$('#live-status').textContent=error.name==='TimeoutError'?'Title lookup timed out. No automatic retry.':error.message;}
      finally{busy=false;controls();}
    };
  });
  async function readiness(){
    busy=true;enabled=false;clear();controls();
    try {
      const response=await fetchImpl('/api/live/status',{signal:AbortSignal.timeout(8000)});const status=await response.json();
      if(!response.ok||!['disabled','mock-only','live'].includes(status?.mode)||typeof status.enabled!=='boolean')throw new Error('Readiness unavailable.');
      mode=status.mode;enabled=mode!=='disabled'&&status.enabled;
      $('#mode').textContent=(mode==='mock-only'?'MOCK ONLY · No Qloo connection. ':mode==='live'?'Qloo harness enabled · Real requests use the approved allowance. ':'LIVE DISABLED · ')+status.notice;
      $('#live-status').textContent=enabled?'Resolve three titles and confirm each match.':'The fixture demo remains available. This page cannot enable live access.';
      $('#retry-status').hidden=true;
    }catch{$('#mode').textContent='Connection status unavailable. Calls are disabled.';$('#retry-status').hidden=false;}
    finally{busy=false;controls();}
  }
  $('#retry-status').onclick=readiness;
  $('#live-compare').onclick=async()=>{
    if(busy||!enabled||rows.some(r=>!r.confirm.checked||!r.select.value||!r.token))return;
    const requestRevision=revision;busy=true;clear();controls();$('#live-status').textContent=mode==='mock-only'?'Replaying one recorded public list for three invented selections…':'Retrieving the bounded public sample and comparing selections…';
    try{
      const result=await call('compare_confirmed_movies',{selections:rows.map((r,i)=>({participant:i,token:r.token,id:r.select.value,confirmed:r.confirm.checked}))});
      if(requestRevision!==revision)return;
      if(!Array.isArray(result.candidates)||!Array.isArray(result.trace)||!Array.isArray(result.people)||!['proposal','needs-discussion'].includes(result.status))throw new Error('Invalid comparison response.');
      $('#live-status').textContent=mode==='mock-only'?'Recorded replay only. The same stored response is shown for all three invented inputs; this is not evidence of agreement.':(result.status==='proposal'?'Qloo sample result. Shared candidates found. Same-film selections reuse one list. The group decides.':'Qloo sample result. No shared candidate; discuss alternatives.');
      for(const candidate of result.candidates){
        const card=document.createElement('article'),title=document.createElement('h2'),detail=document.createElement('p');
        title.textContent=candidate.name;detail.textContent=`${mode==='mock-only'?'Replay coverage':'Coverage'} ${candidate.coverage}/3 · `+result.people.map((name,i)=>`${name}: ${candidate.ranks[i]?'rank '+candidate.ranks[i]:'not returned'}`).join(' · ');card.append(title,detail);$('#live-results').append(card);
      }
      for(const step of result.trace){const li=document.createElement('li');li.textContent=step.step+': '+step.detail;$('#live-trace').append(li);}
    }catch(error){clear();$('#live-status').textContent=error.name==='TimeoutError'?'Comparison timed out. No automatic retry or fallback.':error.message;}
    finally{busy=false;controls();}
  };
  await readiness();
}

if(typeof document!=='undefined'){
  const button=document.querySelector('#show-verified'),output=document.querySelector('#verified-movies'),status=document.querySelector('#verified-status');
  button.addEventListener('click',async()=>{
    button.disabled=true;output.replaceChildren();status.textContent='Loading the stored result. No Qloo request.';
    try{
      const response=await fetch('/api/verified-sample',{signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error();
      const sample=await response.json();
      if(sample.kind!=='recorded-worker-response'||sample.seed?.id!=='b7f09b1e-dd1c-4a40-86a9-5acfd8876967'||sample.jsonValidated!==true||sample.success!==true||!Array.isArray(sample.movies)||sample.movies.length!==10||sample.movies.some(x=>typeof x.name!=='string'||x.name.length>300))throw new Error();
      for(const movie of sample.movies){const item=document.createElement('li');item.textContent=movie.name;output.append(item);}
      status.textContent='Replay of previously retrieved real API results: 10 movies. No new Qloo request; not live or individually personalized.';
      button.textContent='Replay stored results again';
    }catch{status.textContent='Stored result could not be loaded. No automatic retry and no Qloo request.';}
    finally{button.disabled=false;}
  });
  button.disabled=false;
}
if(typeof document!=='undefined')await mountLiveWorkflow(document);
