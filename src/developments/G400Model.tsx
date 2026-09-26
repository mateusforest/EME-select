import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Lighting } from './moradas';
import type { ModelControls } from './DevelopmentModel';
interface Props {floor:number|null;lighting:Lighting;onSelectFloor:(floor:number)=>void;onReady:()=>void;onFail:()=>void}

// A navigable architectural massing study. Original project renders remain in the galleries.
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
      if(cancelled||!host.current)return;
      const mount=host.current;
      const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      const canvas=renderer.domElement;
      canvas.tabIndex=0;canvas.setAttribute('role','img');
      canvas.setAttribute('aria-label','Maquete conceitual do G400. Arraste ou use as setas para girar. Mais e menos para ampliar. Home para restaurar.');
      mount.appendChild(canvas);
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(39,1,.1,400);
      const controls=new OrbitControls(camera,canvas);
      controls.enableDamping=true;controls.enablePan=false;controls.minDistance=35;controls.maxDistance=100;controls.maxPolarAngle=Math.PI/2-.06;
      const home=new THREE.Vector3(52,36,64),target=new THREE.Vector3(0,15,0);
      const reset=()=>{camera.position.copy(home);controls.target.copy(target);controls.update();};reset();
      const resources=new Set<{dispose:()=>void}>();
      const own=<T extends {dispose:()=>void}>(item:T)=>{resources.add(item);return item;};
      const mat=(color:string)=>own(new THREE.MeshStandardMaterial({color,roughness:.77}));
      const ivory=mat('#e7e6e0'),dark=mat('#343f43'),stone=mat('#a8aaa6'),wood=mat('#9f6844'),green=mat('#466249'),road=mat('#747d7d');
      const glass=own(new THREE.MeshStandardMaterial({color:'#668697',roughness:.22,metalness:.28,emissive:'#ffc777',emissiveIntensity:0}));
      const water=own(new THREE.MeshStandardMaterial({color:'#4e9596',roughness:.2,metalness:.2}));
      const unitBox=own(new THREE.BoxGeometry(1,1,1));
      const hits:import('three').Object3D[]=[];
      function box(x:number,y:number,z:number,w:number,h:number,d:number,material:import('three').Material,floor?:number){
        const mesh=new THREE.Mesh(unitBox,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);scene.add(mesh);
        if(floor){mesh.userData.floor=floor;hits.push(mesh);}return mesh;
      }
      box(0,-.4,0,200,.5,200,mat('#c1c9bf'));
      box(0,-.08,0,36,.3,29,stone);box(0,-.1,22,160,.1,13,road);box(27,-.1,0,13,.1,100,road);
      for(let x=-65;x<75;x+=8)box(x,0,22,3,.03,.13,ivory);
      for(let z=-40;z<40;z+=8)box(27,0,z,.13,.03,3,ivory);
      // Retail/podium base and a recessed two-level stone frontage.
      box(0,1.6,0,29,3.2,22,glass);
      box(0,5,0,27,3.8,20,stone);
      for(const x of [-14,-8,-2,4,10,14])box(x,1.6,11.1,.4,3.2,.6,ivory);
      for(const y of [3.3,6.8])box(0,y,0,30,.28,22.5,ivory);
      box(0,5,10.2,9,3.3,.15,glass);
      for(const x of [-10,10]){box(x,5.3,10.2,5,1.5,.15,glass);box(x,4.35,10.6,5,.35,.9,green);}
      for(let f=1;f<=8;f++){
        const y=7+(f-.5)*2.8,selected=Math.min(f,7);
        box(0,y,0,23,2.8,15,dark,selected);
        box(0,y+1.32,0,24.5,.22,16.5,ivory,selected);
        for(const x of [-8,0,8]){
          box(x,y,7.59,6,2.3,.1,glass,selected);
          for(const shift of [-2,-.6,.8,2])box(x+shift,y,7.7,.06,2.4,.06,dark,selected);
          if(x!==0){box(x,y-1.2,8.1,6.9,.22,1.5,ivory,selected);box(x,y-.95,8.6,6.7,.34,.45,green,selected);}
        }
        for(const x of [-11.6,11.6])for(const z of [-4,3.4]){
          box(x,y,z,.12,2.3,5.5,glass,selected);
          box(x>0?12:-12,y-1.18,z,1.15,.2,6,ivory,selected);
          box(x>0?12.5:-12.5,y-.97,z,.35,.32,5.7,green,selected);
        }
      }
      for(const x of [-11.8,-4,4,11.8])box(x,18.2,8, .48,23.4,.7,ivory);
      for(const x of [-4.7,4.7]){
        box(x,18.3,7.9,1.1,22.8,.4,wood);
        for(let y=7.2;y<29.5;y+=.35)box(x,y,8.15,1.12,.055,.055,dark);
      }
      box(0,30.1,0,24.7,.45,16.7,ivory,7);
      box(-5,31.5,-1,10,2.5,12,glass,7);box(-5,32.9,-1,10.8,.3,12.7,ivory,7);
      box(7,31.3,-3,8,2.3,8,ivory,7);
      box(-5,31.4,5.1,9.7,2.2,.1,glass,7);
      box(0,.2,-12.1,20,.2,2,water);
      // Context is intentionally subdued and illustrative, with no new amenity claims.
      for(const [x,z] of [[-24,12],[-20,-16],[18,12],[18,-16],[-33,30],[37,31]]){
        box(x,1.5,z,.22,3,.22,wood);
        const crown=new THREE.Mesh(own(new THREE.IcosahedronGeometry(1.6,1)),green);crown.position.set(x,3.7,z);scene.add(crown);
      }
      const selection=box(0,0,0,24.9,.1,17,own(new THREE.MeshBasicMaterial({color:'#e7e9b7',transparent:true,opacity:.38,depthWrite:false})));
      const ambient=new THREE.HemisphereLight('#f3f5f1','#7f8c70',2.7);scene.add(ambient);
      const sun=new THREE.DirectionalLight('#fff4dc',3.2);sun.position.set(-30,55,35);scene.add(sun);
      function update(){
        const {floor,lighting}=latest.current;
        selection.visible=floor!==null;selection.position.y=7+((floor||1)-1)*2.8;
        selection.scale.y=floor===7?8.4:2.8;selection.position.y+=selection.scale.y/2;
        scene.background=new THREE.Color(lighting==='night'?'#263c50':lighting==='sunset'?'#d8ccbb':'#cfdee3');
        ambient.intensity=lighting==='night'?.65:lighting==='sunset'?1.6:2.7;
        sun.intensity=lighting==='night'?.25:lighting==='sunset'?1.6:3.2;
        sun.color.set(lighting==='sunset'?'#f6b577':'#fff4dc');
        glass.emissiveIntensity=lighting==='night'?1.25:lighting==='sunset'?.35:0;
        mount.dataset.lighting=lighting;mount.dataset.floor=String(floor||'');
      }
      const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
      let down={x:0,y:0};
      const pointerDown=(event:PointerEvent)=>{down={x:event.clientX,y:event.clientY};};
      const pointerUp=(event:PointerEvent)=>{if(Math.hypot(event.clientX-down.x,event.clientY-down.y)>5)return;const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(hits)[0];if(hit)latest.current.onSelectFloor(hit.object.userData.floor);};
      const zoom=(direction:number)=>{camera.position.sub(controls.target).multiplyScalar(direction>0?.88:1.12).add(controls.target);controls.update();};
      const key=(event:KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')reset();else if(['+','=','-'].includes(event.key))zoom(event.key==='-'?-1:1);else{const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),event.key==='ArrowLeft'||event.key==='ArrowUp'?-.12:.12);camera.position.copy(controls.target).add(offset);controls.update();}}};
      const lost=(event:Event)=>{event.preventDefault();latest.current.onFail();};
      canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('keydown',key);canvas.addEventListener('webglcontextlost',lost);
      const resize=new ResizeObserver(()=>{if(!mount.clientWidth||!mount.clientHeight)return;renderer.setSize(mount.clientWidth,mount.clientHeight);camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();});resize.observe(mount);
      api.current={reset,zoom,update};update();
      renderer.setAnimationLoop(()=>{if(document.hidden)return;controls.update();renderer.render(scene,camera);mount.dataset.camera=camera.position.toArray().map(value=>value.toFixed(2)).join(',');});
      cleanup=()=>{api.current=null;resize.disconnect();renderer.setAnimationLoop(null);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('keydown',key);canvas.removeEventListener('webglcontextlost',lost);controls.dispose();for(const item of resources)item.dispose();renderer.dispose();canvas.remove();};
      latest.current.onReady();
    }
    setup().catch(()=>{cleanup?.();if(!cancelled)latest.current.onFail();});
    return()=>{cancelled=true;cleanup?.();};
  },[]);
  return <div className="development-model" ref={host} data-testid="g400-model"/>;
});
