import fs from 'node:fs';
const base='public/assets/developments/g400/';
for(const [name,file,x,y,w,h] of [['front','carousel-apresentation-02.webp',402,-100,960,960],['right','carousel-apresentation-01.webp',465,-70,839.04,1048.32]]){
const data=fs.readFileSync(base+file).toString('base64');
fs.writeFileSync(base+'scene-'+name+'.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="1672" height="941" viewBox="0 0 1672 941"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#47799f"/><stop offset=".65" stop-color="#5685a4"/><stop offset="1" stop-color="#778b87"/></linearGradient><linearGradient id="edge"><stop stop-color="black"/><stop offset=".09" stop-color="white"/><stop offset=".91" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient><mask id="fade"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#edge)"/></mask></defs><rect width="1672" height="941" fill="url(#sky)"/><image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" mask="url(#fade)" href="data:image/webp;base64,${data}"/></svg>`);
}
