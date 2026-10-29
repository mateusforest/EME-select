// Visual review only: no credentials, database or outbound provider connection.
import {createServer} from 'vite';
const port=Number(process.env.EME_SWITCH_PREVIEW_PORT||4231);
const server=await createServer({
  define:{'import.meta.env.VITE_SWITCH_VISUAL_PREVIEW':'true'},
  server:{host:'127.0.0.1',port,strictPort:true},
  plugins:[{name:'switch-visual-preview',configureServer(server){
    server.middlewares.use((req,res,next)=>{
      if(!req.url?.startsWith('/api/'))return next();
      res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
      res.end(JSON.stringify({error:'Esta é uma prévia visual local. Nenhum cadastro foi enviado. A operação depende da ativação do banco e dos canais de atendimento.'}));
    });
  }}]
});
await server.listen();server.printUrls();
