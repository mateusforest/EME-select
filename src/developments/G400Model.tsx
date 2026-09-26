import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Lighting } from './moradas';
import type { ModelControls } from './DevelopmentModel';
import type { Material, Matrix4, MeshStandardMaterial } from 'three';
interface Props {floor:number|null;lighting:Lighting;onSelectFloor:(floor:number)=>void;onReady:()=>void;onFail:()=>void}

// Architectural interpretation of the supplied elevations, not a construction model.
const BASE=8.4, STOREY=3.2, FLOORS=7;
export default forwardRef<ModelControls,Props>(function G400Model(props,ref){
  const host=useRef<HTMLDivElement>(null),latest=useRef(props);
  latest.current=props;
  const api=useRef<(ModelControls&{update:()=>void})|null>(null);
  useImperativeHandle(ref,()=>({zoom:d=>api.current?.zoom(d),reset:()=>api.current?.reset()}),[]);
  useEffect(()=>{api.current?.update();},[props.floor,props.lighting]);
  useEffect(()=>{
    let cancelled=false,cleanup:(()=>void)|undefined;
    async function setup(){
      const THREE=await import('three');
      const {OrbitControls}=await import('three/addons/controls/OrbitControls.js');
      const {RoomEnvironment}=await import('three/addons/environments/RoomEnvironment.js');
      if(cancelled||!host.current)return;
      const mount=host.current,resources=new Set<{dispose:()=>void}>();
      const own=<T extends {dispose:()=>void}>(item:T)=>{resources.add(item);return item;};
      const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
      const canvas=renderer.domElement;
      canvas.tabIndex=0;canvas.setAttribute('role','img');
      canvas.setAttribute('aria-label','Maquete conceitual do G400. Arraste ou use as setas para girar. Mais e menos para ampliar. Home para restaurar.');
      mount.appendChild(canvas);
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,450);
      const controls=new OrbitControls(camera,canvas);
      controls.enableDamping=true;controls.enablePan=false;controls.minDistance=36;controls.maxDistance=150;controls.maxPolarAngle=Math.PI/2-.09;
      const target=new THREE.Vector3(0,16.5,0),home=new THREE.Vector3(52,35,65);
      const reset=()=>{const fit=Math.max(1,.95/camera.aspect);camera.position.copy(home).sub(target).multiplyScalar(fit).add(target);controls.target.copy(target);controls.update();};
      const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
      const environment=own(pmrem.fromScene(room,.05));scene.environment=environment.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
      // Deterministic fine texture: stone grain and narrow timber courses stay legible up close.
      function texture(kind:'stone'|'timber'|'paving'){
        const surface=document.createElement('canvas');surface.width=surface.height=256;
        const ctx=surface.getContext('2d')!;let seed=1337;
        const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
        ctx.fillStyle=kind==='timber'?'#9b6849':kind==='paving'?'#a9aaa4':'#bcbfba';ctx.fillRect(0,0,256,256);
        for(let i=0;i<12000;i++){const v=Math.floor(90+random()*110);ctx.fillStyle=`rgba(${v},${v},${v},.16)`;ctx.fillRect(random()*256,random()*256,kind==='timber'?12:2,1);}
        ctx.strokeStyle=kind==='timber'?'#61432f':'#878e88';ctx.lineWidth=kind==='timber'?2:1;
        for(let y=0;y<256;y+=kind==='timber'?9:64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
        if(kind==='paving')for(let x=0;x<256;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}
        const map=own(new THREE.CanvasTexture(surface));map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return map;
      }
      const mat=(color:string,roughness=.75)=>own(new THREE.MeshStandardMaterial({color,roughness}));
      const ivory=mat('#ece9de',.64),frame=mat('#263337',.34),recess=mat('#374047'),stone=mat('#eeeae3'),wood=mat('#dfbd99'),paving=mat('#deded2'),road=mat('#505b60'),soil=mat('#344739');
      stone.map=texture('stone');wood.map=texture('timber');paving.map=texture('paving');
      wood.map.repeat.set(1,8);
      const glass=own(new THREE.MeshStandardMaterial({color:'#557b8b',metalness:.7,roughness:.17,envMapIntensity:1.1}));
      const litGlass:MeshStandardMaterial[]=Array.from({length:5},(_,i)=>own(new THREE.MeshStandardMaterial({color:['#789497','#667e86','#89938a','#4c7180','#67858a'][i],metalness:.45,roughness:.24,emissive:['#e7b880','#d6a376','#f1d1a0','#c19a73','#e8cbaa'][i],emissiveIntensity:0,envMapIntensity:.7})));
      litGlass.forEach((material,index)=>{
        const surface=document.createElement('canvas');surface.width=128;surface.height=128;
        const ctx=surface.getContext('2d')!,gradient=ctx.createLinearGradient(0,0,0,128);
        gradient.addColorStop(0,'#4b4b4b');gradient.addColorStop(.25,'#c8c8c8');gradient.addColorStop(.7,'#8a8a8a');gradient.addColorStop(1,'#292929');
        ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
        for(let x=0;x<128;x+=4){ctx.fillStyle=`rgba(0,0,0,${.06+((x+index)%7)*.025})`;ctx.fillRect(x,0,2,128);}
        material.emissiveMap=own(new THREE.CanvasTexture(surface));
      });
      const lamp=own(new THREE.MeshStandardMaterial({color:'#e8d4ad',emissive:'#ffd29d',emissiveIntensity:0}));
      type Part={matrix:Matrix4;floor:number};
      const batches=new Map<Material,Part[]>(),transform=new THREE.Object3D();
      function box(x:number,y:number,z:number,w:number,h:number,d:number,material:Material,floor=0){
        transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,0,0);transform.updateMatrix();
        const list=batches.get(material)||[];list.push({matrix:transform.matrix.clone(),floor});batches.set(material,list);
      }
      const leaves:{x:number;y:number;z:number;s:number}[]=[];
      function planter(x:number,y:number,z:number,w:number,d:number,floor=0){
        box(x,y,z,w,.3,d,ivory,floor);box(x,y+.17,z,w-.1,.07,d-.1,soil);
        const n=Math.ceil(w/.32),m=Math.ceil(d/.32);
        for(let i=0;i<n;i++)for(let j=0;j<m;j++)leaves.push({x:x-w/2+(i+.5)*w/n,y:y+.28+Math.sin(i*7+j*3)*.055,z:z-d/2+(j+.5)*d/m,s:.22+(i%3)*.025});
      }
      let windows=0,illuminated=0;
      function windowWall(x:number,y:number,z:number,w:number,h:number,side:boolean,floor:number,id:number){
        const active=(id*17+floor*11)%7<3;windows++;if(active)illuminated++;
        const glazing=active?litGlass[(id+floor)%5]:glass;
        const put=(offset:number,yy:number,ww:number,hh:number,depth:number,material:Material)=>box(side?x:x+offset,yy,side?z+offset:z,side?depth:ww,hh,side?ww:depth,material,floor);
        put(0,y,w,h,.11,glazing);
        put(0,y-h/2,w,.09,.18,frame);put(0,y+h/2,w,.09,.18,frame);
        const panes=Math.ceil(w/1.05);
        for(let i=0;i<=panes;i++)put(-w/2+i*w/panes,y,.055,h,.2,frame);
        // Low transom and dark frames remain visible when the room is lit.
        put(0,y-h*.21,w,.035,.18,frame);
      }
      // Corner parcel, broad pavements and quiet surrounding city blocks.
      box(0,-.55,0,280,.7,280,mat('#a1ada6'));
      box(0,-.12,0,37,.35,29,paving);box(0,-.24,23,230,.12,15,road);box(29,-.24,0,15,.12,190,road);
      for(let x=-100;x<100;x+=9)box(x,-.16,23,3,.015,.12,ivory);
      for(let z=-80;z<80;z+=9)box(29,-.16,z,.12,.015,3,ivory);
      for(let i=0;i<7;i++){box(19+i*.85,-.16,17, .4,.015,5.3,ivory);box(20,-.16,15-i*.85,5.3,.015,.4,ivory);}
      box(0,-.12,35,95,.25,3.5,paving);planter(-10,.05,35,48,1.9);
      const context=mat('#b0bab5');
      for(const [x,z,w,d,h] of [[-48,-25,18,20,9],[-38,43,21,12,6],[47,-28,18,20,10],[52,38,20,18,7],[-10,-40,22,15,8]]){
        box(x,h/2-.3,z,w,h,d,context);box(x,h,z,w+.3,.25,d+.3,ivory);
      }
      // Commercial base: recessed glazing, stone piers, entrance and two mezzanine levels.
      box(0,4,0,28,8,20,recess);
      for(const x of [-10.7,-5.4,0,5.4,10.7])windowWall(x,1.8,10.1,4.8,3.1,false,0,Math.round(x+20));
      for(const x of [-14.2,14.2])for(const z of [-6.7,0,6.7])windowWall(x,1.8,z,6.1,3.1,true,0,Math.round(z+30));
      for(const y of [3.7,8.25])box(0,y,0,29.5,.3,21.5,ivory);
      for(const x of [-14,-7,7,14]){box(x,4,10.65,.48,8,.6,ivory);box(x,5.9,10.3,1.2,4.1,.55,stone);}
      for(const x of [-10.5,10.5]){
        box(x,6,10.3,6.3,4,.4,stone);windowWall(x,6.6,10.58,5.6,1.3,false,0,Math.round(x+40));planter(x,4.3,10.75,6.2,.8);
      }
      windowWall(0,5.95,10.6,9.8,4.1,false,0,50);
      for(const x of [-5.7,5.7])for(let j=0;j<9;j++)box(x+j*.12,5.9,10.9,.055,4.1,.24,wood);
      box(0,3.48,11.4,6.6,.18,3,ivory);box(0,3.34,11.5,5.8,.035,1.7,lamp);
      for(const x of [-14.25,14.25]){box(x,6,0,.4,4,19,stone);for(const z of [-5.5,4.5])windowWall(x*1.012,6,z,5.8,1.4,true,0,Math.round(z+60));}
      // Seven residential levels. Corner winter gardens wrap each side of the tower;
      // the timber cores are recessed, with small separate service windows.
      for(let f=1;f<=FLOORS;f++){
        const low=BASE+(f-1)*STOREY,y=low+STOREY/2;
        box(0,y,0,23,STOREY,16,recess,f);
        for(const x of [-8,8]){
          box(x,y,8.1,6.6,STOREY,.45,stone,f);
          windowWall(x,y+.08,8.45,6.1,2.5,false,f,x<0?1:2);
          box(x,low,8.7,7.2,.22,2.1,ivory,f);planter(x,low+.24,9.35,6.8,.58,f);
          box(x,y,8.8, .2,2.95,.48,wood,f);
        }
        for(const x of [-11.65,11.65])for(const z of [-5,5]){
          windowWall(x,y+.08,z,5.8,2.5,true,f,(x<0?3:5)+(z<0?1:0));
          box(x,low,z,2,.22,6.65,ivory,f);planter(x<0?-12.3:12.3,low+.24,z,.52,6.3,f);
        }
        for(const x of [-4.05,4.05]){box(x,y,8.32,1.25,STOREY,.5,ivory,f);windowWall(x,y+.25,8.6,.9,.95,false,f,x<0?8:9);}
        for(const side of [-1,1]){
          windowWall(side*11.6,y+.3,0,1.35,1.2,true,f,side+12);
          box(side*11.75,y,-1.6,.48,STOREY,1.5,wood,f);
        }
        // A quieter rear elevation still has actual window frames when orbiting.
        for(const x of [-8,0,8])windowWall(x,y+.08,-8.08,5.6,2.5,false,f,Math.round(x+24));
        box(0,low,-8.3,24,.22,1,ivory,f);
      }
      for(const x of [-11.85,-4.9,4.9,11.85])box(x,19.55,9.05,.38,23.1,.6,ivory);
      box(0,19.6,8.14,5.1,22.2,.36,wood);
      for(const x of [-2.9,2.9])box(x,19.55,8.7,.38,23.1,1.25,ivory);
      for(let y=BASE+.15;y<30.5;y+=.18)box(0,y,8.36,5.1,.035,.06,wood);
      for(const x of [-11.9,11.9]){box(x,19.5,-2.2,.3,22.3,3.3,wood);for(const z of [-3.95,-.4])box(x,19.55,z,.7,23.1,.35,ivory);}
      box(0,30.95,0,25.2,.35,18.6,ivory,7);
      // Stepped glazed crown, parapets and the recessed rooftop lounge.
      box(-3.7,32.6,-1.5,12,3.1,11,recess,7);
      windowWall(-3.7,32.65,4.06,11.5,2.7,false,7,40);
      windowWall(2.36,32.65,-1.5,10.5,2.7,true,7,41);
      box(-3.7,34.28,-1.5,13,.27,12.1,ivory,7);
      box(7.6,32,-4.5,6.7,2.1,6.1,stone,7);box(7.6,33.15,-4.5,7.3,.22,6.7,ivory,7);
      for(const x of [-10,8])planter(x,31.35,6,4,.7,7);
      // Landscaping uses clustered canopies instead of a single geometric ball.
      const bark=mat('#665b4b');
      for(const [x,z] of [[-19,8],[-20,-13],[18,8],[18,-12],[-25,35],[8,35],[44,19]]){
        box(x,2,z,.23,4,.23,bark);
        for(let i=0;i<18;i++){const angle=i*2.4,r=.25+(i%4)*.43;leaves.push({x:x+Math.cos(angle)*r,y:4+Math.sin(i*1.7)*.7,z:z+Math.sin(angle)*r,s:.85+(i%3)*.17});}
      }
      const unitBox=own(new THREE.BoxGeometry(1,1,1));
      const hits:import('three').InstancedMesh[]=[];
      for(const [material,parts] of batches){
        const mesh=own(new THREE.InstancedMesh(unitBox,material,parts.length));
        parts.forEach((part,i)=>mesh.setMatrixAt(i,part.matrix));mesh.instanceMatrix.needsUpdate=true;
        mesh.castShadow=material!==glass&&!litGlass.includes(material as MeshStandardMaterial);mesh.receiveShadow=true;
        mesh.userData.floors=parts.map(part=>part.floor);scene.add(mesh);if(parts.some(part=>part.floor))hits.push(mesh);
      }
      const foliage=new THREE.InstancedMesh(own(new THREE.IcosahedronGeometry(1,1)),mat('#45644b'),leaves.length);
      leaves.forEach((leaf,i)=>{transform.position.set(leaf.x,leaf.y,leaf.z);transform.scale.set(leaf.s,leaf.s*.85,leaf.s);transform.updateMatrix();foliage.setMatrixAt(i,transform.matrix);foliage.setColorAt(i,new THREE.Color().setHSL(.27+(i%5)*.018,.22+(i%3)*.06,.28+(i%7)*.025));});
      foliage.castShadow=true;foliage.receiveShadow=true;scene.add(foliage);
      const selection=new THREE.Group();
      // Slim perimeter at the slab: never a translucent box through the whole building.
      const lineGeo=own(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-12.7,0,-8.7),new THREE.Vector3(12.7,0,-8.7),new THREE.Vector3(12.7,0,9.8),new THREE.Vector3(-12.7,0,9.8)]));
      selection.add(new THREE.LineLoop(lineGeo,own(new THREE.LineBasicMaterial({color:'#e3b87e',depthTest:true}))));scene.add(selection);
      const ambient=new THREE.HemisphereLight('#deeffb','#a0a48d',2.1);scene.add(ambient);
      const sun=new THREE.DirectionalLight('#fff3da',3.4);sun.position.set(-24,52,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=50;sun.shadow.camera.bottom=-40;sun.shadow.normalBias=.06;sun.shadow.bias=-.0001;scene.add(sun);
      const fill=new THREE.DirectionalLight('#9ccce8',.7);fill.position.set(30,30,-20);scene.add(fill);
      const entrance=new THREE.PointLight('#ffd09c',0,16,2);entrance.position.set(0,3,12);scene.add(entrance);
      function update(){
        const {floor,lighting}=latest.current,night=lighting==='night',sunset=lighting==='sunset';
        selection.visible=floor!==null;selection.position.y=BASE+((floor||1)-1)*STOREY+.13;
        const background=night?'#233748':sunset?'#b4a79c':'#bacdd3';scene.background=new THREE.Color(background);scene.fog=new THREE.Fog(background,100,225);
        ambient.intensity=night?.7:sunset?1.35:2.1;sun.intensity=night?.75:sunset?2.3:3.4;
        sun.color.set(night?'#a6c9e5':sunset?'#ffca91':'#fff3da');sun.position.set(sunset?-40:-24,sunset?24:52,35);
        fill.intensity=night?.5:.7;scene.environmentIntensity=night?.26:.55;
        litGlass.forEach((material,i)=>material.emissiveIntensity=night?[.8,.5,1.05,.32,.65][i]:sunset?.16:0);
        glass.color.set(night?'#243b4d':'#557b8b');lamp.emissiveIntensity=night?2:sunset?.6:0;entrance.intensity=night?35:sunset?12:0;
        mount.dataset.lighting=lighting;mount.dataset.floor=String(floor||'');mount.dataset.windows=String(windows);mount.dataset.litWindows=String(night?illuminated:0);
      }
      const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down={x:0,y:0};
      const pointerDown=(event:PointerEvent)=>{down={x:event.clientX,y:event.clientY};};
      const pointerUp=(event:PointerEvent)=>{if(Math.hypot(event.clientX-down.x,event.clientY-down.y)>5)return;const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(hits)[0];if(hit&&hit.instanceId!==undefined){const f=hit.object.userData.floors[hit.instanceId];if(f)latest.current.onSelectFloor(f);}};
      const zoom=(direction:number)=>{camera.position.sub(controls.target).multiplyScalar(direction>0?.88:1.12).add(controls.target);controls.update();};
      const key=(event:KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')reset();else if(['+','=','-'].includes(event.key))zoom(event.key==='-'?-1:1);else{const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),event.key==='ArrowLeft'||event.key==='ArrowUp'?-.12:.12);camera.position.copy(controls.target).add(offset);controls.update();}}};
      const lost=(event:Event)=>{event.preventDefault();latest.current.onFail();};
      canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('keydown',key);canvas.addEventListener('webglcontextlost',lost);
      let oldWidth=0;
      const resize=new ResizeObserver(()=>{if(!mount.clientWidth||!mount.clientHeight)return;renderer.setSize(mount.clientWidth,mount.clientHeight);camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();if(!oldWidth||Math.abs(oldWidth-mount.clientWidth)>100)reset();oldWidth=mount.clientWidth;});resize.observe(mount);
      api.current={reset,zoom,update};update();reset();
      renderer.setAnimationLoop(()=>{if(document.hidden)return;controls.update();renderer.render(scene,camera);mount.dataset.camera=camera.position.toArray().map(value=>value.toFixed(2)).join(',');});
      cleanup=()=>{api.current=null;resize.disconnect();renderer.setAnimationLoop(null);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('keydown',key);canvas.removeEventListener('webglcontextlost',lost);controls.dispose();for(const item of resources)item.dispose();foliage.dispose();sun.shadow.dispose();renderer.dispose();canvas.remove();};
      latest.current.onReady();
    }
    setup().catch(()=>{cleanup?.();if(!cancelled)latest.current.onFail();});
    return()=>{cancelled=true;cleanup?.();};
  },[]);
  return <div className="development-model" ref={host} data-testid="g400-model"/>;
});
