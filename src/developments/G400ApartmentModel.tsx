import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MapPin, Pause } from 'lucide-react';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {InteriorOcclusion} from './InteriorOcclusion';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildTipo5, planPoint } from './buildTipo5';
import { buildTipo5BuildingSection } from './tipo5BuildingSection';
import { g400Residences, tipo5Stations } from './g400Residences';
import { TIPO5_SCALE, canWalk, clearWalk, nearestWalk, roomAt, tipo5Outline, tipo5Walls, walkRoute, type PlanPoint } from './tipo5Navigation';

interface Props { active?:boolean; room:string; inside:boolean; hour:number; reset:number; finish?:string; onEnter:()=>void; onSelect:(id:string)=>void; onReady:()=>void; onFail:()=>void }
const toPlan=(point:T.Vector3):PlanPoint=>[point.x/TIPO5_SCALE+1200,point.z/TIPO5_SCALE+530];
const eyeHeight=1.6;
const angleDelta=(from:number,to:number)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));

export default function G400ApartmentModel(props:Props){
  const host=useRef<HTMLDivElement>(null),latest=useRef(props),update=useRef<(()=>void)|null>(null);
  const marker=useRef<SVGCircleElement>(null),heading=useRef<SVGPathElement>(null),routeLine=useRef<SVGPathElement>(null);
  const command=useRef<((action:string,active?:boolean)=>void)|null>(null),mapClick=useRef<((p:PlanPoint)=>void)|null>(null);
  const [walking,setWalking]=useState(false),[message,setMessage]=useState('');
  latest.current=props;
  useEffect(()=>{update.current?.();},[props.room,props.inside,props.hour,props.reset,props.finish]);
  useEffect(()=>{
    const mount=host.current!;let disposed=false,renderer:T.WebGLRenderer|undefined,controls:OrbitControls|undefined,observer:ResizeObserver|undefined,disposeScene:(()=>void)|undefined;
    const removers:(()=>void)[]=[];
    try{
      renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#d9ddd5');
      renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
      renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
      const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');
      canvas.setAttribute('aria-label','Apartamento navegável. Clique no piso ou nos móveis para caminhar. Arraste para olhar. W A S D ou setas para se mover.');mount.prepend(canvas);
      const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.045,450);
      const model=buildTipo5();scene.add(model.root);
      const section=buildTipo5BuildingSection();scene.add(section.root);
      const ground=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#d6d9d1',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-14.6;ground.receiveShadow=true;scene.add(ground);
      const hemisphere=new T.HemisphereLight('#edf4ff','#c1af8d',1);scene.add(hemisphere);
      const sun=new T.DirectionalLight('#fff0d4',3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;sun.shadow.normalBias=.025;sun.shadow.bias=-.00012;sun.shadow.radius=3;scene.add(sun);
      const fill=new T.DirectionalLight('#d5e9ff',.45);fill.position.set(-8,4,-12);scene.add(fill);
      const pmrem=new T.PMREMGenerator(renderer),environment=new RoomEnvironment(),env=pmrem.fromScene(environment,.04);
      scene.environment=env.texture;scene.environmentIntensity=.4;environment.dispose();pmrem.dispose();
      RectAreaLightUniformsLib.init();
      const windowLights=[[990,5.1],[1260,2.3],[1605,2.45]].map(([x,width])=>{const light=new T.RectAreaLight('#e4ebed',1,width,2.1);light.position.copy(planPoint(x,320,1.45));light.lookAt(planPoint(x,500,1.2));scene.add(light);return light;});
      const livingLight=new T.SpotLight('#ffe2b5',4,10,Math.PI*.39,.65,2);livingLight.position.copy(planPoint(990,435,2.59));livingLight.target.position.copy(planPoint(990,435,0));livingLight.castShadow=true;livingLight.shadow.mapSize.set(1024,1024);livingLight.shadow.bias=-.0003;livingLight.shadow.normalBias=.018;livingLight.shadow.radius=3;scene.add(livingLight,livingLight.target);
      const composer=new EffectComposer(renderer),renderPass=new RenderPass(scene,camera),output=new OutputPass(),occlusion=new InteriorOcclusion(scene,camera);
      occlusion.updateGtaoMaterial({radius:.32,thickness:.08,distanceFallOff:.7,scale:.85,samples:12});occlusion.updatePdMaterial({radius:5,samples:12});occlusion.blendIntensity=.72;occlusion.enabled=false;
      composer.addPass(renderPass);composer.addPass(occlusion);composer.addPass(output);
      controls=new OrbitControls(camera,canvas);const orbit=controls;
      orbit.enableDamping=true;orbit.dampingFactor=.1;orbit.enablePan=false;orbit.minDistance=6;orbit.maxDistance=44;orbit.maxPolarAngle=Math.PI/2-.15;
      const destinationMarker=new T.Mesh(new T.RingGeometry(.16,.205,40),new T.MeshBasicMaterial({color:'#e6ddc1',transparent:true,opacity:.9,depthWrite:false}));destinationMarker.rotation.x=-Math.PI/2;destinationMarker.renderOrder=4;destinationMarker.visible=false;scene.add(destinationMarker);
      const rooms=g400Residences['tipo-5'].levels[0].rooms,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
      let reveal=1,prepared=false;
      let previousInside:boolean|undefined,previousRoom='',previousReset=-1,notifiedRoom='',yaw=0,pitch=-.12,lastTime=performance.now();
      let pendingEntry:PlanPoint|null=null,autoLook=true,held=new Set<string>(),drag:{x:number;y:number;startX:number;startY:number;id:number}|null=null;
      let flight:{from:T.Vector3;to:T.Vector3;targetFrom:T.Vector3;targetTo:T.Vector3;start:number;inside:boolean}|null=null;
      let walk:{points:T.Vector3[];index:number;look:T.Vector3|null;pitch:number}|null=null;
      let arrival:{yaw:number;pitch:number}|null=null;
      function look(){camera.lookAt(camera.position.clone().add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch))));}
      function aim(target:T.Vector3){const d=target.clone().sub(camera.position);yaw=Math.atan2(d.x,d.z);pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));look();}
      function home(){return new T.Vector3(14,16,25).multiplyScalar(Math.max(1,1.5/camera.aspect));}
      function stop(){walk=null;arrival=null;held.clear();setWalking(false);mount.dataset.walking='false';destinationMarker.visible=false;if(routeLine.current)routeLine.current.setAttribute('d','');}
      function finishFlight(){if(!flight)return;camera.position.copy(flight.to);if(flight.inside)aim(flight.targetTo);else{orbit.target.copy(flight.targetTo);orbit.update();}flight=null;model.ceiling.visible=latest.current.inside;renderer!.shadowMap.needsUpdate=true;}
      function notifyRoom(){const id=roomAt(toPlan(camera.position));if(id&&id!==latest.current.room){notifiedRoom=id;latest.current.onSelect(id);}}
      function navigate(goal:PlanPoint,lookAt?:T.Vector3,lookPitch=-.08){
        finishFlight();
        const path=walkRoute(toPlan(camera.position),goal);if(path.length<2){setMessage('Escolha um ponto livre ou um ambiente no mapa.');return;}
        flight=null;arrival=null;held.clear();autoLook=true;setMessage('');
        walk={points:path.map(p=>planPoint(...p,eyeHeight)),index:1,look:lookAt||null,pitch:lookPitch};
        destinationMarker.position.copy(planPoint(...path.at(-1)!,.03));destinationMarker.visible=true;
        if(routeLine.current)routeLine.current.setAttribute('d','M'+path.map(p=>p.join(',')).join('L'));
        if(reduce){camera.position.copy(walk.points.at(-1)!);const target=walk.look;stop();if(target)settle(target,lookPitch);look();notifyRoom();}
        else {setWalking(true);mount.dataset.walking='true';}
        mount.dataset.destination=path.at(-1)!.map(n=>n.toFixed(1)).join(',');
      }
      // A floor click is a destination, not a command to look down at our feet.
      function settle(target:T.Vector3,lookPitch=-.08){const delta=target.clone().sub(camera.position);if(Math.hypot(delta.x,delta.z)<.25)return;arrival={yaw:Math.atan2(delta.x,delta.z),pitch:lookPitch};if(reduce){yaw=arrival.yaw;pitch=arrival.pitch;arrival=null;}}
      function move(distance:number,strafe=0){
        const p=toPlan(camera.position),dx=(Math.sin(yaw)*distance+Math.cos(yaw)*strafe)/TIPO5_SCALE,dz=(Math.cos(yaw)*distance-Math.sin(yaw)*strafe)/TIPO5_SCALE;
        const desired:PlanPoint=[p[0]+dx,p[1]+dz];
        // Swept collision checks also protect narrow doorways on a slow frame.
        if(clearWalk(p,desired))camera.position.copy(planPoint(...desired,eyeHeight));
        else if(clearWalk(p,[desired[0],p[1]]))camera.position.copy(planPoint(desired[0],p[1],eyeHeight));
        else if(clearWalk(p,[p[0],desired[1]]))camera.position.copy(planPoint(p[0],desired[1],eyeHeight));
        look();notifyRoom();
      }
      command.current=(action,active=true)=>{if(action==='stop'){stop();return;}if(!latest.current.inside)return;if(active){finishFlight();stop();autoLook=false;held.add(action);}else held.delete(action);};
      mapClick.current=p=>{if(latest.current.inside)navigate(p);};
      function sync(){
        model.applyFinish(latest.current.finish);
        const p=latest.current,station=tipo5Stations[p.room]||tipo5Stations.living,evening=Math.max(0,Math.min(1,(p.hour-16)/4));
        model.setDaylight(p.hour);ground.visible=!p.inside;section.update(reveal,p.inside);
        mount.dataset.exterior='screened';mount.dataset.glazing='frosted';
        sun.position.set(-8+((p.hour-8)/12)*16,12*(1-evening)+2,-9);
        sun.color.set(p.hour<16?'#fff1d8':'#ffbc7d');sun.intensity=1.8*(1-evening)+.12;
        hemisphere.intensity=(p.inside?.14:.62)*(1-evening)+.12;fill.intensity=.14*(1-evening)+.035;scene.environmentIntensity=.27*(1-evening)+.13;
        windowLights.forEach(light=>{light.intensity=p.inside?2.8*(1-evening)+.05:0;light.color.set(p.hour<17?'#e4ebed':'#f3c89d');});livingLight.intensity=p.inside?3+evening*8:0;
        model.lamp.emissiveIntensity=.35+evening*1.6;model.lights.forEach(l=>l.intensity=.8+evening*4);
        renderer!.setClearColor(new T.Color('#d9ddd5').lerp(new T.Color('#30454e'),evening));renderer!.shadowMap.needsUpdate=true;
        orbit.enabled=!p.inside;camera.fov=p.inside?66:42;camera.far=p.inside?65:450;camera.updateProjectionMatrix();
        const internal=notifiedRoom===p.room;notifiedRoom='';
        if(previousInside!==p.inside||previousReset!==p.reset){
          stop();const target=p.inside?planPoint(...station.look,eyeHeight+Math.tan(station.pitch??-.1)*Math.hypot(station.look[0]-station.eye[0],station.look[1]-station.eye[1])*TIPO5_SCALE):planPoint(1200,540,.4);
          const position=p.inside?planPoint(...(nearestWalk(pendingEntry||station.eye,100)||station.eye),eyeHeight):home();pendingEntry=null;
          if(previousInside===undefined||reduce){camera.position.copy(position);if(p.inside)aim(target);else {orbit.target.copy(target);orbit.update();}flight=null;}
          else {const oldLook=camera.position.clone().add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(3));flight={from:camera.position.clone(),to:position,targetFrom:oldLook,targetTo:target,start:performance.now(),inside:p.inside};}
        }else if(previousRoom!==p.room&&p.inside&&!internal){navigate(station.eye,planPoint(...station.look,1.05),station.pitch??-.1);}
        model.setCutaway(!p.inside);model.ceiling.visible=p.inside&&!flight;renderer!.shadowMap.needsUpdate=true;
        previousInside=p.inside;previousRoom=p.room;previousReset=p.reset;
        mount.dataset.room=p.room;mount.dataset.view=p.inside?'inside':'overview';mount.dataset.hour=String(p.hour);mount.dataset.ceiling=p.inside?'continuous':'cutaway';mount.dataset.entrance='common-hall';
      }
      update.current=sync;
      observer=new ResizeObserver(()=>{if(mount.clientWidth<1||mount.clientHeight<1)return;camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();renderer!.setSize(mount.clientWidth,mount.clientHeight);composer.setSize(mount.clientWidth,mount.clientHeight);if(!latest.current.inside){camera.position.copy(home());orbit.target.copy(planPoint(1200,540,.4));orbit.update();flight=null;}});observer.observe(mount);
      camera.aspect=Math.max(1,mount.clientWidth)/Math.max(1,mount.clientHeight);renderer.setSize(mount.clientWidth,mount.clientHeight);composer.setSize(mount.clientWidth,mount.clientHeight);sync();
      const listen=(target:EventTarget,type:string,fn:EventListener)=>{target.addEventListener(type,fn);removers.push(()=>target.removeEventListener(type,fn));};
      const ray=new T.Raycaster(),cursor=new T.Vector2();
      function pick(e:PointerEvent){const rect=canvas.getBoundingClientRect();cursor.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(cursor,camera);return ray.intersectObject(model.root,true).find(hit=>{if(!latest.current.inside&&hit.point.y>.95)return false;let object:T.Object3D|null=hit.object;while(object){if(!object.visible)return false;object=object.parent;}return true;});}
      listen(canvas,'pointerdown',((e:PointerEvent)=>{if(e.button!==0)return;finishFlight();reveal=1;section.update(1,latest.current.inside);drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,id:e.pointerId};if(latest.current.inside)canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});}) as EventListener);
      listen(canvas,'pointermove',((e:PointerEvent)=>{if(!drag||e.pointerId!==drag.id||!latest.current.inside)return;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5){autoLook=false;arrival=null;}yaw-=(e.clientX-drag.x)*.005;pitch=Math.max(-1.1,Math.min(1.1,pitch+(e.clientY-drag.y)*.004));drag.x=e.clientX;drag.y=e.clientY;look();}) as EventListener);
      listen(canvas,'pointerup',((e:PointerEvent)=>{if(!drag||e.pointerId!==drag.id)return;const clicked=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<7;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!clicked)return;const hit=pick(e);if(!hit)return;const goal=nearestWalk(toPlan(hit.point),100);if(!goal){setMessage('Toque em uma área livre para caminhar.');return;}if(latest.current.inside)navigate(goal,hit.point.y>.3?hit.point:undefined);else{pendingEntry=goal;const room=roomAt(goal)||rooms.reduce((best,r)=>Math.hypot(r.x-goal[0],r.y-goal[1])<Math.hypot(best.x-goal[0],best.y-goal[1])?r:best).id;latest.current.onSelect(room);latest.current.onEnter();}}) as EventListener);
      listen(canvas,'pointercancel',()=>{drag=null;held.clear();});
      const keys:Record<string,string>={w:'forward',s:'back',a:'left',d:'right',ArrowUp:'forward',ArrowDown:'back',ArrowLeft:'turn-left',ArrowRight:'turn-right'};
      listen(canvas,'keydown',((e:KeyboardEvent)=>{if(e.key==='Home'){e.preventDefault();previousReset=-1;sync();return;}const action=keys[e.key]||keys[e.key.toLowerCase()];if(!action)return;e.preventDefault();finishFlight();if(latest.current.inside){if(!e.repeat){stop();held.add(action);autoLook=false;}}else{const offset=camera.position.clone().sub(orbit.target),spherical=new T.Spherical().setFromVector3(offset);spherical.theta+=(e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0);spherical.phi=Math.max(.15,Math.min(1.35,spherical.phi+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0)));camera.position.copy(orbit.target).add(new T.Vector3().setFromSpherical(spherical));orbit.update();}}) as EventListener);
      listen(window,'keyup',((e:KeyboardEvent)=>{held.delete(keys[e.key]||keys[e.key.toLowerCase()]);}) as EventListener);
      listen(window,'blur',()=>{held.clear();drag=null;});listen(canvas,'blur',()=>held.clear());
      listen(document,'visibilitychange',()=>{if(document.hidden){held.clear();drag=null;lastTime=performance.now();}});
      listen(canvas,'webglcontextlost',((e:Event)=>{e.preventDefault();stop();renderer?.setAnimationLoop(null);latest.current.onFail();}) as EventListener);
      renderer.setAnimationLoop(()=>{
        const now=performance.now(),dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;if(document.hidden||latest.current.active===false||!prepared)return;
        if(flight){const t=Math.min(1,(now-flight.start)/650),ease=t*t*(3-2*t);camera.position.lerpVectors(flight.from,flight.to,ease);const target=new T.Vector3().lerpVectors(flight.targetFrom,flight.targetTo,ease);if(flight.inside)aim(target);else{orbit.target.copy(target);orbit.update();}if(t===1){flight=null;model.ceiling.visible=latest.current.inside;renderer!.shadowMap.needsUpdate=true;}}
        else if(latest.current.inside){
          if(walk){const left=walk.index===walk.points.length-1?camera.position.distanceTo(walk.points.at(-1)!):Infinity;let remaining=Math.min(1.65,Math.max(.5,left*2))*dt;while(walk&&remaining>0){const destination=walk.points[walk.index],delta=destination.clone().sub(camera.position),distance=delta.length();if(distance<=remaining){camera.position.copy(destination);remaining-=distance;walk.index++;if(walk.index>=walk.points.length){const target=walk.look?.clone(),lookPitch=walk.pitch;stop();if(autoLook&&target)settle(target,lookPitch);notifyRoom();}}else{camera.position.addScaledVector(delta,remaining/distance);remaining=0;if(autoLook){const desired=Math.atan2(delta.x,delta.z);yaw+=angleDelta(yaw,desired)*Math.min(1,dt*2.5);pitch+=(-.1-pitch)*Math.min(1,dt*3);}look();}}}
          if(arrival){const k=1-Math.exp(-5*dt);yaw+=angleDelta(yaw,arrival.yaw)*k;pitch+=(arrival.pitch-pitch)*k;if(Math.abs(angleDelta(yaw,arrival.yaw))<.003&&Math.abs(pitch-arrival.pitch)<.003)arrival=null;}
          camera.position.y=eyeHeight;
          if(held.size){if(held.has('turn-left'))yaw+=dt*1.1;if(held.has('turn-right'))yaw-=dt*1.1;const forward=Number(held.has('forward'))-Number(held.has('back')),side=Number(held.has('right'))-Number(held.has('left'));const speed=1.5*dt/(forward&&side?Math.SQRT2:1);move(forward*speed,side*speed);}
          look();
        }else orbit.update();
        if(latest.current.inside){reveal=1;section.update(1,true);}
        occlusion.enabled=latest.current.inside&&!flight&&model.ceiling.visible;mount.dataset.shading=occlusion.enabled?'interior-contact':'section';mount.dataset.section=reveal<1?'opening':'third-floor';mount.dataset.panorama='disabled';composer.render();
        const p=toPlan(camera.position);mount.dataset.camera=camera.position.toArray().map(n=>n.toFixed(3)).join(',');mount.dataset.position=p.map(n=>n.toFixed(2)).join(',');mount.dataset.heading=yaw.toFixed(3);mount.dataset.pitch=pitch.toFixed(4);mount.dataset.walking=String(Boolean(walk));mount.dataset.navigable=String(!latest.current.inside||Boolean(flight)||canWalk(p));
        if(marker.current){marker.current.setAttribute('cx',String(p[0]));marker.current.setAttribute('cy',String(p[1]));}
        if(heading.current)heading.current.setAttribute('d',`M${p[0]},${p[1]}l${Math.sin(yaw)*42},${Math.cos(yaw)*42}`);
      });
      disposeScene=()=>{model.dispose();const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());env.dispose();sun.shadow.dispose();livingLight.shadow.dispose();occlusion.dispose();renderPass.dispose();output.dispose();composer.dispose();};
      // Compile both views before revealing the canvas. Keep clipping plane counts stable.
      void (async()=>{
        await model.ready;if(disposed)return;
        const savedInside=latest.current.inside;
        model.setCutaway(false);model.ceiling.visible=true;section.update(1,true);
        await renderer!.compileAsync(scene,camera);if(disposed)return;
        occlusion.enabled=true;composer.render();
        model.setCutaway(!savedInside);model.ceiling.visible=savedInside;section.update(1,savedInside);
        occlusion.enabled=savedInside;renderer!.shadowMap.needsUpdate=true;
        await renderer!.compileAsync(scene,camera);if(disposed)return;
        composer.render();prepared=true;lastTime=performance.now();mount.dataset.prepared='true';latest.current.onReady();
      })().catch(error=>{if(!disposed){console.warn('G400 preparation failed',error);latest.current.onFail();}});
    }catch(error){console.warn('G400 apartment viewer unavailable',error);latest.current.onFail();}
    return()=>{disposed=true;update.current=null;command.current=null;mapClick.current=null;renderer?.setAnimationLoop(null);observer?.disconnect();removers.forEach(remove=>remove());controls?.dispose();disposeScene?.();renderer?.dispose();renderer?.domElement.remove();};
  },[]);
  return <div className="g400-apartment-model" ref={host} data-testid="g400-apartment-model">
    {props.inside&&<>
      <div className="residence-minimap"><span><MapPin size={11}/> Você está aqui</span><svg viewBox="680 265 1040 560" role="img" aria-label="Mapa da caminhada" onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();mapClick.current?.([680+(e.clientX-rect.left)/rect.width*1040,265+(e.clientY-rect.top)/rect.height*560]);}}><path d={'M'+tipo5Outline.map(p=>p.join(',')).join('L')+'Z'} fill="#eee9dc" stroke="#78826d" strokeWidth="10"/>{tipo5Walls.map((w,i)=><path key={i} d={`M${w[0]},${w[1]}L${w[2]},${w[3]}`} stroke="#8d9784" strokeWidth="9"/>)}<path ref={routeLine} fill="none" stroke="#658c65" strokeWidth="8" strokeDasharray="10 10"/><path ref={heading} stroke="#1b493b" strokeWidth="11"/><circle ref={marker} r="17" fill="#205540" stroke="#fff" strokeWidth="6"/></svg></div>
      <div className="residence-walk-pad" role="group" aria-label="Caminhar pelo apartamento">{[{id:'turn-left',name:'Olhar à esquerda',Icon:ArrowLeft},{id:'forward',name:'Caminhar para a frente',Icon:ArrowUp},{id:'turn-right',name:'Olhar à direita',Icon:ArrowRight},{id:'back',name:'Caminhar para trás',Icon:ArrowDown}].map(({id,name,Icon})=><button key={id} aria-label={name} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);command.current?.(id,true);}} onPointerUp={()=>command.current?.(id,false)} onPointerCancel={()=>command.current?.(id,false)} onLostPointerCapture={()=>command.current?.(id,false)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();command.current?.(id,true);}}} onKeyUp={()=>command.current?.(id,false)} onBlur={()=>command.current?.(id,false)}><Icon size={16}/></button>)}</div>
    </>}
    {walking&&<button className="residence-walk-stop" onClick={()=>command.current?.('stop')}><Pause size={13}/> Parar caminhada</button>}
    {message&&<span className="residence-walk-message" role="status">{message}</span>}
  </div>;
}
