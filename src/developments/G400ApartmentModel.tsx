import { useEffect, useRef } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildTipo5, planPoint } from './buildTipo5';
import { g400Residences, tipo5Stations } from './g400Residences';

interface Props { room:string; inside:boolean; hour:number; reset:number; onSelect:(id:string)=>void; onReady:()=>void; onFail:()=>void }
export default function G400ApartmentModel(props:Props){
  const host=useRef<HTMLDivElement>(null),latest=useRef(props),update=useRef<(()=>void)|null>(null);
  latest.current=props;
  useEffect(()=>{update.current?.();},[props.room,props.inside,props.hour,props.reset]);
  useEffect(()=>{
    const mount=host.current!;let renderer:T.WebGLRenderer|undefined,controls:OrbitControls|undefined,observer:ResizeObserver|undefined,disposeScene:(()=>void)|undefined;
    const removers:(()=>void)[]=[];
    try{
      renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#e6e5dc');
      renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
      const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');
      canvas.setAttribute('aria-label','Apartamento Tipo 5 em 3D. Arraste para explorar. Setas giram a visão.');mount.appendChild(canvas);
      const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.06,160);
      const model=buildTipo5();scene.add(model.root);
      const ground=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#dcded3',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.22;ground.receiveShadow=true;scene.add(ground);
      const hemisphere=new T.HemisphereLight('#ffffff','#9b9e85',2);scene.add(hemisphere);
      const sun=new T.DirectionalLight('#fff4dc',3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.035;sun.shadow.bias=-.0003;scene.add(sun);
      const pmrem=new T.PMREMGenerator(renderer),environment=new RoomEnvironment();
      const env=pmrem.fromScene(environment,.06);scene.environment=env.texture;scene.environmentIntensity=.45;environment.dispose();pmrem.dispose();
      controls=new OrbitControls(camera,canvas);const orbit=controls;
      orbit.enableDamping=true;orbit.dampingFactor=.09;orbit.enablePan=false;orbit.minDistance=7;orbit.maxDistance=36;orbit.maxPolarAngle=Math.PI/2-.2;
      const roomMarker=new T.Mesh(new T.RingGeometry(.27,.31,40),new T.MeshBasicMaterial({color:'#476a55',transparent:true,opacity:.9,depthTest:false}));roomMarker.rotation.x=-Math.PI/2;roomMarker.renderOrder=5;scene.add(roomMarker);
      const rooms=g400Residences['tipo-5'].levels[0].rooms;
      const picks=rooms.map(room=>{const m=new T.Mesh(new T.CircleGeometry(.46,24),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.copy(planPoint(room.x,room.y,.7));m.userData.room=room.id;scene.add(m);return m;});
      let previousInside:boolean|undefined,previousRoom='',previousReset=-1,transition:{from:T.Vector3;to:T.Vector3;fromTarget:T.Vector3;toTarget:T.Vector3;start:number}|null=null;
      let yaw=0,pitch=0,drag:{x:number;y:number;startX:number;startY:number}|null=null;
      const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
      function look(){camera.lookAt(camera.position.clone().add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch))));}
      function home(){return new T.Vector3(8.5,10,11).multiplyScalar(Math.max(1,1.55/camera.aspect));}
      function sync(){
        const p=latest.current,station=tipo5Stations[p.room]||tipo5Stations.living;
        const evening=Math.max(0,Math.min(1,(p.hour-16)/4));
        sun.position.set(-12+((p.hour-8)/12)*24,18*(1-evening)+2,-9);
        sun.color.set(p.hour<16?'#fff4de':'#ffc794');sun.intensity=2.2*(1-evening)+.14;
        hemisphere.intensity=1.1*(1-evening)+.6;scene.environmentIntensity=.3*(1-evening)+.2;
        model.lamp.emissiveIntensity=evening*3;model.lights.forEach(l=>l.intensity=evening*17);
        renderer!.setClearColor(new T.Color('#e6e5dc').lerp(new T.Color('#394d56'),evening));
        model.walls.scale.y=p.inside?1:.23;model.ceiling.visible=p.inside;roomMarker.visible=!p.inside;
        const room=rooms.find(r=>r.id===p.room)!;roomMarker.position.copy(planPoint(room.x,room.y,.9));
        orbit.enabled=!p.inside;
        camera.fov=p.inside?68:42;camera.updateProjectionMatrix();
        if(previousInside!==p.inside||previousReset!==p.reset||(p.inside&&previousRoom!==p.room)){
          if(p.inside){
            transition=null;camera.position.copy(planPoint(...station.eye,1.55));const target=planPoint(...station.look,.92);
            const direction=target.clone().sub(camera.position);yaw=Math.atan2(direction.x,direction.z);pitch=Math.atan2(direction.y,Math.hypot(direction.x,direction.z));look();
          }else{
            const target=planPoint(1200,540,.35);
            if(previousInside===undefined||previousInside||reduce){camera.position.copy(home());orbit.target.copy(target);orbit.update();transition=null;}
            else transition={from:camera.position.clone(),to:home(),fromTarget:orbit.target.clone(),toTarget:target,start:performance.now()};
          }
        }
        previousInside=p.inside;previousRoom=p.room;previousReset=p.reset;
        mount.dataset.room=p.room;mount.dataset.view=p.inside?'inside':'overview';mount.dataset.hour=String(p.hour);
      }
      update.current=sync;
      observer=new ResizeObserver(()=>{if(mount.clientWidth<1||mount.clientHeight<1)return;camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();renderer!.setSize(mount.clientWidth,mount.clientHeight);if(!latest.current.inside){camera.position.copy(home());orbit.target.copy(planPoint(1200,540,.35));orbit.update();}});observer.observe(mount);
      camera.aspect=Math.max(1,mount.clientWidth)/Math.max(1,mount.clientHeight);camera.updateProjectionMatrix();renderer.setSize(mount.clientWidth,mount.clientHeight);sync();
      const listen=(type:string,fn:EventListener)=>{canvas.addEventListener(type,fn);removers.push(()=>canvas.removeEventListener(type,fn));};
      listen('pointerdown',((e:PointerEvent)=>{transition=null;drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY};if(latest.current.inside)canvas.setPointerCapture(e.pointerId);}) as EventListener);
      listen('pointermove',((e:PointerEvent)=>{if(!drag||!latest.current.inside)return;yaw-=(e.clientX-drag.x)*.006;pitch=Math.max(-.85,Math.min(.75,pitch+(e.clientY-drag.y)*.004));drag.x=e.clientX;drag.y=e.clientY;look();}) as EventListener);
      listen('pointerup',((e:PointerEvent)=>{if(!drag)return;const clicked=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<7;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(clicked&&!latest.current.inside){const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(picks)[0];if(hit)latest.current.onSelect(hit.object.userData.room);}}) as EventListener);
      listen('pointercancel',()=>{drag=null;});
      listen('keydown',((e:KeyboardEvent)=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();transition=null;if(e.key==='Home'){previousReset=-1;sync();return;}if(latest.current.inside){yaw+=(e.key==='ArrowLeft'?.15:e.key==='ArrowRight'?-.15:0);pitch=Math.max(-.85,Math.min(.75,pitch+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0)));look();}else{const offset=camera.position.clone().sub(orbit.target);const spherical=new T.Spherical().setFromVector3(offset);spherical.theta+=(e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0);spherical.phi=Math.max(.15,Math.min(1.35,spherical.phi+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0)));camera.position.copy(orbit.target).add(new T.Vector3().setFromSpherical(spherical));orbit.update();}}) as EventListener);
      listen('webglcontextlost',((e:Event)=>{e.preventDefault();renderer?.setAnimationLoop(null);latest.current.onFail();}) as EventListener);
      renderer.setAnimationLoop(()=>{
        if(document.hidden)return;
        if(transition){const t=Math.min(1,(performance.now()-transition.start)/650),ease=1-Math.pow(1-t,3);camera.position.lerpVectors(transition.from,transition.to,ease);orbit.target.lerpVectors(transition.fromTarget,transition.toTarget,ease);if(t===1)transition=null;}
        if(!latest.current.inside)orbit.update();renderer!.render(scene,camera);
        mount.dataset.camera=camera.position.toArray().map(n=>n.toFixed(2)).join(',');
      });
      disposeScene=()=>{const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());env.dispose();sun.shadow.dispose();};
      latest.current.onReady();
    }catch(error){console.warn('G400 apartment viewer unavailable',error);latest.current.onFail();}
    return()=>{update.current=null;renderer?.setAnimationLoop(null);observer?.disconnect();removers.forEach(remove=>remove());controls?.dispose();disposeScene?.();renderer?.dispose();renderer?.domElement.remove();};
  },[]);
  return <div className="g400-apartment-model" ref={host} data-testid="g400-apartment-model"/>;
}
