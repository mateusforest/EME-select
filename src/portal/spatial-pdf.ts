import {estimateSpatialProject,spatialLevels,type SpatialProject} from '../../shared/spatial-studio.mjs';
import {defaultProposal,sceneAssets,sceneFinishes,sceneRooms} from '../../shared/spatial-scene.mjs';
import {downloadBlob} from './spatial-export';
let library:Promise<any>|undefined;
function loadPDF(){return library||=(new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/pdf-lib/pdf-lib.min.js';script.onload=()=>resolve((window as any).PDFLib);script.onerror=()=>{library=undefined;script.remove();reject(new Error('Não foi possível carregar a exportação PDF.'));};document.head.append(script);}));}
async function photo(file:string,width:number,height:number){
 const response=await fetch('/assets/developments/g400/'+file);if(!response.ok)throw Error('Não foi possível carregar as imagens da proposta.');
 const bitmap=await createImageBitmap(await response.blob());const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d')!;
 const scale=Math.max(width/bitmap.width,height/bitmap.height);ctx.drawImage(bitmap,(width-bitmap.width*scale)/2,(height-bitmap.height*scale)/2,bitmap.width*scale,bitmap.height*scale);bitmap.close();
 return new Uint8Array(await(await fetch(canvas.toDataURL('image/jpeg',.9))).arrayBuffer());
}
export async function makeSpatialPDF(project:SpatialProject,internal=false,revision?:number){
 const {PDFDocument,StandardFonts,rgb}=await loadPDF();const pdf=await PDFDocument.create();
 pdf.setTitle('EME Spatial | '+project.name);pdf.setAuthor('EME Select');pdf.setSubject(internal?'Relatório interno de produção':'Proposta de experiência imobiliária');
 const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),serif=await pdf.embedFont(StandardFonts.TimesRoman);
 const ink=rgb(.08,.23,.18),muted=rgb(.37,.43,.36),paper=rgb(.966,.96,.929),line=rgb(.81,.84,.77),white=rgb(1,1,1);
 const W=595.28,H=841.89,M=44,width=W-M*2;let page:any,y=0;const pages:any[]=[];
 // Built-in PDF fonts support Latin typography. Unsupported glyphs are replaced, never allowed to break export.
 const clean=(text:string)=>[...String(text).normalize('NFC').replace(/[\u2010-\u2015]/g,'-').replace(/\t/g,' ')].map(ch=>{if(ch==='\n')return ch;try{regular.encodeText(ch);return ch;}catch{return '?';}}).join('');
 function lines(text:string,font:any,size:number,max=width){const out:string[]=[];for(const para of clean(text).split('\n')){let current='';for(const raw of para.split(/\s+/).filter(Boolean)){let word=raw;while(font.widthOfTextAtSize(word,size)>max){let count=1;while(count<word.length&&font.widthOfTextAtSize(word.slice(0,count+1),size)<=max)count++;if(current){out.push(current);current='';}out.push(word.slice(0,count));word=word.slice(count);}const trial=current?current+' '+word:word;if(font.widthOfTextAtSize(trial,size)>max){out.push(current);current=word;}else current=trial;}out.push(current);}return out;}
 function draw(text:string,x:number,top:number,size=11,font=regular,color=ink){page.drawText(clean(text),{x,y:H-top-size,size,font,color});}
 function rect(x:number,top:number,w:number,h:number,color:any){page.drawRectangle({x,y:H-top-h,width:w,height:h,color});}
 function newPage(kicker:string,title:string){page=pdf.addPage([W,H]);pages.push(page);rect(0,0,W,H,paper);draw('EME SPATIAL',M,30,10,bold);draw(internal?'USO INTERNO':'PROPOSTA PRELIMINAR',W-205,30,8,regular,muted);rect(M,54,width,.6,line);draw(kicker.toUpperCase(),M,79,9,bold,muted);y=101;for(const item of lines(title,serif,30)){draw(item,M,y,30,serif);y+=34;}y+=22;}
 function ensure(h:number){if(y+h>H-68)newPage('Continuação','O projeto em detalhe.');}
 function paragraph(text:string,size=11,font=regular,color=ink){for(const item of lines(text,font,size)){ensure(size*1.55);draw(item,M,y,size,font,color);y+=size*1.55;}y+=12;}
 function heading(text:string){ensure(70);paragraph(text,18,serif);}
 function item(label:string,text:string){ensure(65);paragraph(label,11,bold);paragraph(text,10,regular,muted);}
 const p={...defaultProposal(),...project.proposal},e=estimateSpatialProject(project),level=spatialLevels.find(l=>l.id===project.level)!,scene=project.scene;
 const assets=(scene?.assets||['fachada-1','living','piscina']).map(id=>sceneAssets.find(a=>a.id===id)!);
 const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
 const scope=project.scope==='full'?'G400 completo':project.scope==='pilot'?'Piloto: uma tipologia e um ambiente social':'Escopo personalizado';
 // Cover: all images are identified as supplied references, not generated deliverables.
 page=pdf.addPage([W,H]);pages.push(page);rect(0,0,W,H,ink);draw('EME SPATIAL',M,38,12,bold,white);draw('ESTÚDIO DE ESPAÇOS',M,59,8,regular,line);
 const hero=await pdf.embedJpg(await photo(assets[0].file,1200,850));page.drawImage(hero,{x:M,y:H-110-345,width,height:345});
 draw('REFERÊNCIA DO EMPREENDIMENTO / G400',M,469,8,regular,line);
 let titleSize=32;while(lines(project.name,serif,titleSize).length>3&&titleSize>12)titleSize--;
 y=503;for(const text of lines(project.name,serif,titleSize)){draw(text,M,y,titleSize,serif,white);y+=titleSize+4;}
 for(const text of lines(level.label+' / '+scope,regular,11)){draw(text,M,y+12,11,regular,line);y+=16;}
 const recipient=p.recipient||'Apresentação do projeto';let top=685;for(const text of lines(recipient,regular,11)){draw(text,M,top,11,regular,white);top+=15;}
 draw(new Date().toLocaleDateString('pt-BR')+' · '+(revision?'Base salva v'+revision:'Rascunho para revisão'),M,768,9,regular,line);
 newPage('01 / Experiência e escopo','Uma entrega com intenção.');
 paragraph('Uma experiência digital para apresentar os espaços, explorar possibilidades e apoiar a conversa comercial.');
 item('NÍVEL PROPOSTO · '+level.label,level.description);
 item('ABRANGÊNCIA',scope+(project.scope==='full'?'. Base de planejamento: oito tipologias, 13 níveis internos e 31 unidades, áreas comuns e garagens.':'. A seleção exata dos ambientes e o limite de revisões serão confirmados no escopo final.'));
 heading('Entregáveis previstos');
 const standard=project.level==='visual'?'Apresentação web por imagens, percurso entre referências selecionadas, organização de plantas e pontos de interesse. Não inclui caminhada livre.':project.level==='interactive'?'Experiência web navegável com geometria validada, ambientes selecionados, materiais, iluminação e pontos de visita. Expansão para cada tipologia conforme escopo aprovado.':'Experiência de alto realismo, com produção artística, materiais, iluminação e infraestrutura definidos após validação do piloto. Não é uma capacidade automática já concluída do estúdio.';
 paragraph(p.deliverables||standard);
 heading('O que já foi montado no estúdio');
 paragraph(scene?(scene.mode==='tipo5'?'Estudo 3D configurado: apartamento Tipo 5.':'Apresentação configurada por imagens do G400.')+' Acervo selecionado: '+assets.map(a=>a.label).join(', ')+'.':'Nenhum cenário montado neste projeto. Esta proposta descreve a entrega pretendida.');
 if(scene?.mode==='tipo5')paragraph('Acabamento: '+sceneFinishes.find(f=>f.id===scene.finish)?.label+'. Luz inicial: '+scene.hour+' h. Início: '+sceneRooms.find(r=>r.id===scene.room)?.label+'.',10,regular,muted);
 paragraph('A configuração atual é um estudo de produção. Não comprova medidas executivas, fidelidade final, disponibilidade de unidades ou aprovação do empreendimento.',10,regular,muted);
 newPage('02 / Investimento','O valor da experiência.');
 paragraph('Estimativa de implantação para o nível e o escopo selecionados. Valores sujeitos à validação do piloto e à proposta final.');
 const rows=[['Preço de referência',money(e.price)],['Cortesia / condição comercial',money(e.price-e.payable)],['Investimento a cobrar',money(e.payable)]];
 for(const [i,[label,value]] of rows.entries()){rect(M,y,width,73,i===2?ink:rgb(.92,.93,.89));draw(label,M+18,y+15,10,regular,i===2?line:muted);draw(value,M+18,y+34,24,serif,i===2?white:ink);y+=86;}
 if(project.courtesy===1)paragraph('Cortesia integral de implantação nesta simulação. O valor de referência demonstra o investimento estimado na solução; não representa um valor já desembolsado.',11);
 heading('Prazo e condições');
 paragraph('Janela de planejamento: '+e.weeks+' semanas, condicionada ao acervo, à validação do piloto e aos retornos de revisão. Não constitui data contratada.');
 paragraph(p.conditions,11);
 item('LICENÇA E OPERAÇÃO','Uso da experiência no empreendimento e nos canais definidos na proposta final. Hospedagem, suporte, consumo de processamento e direitos de distribuição serão especificados separadamente.');
 newPage('03 / Direção visual','Do acervo à experiência.');
 const pair=assets.slice(0,2);for(const a of pair){ensure(220);const picture=await pdf.embedJpg(await photo(a.file,1100,390));page.drawImage(picture,{x:M,y:H-y-176,width,height:176});y+=185;draw(a.label+' · referência fornecida',M,y,9,regular,muted);y+=30;}
 item('PERCURSO DE PRODUÇÃO','Conferência do acervo e das medidas; composição do piloto; materiais e iluminação; revisão da navegação; avaliação de desempenho; aprovação da versão a publicar.');
 item('CRITÉRIO DE ENTREGA','Aprovar os ambientes incluídos, a fidelidade à planta, a qualidade visual e os dispositivos atendidos. A publicação ocorre depois da revisão da equipe.');
 if(internal){newPage('04 / Gestão interna','Premissas e investimento.');paragraph('CONFIDENCIAL · Não encaminhar esta seção como proposta comercial.',10,bold);
  for(const [label,text] of [['Base manual',project.manualHours+' horas'],['Automação simulada',Math.round(project.automatableShare*100)+'% elegível × '+Math.round(project.reductionTarget*100)+'% de redução'],['Esforço restante',e.remainingHours.toFixed(1)+' horas'],['Capacidade',project.people+' pessoas × '+project.hoursPerWeek+' h/semana; '+project.reviewWeeks+' semana(s) adicional(is)'],['Custo/hora',money(project.hourCost)],['Recursos diretos',money(project.resources)],['Reserva',Math.round(project.contingency*100)+'%'],['Custo econômico com reserva',money(e.cost)],['Tributos / margem',Math.round(project.tax*100)+'% / '+Math.round(project.margin*100)+'%'],['Investimento na plataforma',project.platformInvestment?money(project.platformInvestment)+' (separado da implantação)':'Ainda não estimado']]){ensure(35);draw(label,M,y,10,bold);for(const textLine of lines(text,regular,10,260)){draw(textLine,M+220,y,10,regular);y+=15;}y+=10;}
  paragraph('As premissas de automação não são ganhos medidos. O custo da plataforma fica separado da produção do cliente. Operação mensal e desenvolvimento do motor não estão embutidos automaticamente no prazo.',10,regular,muted);
 }
 pages.forEach((p:any,i:number)=>{if(i===0)return;p.drawLine({start:{x:M,y:43},end:{x:W-M,y:43},thickness:.6,color:line});p.drawText('EME SELECT / SPATIAL'+(internal?' / INTERNO':''),{x:M,y:27,font:regular,size:8,color:muted});p.drawText(String(i+1).padStart(2,'0')+' / '+pages.length,{x:W-M-40,y:27,font:regular,size:8,color:muted});});
 return new Blob([await pdf.save()],{type:'application/pdf'});
}
export async function downloadSpatialPDF(project:SpatialProject,internal=false,revision?:number){const blob=await makeSpatialPDF(project,internal,revision);downloadBlob(blob,internal?'EME-Spatial-Relatorio-Interno.pdf':'EME-Spatial-Proposta.pdf');}
