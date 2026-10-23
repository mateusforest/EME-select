// Stateless API requests; only this page retains conversation history.
export function conversationWindow(messages){
 const result=messages.filter(message=>!message.welcome).map(message=>({role:message.from==='Você'?'user':'assistant',content:message.text})).slice(-24);
 while(result.length>1&&result.reduce((size,message)=>size+message.content.length,0)>20000)result.shift();
 return result;
}
export function createChatTransport(fetcher=fetch){
 let controller=null,version=0;
 return {
  cancel(){version++;controller?.abort();controller=null;},
  async send(messages,context){
   controller?.abort();const active=++version;const request=new AbortController();controller=request;
   try{
    const response=await fetcher('/api/public/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:conversationWindow(messages),context}),signal:AbortSignal.any([request.signal,AbortSignal.timeout(95000)])});
    const body=await response.json();
    if(active!==version)return null;
    if(!response.ok)throw Error(typeof body.error==='string'?body.error:'O M não conseguiu responder agora. Tente novamente ou fale com a equipe.');
    if(body.provider!=='openai'||typeof body.reply!=='string'||!body.reply.trim()||!Array.isArray(body.properties)||!Array.isArray(body.propertyIds)||typeof body.searchSummary!=='string'||!['none','team','visit','owner'].includes(body.handoff))throw Error('A resposta não chegou completa. Tente novamente.');
    return body;
   }catch(error){
    if(active!==version)return null;
    throw Error(error.name==='TimeoutError'?'O M demorou para responder. Você pode tentar novamente ou falar com a equipe.':error instanceof TypeError?'Confira sua conexão e tente novamente.':error.message);
   }finally{if(active===version)controller=null;}
  }
 };
}
