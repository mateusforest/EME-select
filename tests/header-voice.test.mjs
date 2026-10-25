import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeaderVoice} from '../src/experience/header-voice.js';
function setup(available=true){
 const node=()=>({value:'Casa',hidden:true,readOnly:false,textContent:'',attributes:{},events:{},classList:{add(){},remove(){}},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,v){this.events[k]=v;},focus(){}});
 const elements={input:node(),button:node(),panel:node(),message:node(),stop:node(),cancel:node()};let recognition;
 class Recognition {constructor(){recognition=this;}start(){this.onstart();}stop(){this.onend?.();}abort(){this.aborted=true;}}
 return {...elements,controller:createHeaderVoice({...elements,Recognition:available?Recognition:undefined}),recognition:()=>recognition};
}
test('header voice transcribes for review, stops, and cancellation restores original search',()=>{
 const v=setup();v.controller.start();assert.equal(v.panel.hidden,false);assert.equal(v.input.readOnly,true);
 v.recognition().onresult({results:[[{transcript:'Apartamento em Vacaria'}]]});assert.equal(v.input.value,'Apartamento em Vacaria');
 v.stop.events.click();assert.equal(v.input.readOnly,false);assert.match(v.message.textContent,/Revise/);
 v.controller.start();v.recognition().onresult({results:[[{transcript:'Terreno'}]]});const active=v.recognition();v.cancel.events.click();assert.equal(active.aborted,true);assert.equal(active.onresult,null);assert.equal(v.input.value,'Apartamento em Vacaria');assert.equal(v.panel.hidden,true);
});
test('denied permission is preserved after end and unavailable speech has a typing fallback',()=>{
 const v=setup();v.controller.start();v.recognition().onerror({error:'not-allowed'});v.recognition().onend();assert.match(v.message.textContent,/não autorizado/);assert.equal(v.input.readOnly,false);
 const unsupported=setup(false);unsupported.controller.start();assert.match(unsupported.message.textContent,/indisponível/);assert.equal(unsupported.stop.hidden,true);
});
test('submitting stops recognition and prevents late results from replacing the search',()=>{
 const v=setup();v.controller.start();const active=v.recognition();v.controller.finish();assert.equal(active.aborted,true);assert.equal(active.onresult,null);assert.equal(v.panel.hidden,true);
});
