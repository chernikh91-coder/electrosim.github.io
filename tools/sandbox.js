/* Песочница для тестов: поднимает app.js в vm с минимальной заглушкой DOM.
   Использование:
     const { api, check } = require('./sandbox').load();
   api — внутренние функции стенда, открытые для проверок. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load(options){
  options=options||{};
  const dir = path.join(__dirname, '..');
  let src = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');

  const expose = `
globalThis.__t = {
  /* протокол испытаний */
  log:log, trace:trace, renderLog:renderLog, setLogFilter:setLogFilter,
  clearLog:clearLog, restoreLog:restoreLog, protocolText:protocolText,
  schemeSnapshot:schemeSnapshot, LOG_FILTERS:LOG_FILTERS, LOG_LIMIT:LOG_LIMIT,
  items:function(){return logItems;}, faults:function(){return logFaultCount;},
  filter:function(){return logFilter;},
  /* электрическая модель и аппараты */
  state:state, TYPES:TYPES, STOCK:STOCK, DCM:DCM,
  MODULE:MODULE, SLOTS:SLOTS, PANEL:PANEL, mountingRails:mountingRails,
  /* сенсорное управление */
  touchPointers:touchPointers, nearestTouchTerminal:nearestTouchTerminal,
  touchView:function(){return view;}, touchPending:function(){return pending;},
  touchPlacement:function(){return touchPlacement;},
  mobileTouchLayout:mobileTouchLayout,
  potentialMap:potentialMap, internalLinks:internalLinks, nodeKey:nodeKey,
  termDefs:termDefs, terminal:terminal, tagOf:tagOf, renderAll:renderAll,
  deviceInner:deviceInner, measureNow:measureNow,
  coilVoltage:coilVoltage, lampsOn:lampsOn, lampVoltage:lampVoltage,
  acSnapshot:acSourceSnapshot, acSample:acPhasorSample, phasorDifference:phasorDifference,
  motorSupplyFrequency:motorSupplyFrequency, motorOperatingPoint:motorOperatingPoint,
  motorVisualOperating:motorVisualOperating, motorSupplyRelay:motorSupplyRelay,
  clampWireCurrents:clampWireCurrents, breakerNominalCurrent:breakerNominalCurrent,
  breakerPoleCurrents:breakerPoleCurrents, breakerProtectionStep:breakerProtectionStep,
  /* преобразователь и машина постоянного тока */
  newDcMotor:newDcMotor, dcMotorData:dcMotorData, dcMotorOperatingPoint:dcMotorOperatingPoint,
  dcMotorInertiaStep:dcMotorInertiaStep, dcTerminalVoltage:dcTerminalVoltage,
  /* органы управления и звук */
  toggleDevice:toggleDevice, playBreakerSound:playBreakerSound, playContactorSound:playContactorSound,
  playRelaySound:playRelaySound, thermalTick:thermalTick, testRelay:testRelay, resetRelay:resetRelay,
  motorIsDc:motorIsDc, motorPhaseDirection:motorPhaseDirection, motorById:motorById,
  tpSetArmatureVoltage:tpSetArmatureVoltage, tpMaxArmatureVoltage:tpMaxArmatureVoltage,
  setTpArmatureVoltage:setTpArmatureVoltage,
  loadSelectedPreset:loadSelectedPreset, readPresets:readPresets, PRESET_KEY:PRESET_STORAGE_KEY,
  readBrowserPresets:readBrowserPresets, saveCurrentPreset:saveCurrentPreset,
  deleteSelectedPreset:deleteSelectedPreset, importPresetFile:importPresetFile,
  scanPresetDirectory:scanPresetDirectory, refreshPresetFolder:refreshPresetFolder,
  connectPresetFolder:connectPresetFolder, initPresetFolder:initPresetFolder,
  folderPresets:function(){return folderPresets;},
  setPresetFolderHandle:function(handle){presetFolderHandle=handle;},
  tpFieldVoltage:tpFieldVoltage, tpInputState:tpInputState, changeTpArmatureVoltage:changeTpArmatureVoltage,
  resistanceBetween:resistanceBetween, MOTOR_TERMS:MOTOR_TERMS, DC_MOTOR_TERMS:DC_MOTOR_TERMS,
  dcMotorInner:dcMotorInner, motorInner:motorInner, DC_GREEN:DC_GREEN
};
`;
  if (!/\}\)\(\);\s*$/.test(src)) throw new Error('не найден хвост IIFE: ожидался "})();" в конце app.js');
  src = src.replace(/\}\)\(\);\s*$/, expose + '})();');

  const els = {};
  let doc;
  function matches(el,selector){
    return selector.split(',').some(function(part){
      part=part.trim();
      const id=part.match(/#([\w-]+)/),cl=part.match(/\.([\w-]+)/),attr=part.match(/\[([\w-]+)(?:="([^"]*)")?\]/);
      if(id&&el.id!==id[1])return false;
      if(cl&&!el.classList.contains(cl[1]))return false;
      if(attr&&(el.getAttribute(attr[1])===null||(attr[2]!==undefined&&el.getAttribute(attr[1])!==attr[2])))return false;
      const tag=part.match(/^[a-z]+/i);if(tag&&el.tagName.toLowerCase()!==tag[0].toLowerCase())return false;
      return !!(id||cl||attr||tag);
    });
  }
  function dispatch(el,evt){
    if(!evt.target)evt.target=el;
    const route=[];for(let n=el;n;n=n.parentNode)route.push(n);
    function run(n,capture){
      (n.listeners[evt.type]||[]).filter(function(h){return h.capture===capture;}).forEach(function(h){if(!evt.immediate)h.fn(evt);});
    }
    route.slice().reverse().some(function(n){run(n,true);return evt.stopped;});
    if(!evt.stopped)route.some(function(n){run(n,false);return evt.stopped||!evt.bubbles;});
    return !evt.defaultPrevented;
  }
  function makeEl(tag){
    const classes=new Set(),attrs={};
    const el = {
      tagName: tag || 'div', style: {setProperty(k,v){this[k]=v;}}, dataset: {}, value: '', textContent: '', scrollTop: 0,
      listeners:{},children:[],parentNode:null,
      classList: { add(...names){names.forEach(n=>classes.add(n));}, remove(...names){names.forEach(n=>classes.delete(n));}, toggle(n,on){if(on===undefined)on=!classes.has(n);if(on)classes.add(n);else classes.delete(n);return on;}, contains(n){return classes.has(n);} },
      setAttribute(k,v){attrs[k]=String(v);}, getAttribute(k){return attrs[k]===undefined?null:attrs[k];}, removeAttribute(k){delete attrs[k];},
      addEventListener(type,fn,opts){if(!options.interactive)return;(this.listeners[type]||(this.listeners[type]=[])).push({fn:fn,capture:opts===true||!!(opts&&opts.capture)});}, removeEventListener(){}, focus(){}, blur(){},
      dispatchEvent(evt){return dispatch(this,evt);},
      appendChild(child){child.parentNode=this;this.children.push(child);}, remove(){this.parentNode=null;}, click(){}, contains(){ return false; },
      querySelector(){ return null; }, querySelectorAll(){ return []; },
      closest(sel){if(!options.interactive)return null;for(let n=this;n;n=n.parentNode)if(matches(n,sel))return n;return null;}, insertAdjacentHTML(){},
      getScreenCTM(){ return null; }, getBoundingClientRect(){ return {left:0,top:0,width:1000,height:1000}; }
    };
    let html = '';
    Object.defineProperty(el, 'innerHTML', { get(){ return html; }, set(v){ html = String(v); } });
    return el;
  }
  function byId(id){
    if(!els[id]){const el=els[id]=makeEl(id==='scene'?'svg':'div');el.id=id;
      el.parentNode=id==='world'?byId('scene'):(/Layer$/.test(id)?byId('world'):doc);
    }
    return els[id];
  }
  doc=makeEl('document');
  byId('logFilters').querySelectorAll = function(){ return []; };

  const store = {};
  const localStorage = {
    getItem: function(k){ return Object.prototype.hasOwnProperty.call(store,k) ? store[k] : null; },
    setItem: function(k,v){ store[k] = String(v); },
    removeItem: function(k){ delete store[k]; }
  };

  let timerSeq=1;const timers=new Map(),frames=new Map();
  function FakePointerEvent(type,init){Object.assign(this,{type:type,bubbles:true},init);}
  FakePointerEvent.prototype.preventDefault=function(){this.defaultPrevented=true;};
  FakePointerEvent.prototype.stopPropagation=function(){this.stopped=true;};
  FakePointerEvent.prototype.stopImmediatePropagation=function(){this.stopped=true;this.immediate=true;};
  const sandbox = {
    console: console,
    Math: Math, JSON: JSON, Date: Date, Object: Object, Array: Array, String: String, Number: Number,
    isFinite: isFinite, parseFloat: parseFloat, parseInt: parseInt, RegExp: RegExp, Error: Error,
    Boolean: Boolean, Infinity: Infinity, NaN: NaN, undefined: undefined,
    Set: Set, Map: Map, Promise: Promise,
    performance: { now: function(){ return 1000; } },
    requestAnimationFrame: function(fn){if(!options.interactive)return 0;const id=timerSeq++;frames.set(id,fn);return id;},
    cancelAnimationFrame: function(id){frames.delete(id);},
    setInterval: function(){ return 0; },
    clearInterval: function(){},
    setTimeout: function(fn,delay){if(!options.interactive)return 0;const id=timerSeq++;timers.set(id,{fn:fn,delay:delay});return id;},
    clearTimeout: function(id){timers.delete(id);},
    Blob: function(){}, FileReader: function(){},
    URL: { createObjectURL: function(){ return 'blob:test'; }, revokeObjectURL: function(){} },
    DOMPoint: function(x,y){ this.x=x; this.y=y; this.matrixTransform=function(m){ return options.interactive?{x:x*m.a+y*(m.c||0)+(m.e||0),y:x*(m.b||0)+y*m.d+(m.f||0)}:{x:x,y:y}; }; },
    PointerEvent:FakePointerEvent,
    localStorage: localStorage,
    navigator: { userAgent: options.mobile?'mobile-test':'node', maxTouchPoints:options.mobile?5:0 },
    document: Object.assign(doc,{
      getElementById: byId,
      createElement: makeEl,
      querySelector: function(){ return null; },
      querySelectorAll: function(){ return []; },
      elementFromPoint: function(){ return null; },
      body: makeEl('body'),documentElement:makeEl('html')
    }),
    alert: function(){}, confirm: function(){ return true; }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.innerWidth=options.width||1000;
  sandbox.innerHeight=options.height||1000;
  sandbox.matchMedia=function(query){return {matches:!!options.mobile&&query.indexOf('pointer: coarse')>=0&&query.indexOf('hover: none')>=0,addEventListener:function(){},removeEventListener:function(){}};};
  sandbox.document.body.parentNode=doc;
  vm.createContext(sandbox);
  const catalog = path.join(dir, 'presets', 'catalog.js');
  if (fs.existsSync(catalog)) vm.runInContext(fs.readFileSync(catalog, 'utf8'), sandbox, { filename:'catalog.js' });
  vm.runInContext(src, sandbox, { filename: 'app.js' });

  const state = { fails: 0 };
  function check(name, cond, extra){
    if (cond) console.log('  ok   ' + name);
    else { state.fails++; console.log('  FAIL ' + name + (extra !== undefined ? ' → ' + extra : '')); }
  }
  function near(name, actual, expected, tolerance){
    const ok = Math.abs(actual - expected) <= tolerance;
    check(name, ok, 'получено ' + actual + ', ожидалось ' + expected + ' ±' + tolerance);
  }
  return { api: sandbox.__t, els: els, store: store, window: sandbox,
           makeEl:makeEl,
           pointer:function(target,type,init){const evt=new FakePointerEvent(type,Object.assign({pointerType:'touch',pointerId:1,button:0,clientX:0,clientY:0},init));target.dispatchEvent(evt);return evt;},
           runTimers:function(delay){Array.from(timers.entries()).forEach(function(entry){if(entry[1].delay===delay){timers.delete(entry[0]);entry[1].fn();}});},
           runFrames:function(){const list=Array.from(frames.values());frames.clear();list.forEach(function(fn){fn();});},
           check: check, near: near, fails: function(){ return state.fails; } };
}

module.exports = { load: load };
