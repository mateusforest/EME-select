import {validateProposal,proposalMoney} from './acquisition-proposal.mjs';

// A single renderer for browser downloads and automated visual verification.
export async function renderAcquisitionPDF(record,{PDFLib,fontkit,regularBytes,mediumBytes,logoBytes,photoBytes}){
 const p=validateProposal(record.proposal);
 const {PDFDocument,rgb,pushGraphicsState,popGraphicsState,moveTo,lineTo,appendBezierCurve,closePath,clip,endPath}=PDFLib;
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const regular=await pdf.embedFont(regularBytes,{subset:true}),medium=await pdf.embedFont(mediumBytes,{subset:true});
 const logo=await pdf.embedPng(logoBytes),photo=photoBytes?await pdf.embedJpg(photoBytes):null;
 pdf.setTitle('Proposta de aquisição · '+p.title);pdf.setAuthor('EME Select');pdf.setSubject(record.reference+' · '+p.clientName);pdf.setLanguage('pt-BR');
 const W=595.28,H=841.89,M=38,CW=W-2*M;
 const color=hex=>rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255);
 const ink=color('173f34'),muted=color('6a8177'),paper=color('f5f3ea'),gold=color('ba9a58'),pale=color('e5e9dd'),line=color('cbd4c8'),light=color('eeeede'),dark=color('0d2f26');
 let page,y;const pages=[];
 const clean=text=>String(text).normalize('NFC').replace(/\t/g,' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
 function draw(text,x,top,size=10,tone=ink,font=regular){page.drawText(clean(text),{x,y:H-top-size,size,font,color:tone});}
 function rect(x,top,width,height,tone){page.drawRectangle({x,y:H-top-height,width,height,color:tone});}
 function rule(top,x=M,width=CW,tone=line){rect(x,top,width,.55,tone);}
 function lines(text,size,width,font=regular){
  const out=[];for(const paragraph of clean(text).split('\n')){let current='';for(let word of paragraph.split(/\s+/).filter(Boolean)){
   while(font.widthOfTextAtSize(word,size)>width){let n=1;while(n<word.length&&font.widthOfTextAtSize(word.slice(0,n+1),size)<=width)n++;if(current){out.push(current);current='';}out.push(word.slice(0,n));word=word.slice(n);}
   if(!word)continue;const trial=current?current+' '+word:word;if(font.widthOfTextAtSize(trial,size)>width){out.push(current);current=word;}else current=trial;
  }out.push(current);}return out;
 }
 function block(text,x,top,width,size=10,tone=ink,leading=1.5){const content=lines(text,size,width);content.forEach((line,i)=>draw(line,x,top+i*size*leading,size,tone));return content.length*size*leading;}
 function fit(text,x,top,width,height,size,min=9,tone=ink){while(size>min&&lines(text,size,width).length*size*1.18>height)size-=.5;const content=lines(text,size,width);if(content.length*size*1.18>height)throw Error('Reduza o texto “'+String(text).slice(0,32)+'” para caber na capa.');content.forEach((line,i)=>draw(line,x,top+i*size*1.18,size,tone));}
 function label(text,x,top,tone=gold){draw(text.toLocaleUpperCase('pt-BR'),x,top,7,tone,medium);}
 const date=d=>new Date(d+'T12:00:00Z').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).replace(/ de /g,' ');
 function newPage(){page=pdf.addPage([W,H]);pages.push(page);rect(0,0,W,H,paper);page.drawImage(logo,{x:M,y:H-64,width:40,height:40*logo.height/logo.width});draw('EME SELECT',M+59,32,8,ink,medium);draw('Proposta de aquisição',M+59,51,8,muted);draw(record.reference,W-M-regular.widthOfTextAtSize(record.reference,8),32,8);const stamp=date(p.issuedOn).toUpperCase()+' · REVISÃO '+String(record.version||1).padStart(2,'0');draw(stamp,W-M-regular.widthOfTextAtSize(stamp,6.5),49,6.5,muted);rule(84);y=109;}
 newPage();
 label(p.eyebrow,M,110);const hasUnit=!!(p.unit||p.block);
 fit(p.title,M,139,hasUnit?CW-135:CW,69,p.title.length<18?64:37,18);
 if(hasUnit){fit(p.unit,W-M-123,151,123,33,19,11);fit(p.block,W-M-123,184,123,28,10,8,muted);}
 fit(p.location,M,213,CW,24,10,8,muted);
 rect(0,474,W,H-474,ink);
 if(photo){
  // Clip the image to the reference's curved upper right corner.
  const x=M,bottom=H-531,top=H-247,right=W-M,r=70;
  page.pushOperators(pushGraphicsState(),moveTo(x,bottom),lineTo(right,bottom),lineTo(right,top-r),appendBezierCurve(right,top-r*.45,right-r*.45,top,right-r,top),lineTo(x,top),closePath(),clip(),endPath());
  const scale=Math.max(CW/photo.width,284/photo.height),w=photo.width*scale,h=photo.height*scale;
  page.drawImage(photo,{x:M+(CW-w)/2,y:bottom+(284-h)/2,width:w,height:h});page.pushOperators(popGraphicsState());
 }else{rect(M,247,CW,284,pale);draw('Imagem do imóvel não informada',M+24,365,13,muted);}
 if(photo)draw(p.photoCaption,M+10,515,5.5,light);
 rect(W-M-210,474,210,151,dark);rect(W-M-210,474,210,3,gold);
 label('Investimento proposto',W-M-191,491);fit(proposalMoney(p.proposedPrice),W-M-193,510,178,35,25,15,light);draw('Valor total da aquisição',W-M-191,551,8,muted);rule(568,W-M-191,171,color('355448'));draw('Valor anunciado',W-M-191,579,7,muted);draw(proposalMoney(p.advertisedPrice),W-M-191,594,10,light);
 label('Preparada para',M,557);fit(p.clientName,M,578,285,54,20,11,light);fit(p.intro,M,642,300,45,10,8,light);
 rule(698,M,CW,color('456052'));const column=(CW-24)/3;
 for(const [i,title,text]of [[0,'O imóvel',p.features||p.location],[1,p.developer?'Urbanização / empreendimento':'Localização',p.developer||p.location],[2,'Nesta proposta','Condições comerciais\ne próximos passos']]){label(title,M+i*(column+12),718);fit(text,M+i*(column+12),737,column,44,10,8,light);}
 newPage();label('02 / A negociação',M,y);y+=24;fit('Sua proposta, em detalhe.',M,y,CW,40,29,22);y+=49;
 y+=block(p.clientName+' · '+[p.unit,p.block].filter(Boolean).join(' / ')+(p.unit?'':' · '+p.title),M,y,CW,9,muted);y+=24;
 function ensure(height,bottom=773){if(y+height>bottom){newPage();label('A negociação / continuação',M,y);y+=27;}}
 ensure(95);label('Valor total',M,y,muted);fit(proposalMoney(p.proposedPrice),M,y+18,330,42,32,21);rect(W-M-178,y-2,178,64,pale);label('Válida até',W-M-162,y+11,muted);draw(date(p.validUntil)+' · '+p.validTime,W-M-162,y+32,11);y+=83;
 label('Composição do pagamento',M,y);y+=20;let left=M;
 p.payments.forEach((part,i)=>{const width=CW*part.amount/p.proposedPrice;rect(left,y,Math.max(width-2,.2),5,i===0?gold:ink);left+=width;});y+=15;
 const pct=p.payments[0].amount/p.proposedPrice*100;draw(pct.toLocaleString('pt-BR',{maximumFractionDigits:1})+(/entrada|sinal/i.test(p.payments[0].label)?'% de entrada':'% na primeira etapa'),M,y,9);if(p.payments.length>1)draw((100-pct).toLocaleString('pt-BR',{maximumFractionDigits:1})+'% · demais pagamentos',W-M-170,y,9);y+=29;
 for(const [i,part]of p.payments.entries()){
  const textHeight=lines(part.label,14,CW-195).length*18+lines(part.note||'Condição a confirmar entre as partes.',9,CW-195).length*14;
  ensure(textHeight+30);rule(y);y+=14;draw(String(i+1).padStart(2,'0'),M,y+2,9,gold);const n=block(part.label,M+30,y,CW-195,14,ink,1.25);block(part.note||'Condição a confirmar entre as partes.',M+30,y+n+5,CW-195,9,muted);fit(proposalMoney(part.amount),W-M-157,y,157,35,16,11);y+=textHeight+23;
 }
 ensure(40);rule(y);y+=21;
 const descriptions=[['O que está contemplado',p.included],['Despesas e possibilidades',p.expenses||'A confirmar entre as partes.']];
 const half=(CW-32)/2,heights=descriptions.map(([,text])=>lines(text,9,half).length*14);
 if(Math.max(...heights)<170){ensure(Math.max(...heights)+40);descriptions.forEach(([title,text],i)=>{label(title,M+i*(half+32),y);block(text,M+i*(half+32),y+19,half,9,ink,14/9);});y+=Math.max(...heights)+43;}
 else for(const [title,text]of descriptions){ensure(50);label(title,M,y);y+=20;for(const line of lines(text,10,CW)){ensure(16);draw(line,M,y,10);y+=16;}y+=22;}
 ensure(90);rect(M,y,CW,82,pale);label('Do interesse à formalização',M+15,y+14,ink);
 [['Alinhar','Confirmar condições'],['Conferir','Revisar documentação'],['Formalizar','Após aceite das partes']].forEach(([title,text],i)=>{const x=M+15+i*(CW-30)/3;draw(String(i+1),x,y+37,10,gold);draw(title,x+17,y+34,12);draw(text,x+17,y+56,7,muted);});y+=90;
 const nameHeight=lines(p.advisorName,12,half).length*18,contactHeight=lines(p.advisorContact,9,half).length*14,noteLines=lines(p.notes,9,half);
 const contactOffset=18+nameHeight+5,attendantHeight=Math.max(65,contactOffset+contactHeight+14);
 ensure(Math.max(attendantHeight,noteLines.length*14<=110?noteLines.length*14:0),788);label('Seu atendimento Select',M,y);block(p.advisorName,M,y+18,half,12);block(p.advisorContact,M,y+contactOffset,half,9,muted);
 if(noteLines.length*14<=110){block(p.notes,M+half+32,y,half,9,muted,14/9);y+=Math.max(attendantHeight,noteLines.length*14);}
 else{y+=attendantHeight;ensure(40);label('Observações',M,y);y+=20;for(const line of lines(p.notes,9,CW)){ensure(14);draw(line,M,y,9,muted);y+=14;}}
 pages.forEach((sheet,i)=>{page=sheet;rule(798,M,CW,i===0?color('456052'):line);draw(record.demo?'DEMONSTRAÇÃO · Dados e condições fictícios.':'Condições sujeitas à conferência e ao aceite das partes.',M,811,5.8,i===0?color('9caea1'):muted);draw('EME SELECT / '+String(i+1).padStart(2,'0'),W-M-65,811,5.8,i===0?light:muted);});
 return pdf.save();
}
