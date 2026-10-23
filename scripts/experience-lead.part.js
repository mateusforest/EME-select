  let leadRequestId=crypto.randomUUID(),leadSending=false;
  async function submitLead() {
    if(leadSending)return;
    const phone=leadForm.elements.phone.value.replace(/\D/g,'');
    const error=root.querySelector('.ex-error'),button=leadForm.querySelector('button');
    error.hidden=true;
    if(leadForm.elements.name.value.trim().length<2){error.textContent='Conte como podemos chamar você.';error.hidden=false;return;}
    if(!/^\d{10,11}$/.test(phone)&&!/^55\d{10,11}$/.test(phone)){error.textContent='Confira o WhatsApp, incluindo o DDD.';error.hidden=false;return;}
    if(!leadForm.elements.consent.checked){error.textContent='Autorize o contato para continuar.';error.hidden=false;return;}
    const interest=leadPropertyId?byId(leadPropertyId).full:criteriaText()||'Quero conhecer a coleção EME Select';
    const q=new URLSearchParams(location.search);
    const body={requestId:leadRequestId,name:leadForm.elements.name.value.trim(),phone,consent:true,propertyId:leadPropertyId,interest:interest.slice(0,400),message:criteriaText().slice(0,1500),intent:leadKind==='visit'?'visit':'contact',source:{page:(location.pathname+location.hash.split('?')[0]).slice(0,300),origin:(q.get('utm_source')||'').slice(0,100),medium:(q.get('utm_medium')||'').slice(0,100),campaign:(q.get('utm_campaign')||'').slice(0,150)}};
    leadSending=true;button.disabled=true;button.textContent='Enviando…';
    try{
      const response=await fetch('/api/public/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
      const data=await response.json();
      if(!response.ok||data.received!==true)throw Error(data.error||'Não foi possível confirmar o registro. Tente novamente.');
      root.querySelector('.ex-success-copy').textContent='Seu interesse: '+interest+'. Protocolo: '+String(data.reference).slice(0,8).toUpperCase()+'.';
      leadForm.reset();leadForm.hidden=true;root.querySelector('.ex-success').hidden=false;
    }catch(e){error.textContent=e.name==='TimeoutError'?'Não foi possível confirmar o envio. Tente novamente com este mesmo pedido.':e.message||'Confira sua conexão e tente novamente.';error.hidden=false;}
    finally{leadSending=false;button.disabled=false;button.textContent='Solicitar contato ↗';}
  }
