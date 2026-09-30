/* Песочница для тестов: поднимает app.js в vm с минимальной заглушкой DOM.
   Использование:
     const { api, check } = require('./sandbox').load();
   api — внутренние функции стенда, открытые для проверок. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load(){
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
  potentialMap:potentialMap, internalLinks:internalLinks, nodeKey:nodeKey,
  termDefs:termDefs, terminal:terminal, tagOf:tagOf, renderAll:renderAll,
  deviceInner:deviceInner, measureNow:measureNow,
  coilVoltage:coilVoltage, lampsOn:lampsOn, lampVoltage:lampVoltage,
  acSnapshot:acSourceSnapshot, acSample:acPhasorSample, phasorDifference:phasorDifference,
  motorSupplyFrequency:motorSupplyFrequency, motorOperatingPoint:motorOperatingPoint,
  motorVisualOperating:motorVisualOperating, motorSupplyRelay:motorSupplyRelay,
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
  tpFieldVoltage:tpFieldVoltage, tpInputState:tpInputState, changeTpArmatureVoltage:changeTpArmatureVoltage,
  resistanceBetween:resistanceBetween, MOTOR_TERMS:MOTOR_TERMS, DC_MOTOR_TERMS:DC_MOTOR_TERMS,
  dcMotorInner:dcMotorInner, motorInner:motorInner, DC_GREEN:DC_GREEN
};
`;
  if (!/\}\)\(\);\s*$/.test(src)) throw new Error('не найден хвост IIFE: ожидался "})();" в конце app.js');
  src = src.replace(/\}\)\(\);\s*$/, expose + '})();');

  const els = {};
  function makeEl(tag){
    const el = {
      tagName: tag || 'div', style: {}, dataset: {}, value: '', textContent: '', scrollTop: 0,
      classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
      setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
      addEventListener(){}, removeEventListener(){}, focus(){}, blur(){},
      appendChild(){}, remove(){}, click(){}, contains(){ return false; },
      querySelector(){ return null; }, querySelectorAll(){ return []; },
      closest(){ return null; }, insertAdjacentHTML(){},
      getScreenCTM(){ return null; }, getBoundingClientRect(){ return {left:0,top:0,width:1000,height:1000}; }
    };
    let html = '';
    Object.defineProperty(el, 'innerHTML', { get(){ return html; }, set(v){ html = String(v); } });
    return el;
  }
  function byId(id){ return els[id] || (els[id] = makeEl('div')); }
  byId('logFilters').querySelectorAll = function(){ return []; };

  const store = {};
  const localStorage = {
    getItem: function(k){ return Object.prototype.hasOwnProperty.call(store,k) ? store[k] : null; },
    setItem: function(k,v){ store[k] = String(v); },
    removeItem: function(k){ delete store[k]; }
  };

  const sandbox = {
    console: console,
    Math: Math, JSON: JSON, Date: Date, Object: Object, Array: Array, String: String, Number: Number,
    isFinite: isFinite, parseFloat: parseFloat, parseInt: parseInt, RegExp: RegExp, Error: Error,
    Boolean: Boolean, Infinity: Infinity, NaN: NaN, undefined: undefined,
    Set: Set, Map: Map, Promise: Promise,
    performance: { now: function(){ return 1000; } },
    requestAnimationFrame: function(){ return 0; },
    cancelAnimationFrame: function(){},
    setInterval: function(){ return 0; },
    clearInterval: function(){},
    setTimeout: function(){ return 0; },
    clearTimeout: function(){},
    Blob: function(){}, FileReader: function(){},
    URL: { createObjectURL: function(){ return 'blob:test'; }, revokeObjectURL: function(){} },
    DOMPoint: function(x,y){ this.x=x; this.y=y; this.matrixTransform=function(){ return {x:x,y:y}; }; },
    localStorage: localStorage,
    navigator: { userAgent: 'node' },
    document: {
      getElementById: byId,
      createElement: makeEl,
      querySelector: function(){ return null; },
      querySelectorAll: function(){ return []; },
      addEventListener: function(){},
      elementFromPoint: function(){ return null; },
      body: makeEl('body')
    },
    alert: function(){}, confirm: function(){ return true; }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
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
           check: check, near: near, fails: function(){ return state.fails; } };
}

module.exports = { load: load };
