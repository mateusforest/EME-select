import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('floating controls follow an iOS keyboard, reset after dismissal and tolerate absent VisualViewport',()=>{
 const source=readFileSync(new URL('../src/mobile-viewport.ts',import.meta.url),'utf8').replace('export function','function');
 const values={},handlers={};
 const viewport={height:844,offsetTop:0,addEventListener:(event,callback)=>handlers[event]=callback};
 const window={innerHeight:844,visualViewport:viewport,addEventListener:()=>{}};
 const document={documentElement:{style:{setProperty:(k,v)=>values[k]=v}}};
 runInNewContext(source+';setupMobileViewport();',{window,document});
 assert.equal(values['--eme-keyboard-inset'],'0px');
 viewport.height=480;handlers.resize();assert.equal(values['--eme-keyboard-inset'],'364px');
 viewport.offsetTop=40;handlers.scroll();assert.equal(values['--eme-keyboard-inset'],'324px');
 viewport.height=844;viewport.offsetTop=0;handlers.resize();assert.equal(values['--eme-keyboard-inset'],'0px');
 delete window.visualViewport;runInNewContext(source+';setupMobileViewport();',{window,document});
 assert.equal(values['--eme-visible-height'],'844px');assert.equal(values['--eme-keyboard-inset'],'0px');
});
