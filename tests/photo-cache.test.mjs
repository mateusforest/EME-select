import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhotoCache} from '../src/photo-cache.mjs';

test('gallery cache shares downloads, retries failures and releases its URLs',async t=>{
 const previous={fetch:globalThis.fetch,Image:globalThis.Image,location:globalThis.location};
 let requests=0,fail=false;
 globalThis.location={href:'https://select.test/',origin:'https://select.test'};
 globalThis.Image=class {async decode(){}};
 globalThis.fetch=async()=>{requests++;return new Response(fail?'unavailable':new Blob(['photo'],{type:'image/webp'}),{status:fail?503:200});};
 t.after(()=>Object.assign(globalThis,previous));
 const cache=createPhotoCache();const first=cache.load('/photo');assert.equal(first,cache.load('/photo'));const url=await first;assert.match(url,/^blob:/);assert.equal(await cache.load('/photo'),url);assert.equal(requests,1);
 const release=cache.retain();release();const retainAgain=cache.retain();await Promise.resolve();assert.equal(await cache.load('/photo'),url);
 fail=true;await assert.rejects(cache.load('/failure'));fail=false;await cache.load('/failure');assert.equal(requests,3);
 retainAgain();await Promise.resolve();await assert.rejects(cache.load('/photo'),/closed/);await assert.rejects(previous.fetch(url));
});
test('closing a gallery aborts pending requests and prevents late image retention',async t=>{
 const previous={fetch:globalThis.fetch,location:globalThis.location};globalThis.location={href:'https://select.test/',origin:'https://select.test'};
 let aborted=false;globalThis.fetch=(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));}));
 t.after(()=>Object.assign(globalThis,previous));const cache=createPhotoCache();const pending=cache.load('/pending');cache.dispose();await assert.rejects(pending,/aborted/);assert.equal(aborted,true);
});
