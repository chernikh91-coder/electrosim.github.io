(function(){
'use strict';

/* ============================================================
   1. ГЕОМЕТРИЯ СЦЕНЫ
   ============================================================ */
const MM        = 3;                 // пикселей на 1 мм
const RAIL_H    = 35 * MM;           // высота рейки (35 мм)
const RAILS     = [235, 635];        // оси верхней и опущенной нижней DIN-рейки
const MODULE    = 17.5 * MM;         // один модуль 17,5 мм
const RAIL_X0   = 90;
const SLOTS     = 20;
const RAIL_X1   = RAIL_X0 + SLOTS * MODULE;
const VW        = 1240, VH = 1550;   // увеличенное поле снизу для осмотра двигателя
const RELAY_DROP = 0;                // реле стыкуется снизу вплотную (надписи клемм пускателя видны)
const PIN_TOP    = 22;               // вылет щупов теплового реле над корпусом
const PAD_W      = 34;               // ширина приставной колодки A1–A2 справа от пускателя
/* цвета проводов аппаратов: L1 — коричневый, L2 — чёрный, L3 — серый, N — синий, PE — жёлто-зелёный */
const WC = { L1:'#8b5a2b', L2:'#1c1c1c', L3:'#8d939a', N:'#2a6fd6', PE:'#e8d800', C:'#d64545', C2:'#2f8fd6' };
/* цвета проводов ввода: фазы — красный, жёлтый, зелёный */
const WCF = { L1:'#d32f2f', L2:'#e0b800', L3:'#1f9d3a', N:'#2a6fd6', PE:'#e8d800' };
const wireDefaults = { shape:'smooth', color:'#1c1c1c' };
/* обозначения аппаратов на стенде */
const TAGS = { klemma:'XN', pebus:'XPE', mcb3:'QF1', mcb1:'QF2', rcd:'QD1', meter:'PI1', sensor:'PVA1', lamp:'HL1', bulb:'EL1', outlet:'XS1', wallSwitch:'SA1', twoWaySwitch:'SA1', fridge:'E1', washer:'E1', boiler:'E1', stove:'E1', vfd:'UZ1', tp:'UZT1', km1:'KM1', kk1:'KK1', timer:'KT1', M1:'M1', IN:'XT1', PB:'SB1–SB3' };
const TAG_PREFIX = { klemma:'XN', pebus:'XPE', mcb3:'QF', mcb1:'QF', rcd:'QD', meter:'PI', sensor:'PVA', lamp:'HL', bulb:'EL', outlet:'XS', wallSwitch:'SA', twoWaySwitch:'SA', fridge:'E', washer:'E', boiler:'E', stove:'E', vfd:'UZ', tp:'UZT', km1:'KM', kk1:'KK', timer:'KT' };
/* клеммная коробка ввода (в исходном щите, слева сверху): болты окрашены
   в цвета подходящих проводов — L1 красный, L2 жёлтый, L3 зелёный, N синий, PE жёлто-зелёный */
const INBOX = { x:90, y:-194, w:240, h:120 };
const INBOX_TERMS = [
  { key:'L1', label:'L1', dx:40,  dy:100, color:WCF.L1, tc:'#c62828' },
  { key:'L2', label:'L2', dx:80,  dy:100, color:WCF.L2, tc:'#9c7800' },
  { key:'L3', label:'L3', dx:120, dy:100, color:WCF.L3, tc:'#1b7f31' },
  { key:'N',  label:'N',  dx:160, dy:100, color:WCF.N,  tc:'#2a6fd6' },
  { key:'PE', label:'PE', dx:200, dy:100, color:WCF.PE, tc:'#5f7a00' }
];
const INBOX_SINGLE_TERMS = [
  // Ключ L1 сохраняет подключение первой фазы при переключении типа ввода.
  { key:'L1', label:'L', dx:50, dy:100, color:WC.L1, tc:WC.L1 },
  { key:'N', label:'N', dx:90, dy:100, color:WCF.N, tc:'#2a6fd6' },
  { key:'PE', label:'PE', dx:130, dy:100, color:WCF.PE, tc:'#5f7a00' }
];

/* ============================================================
   2. МОДЕЛЬ АППАРАТОВ
   ============================================================ */
const TYPES = {
  klemma: { title:'Нулевая колодка XN (шина N)',   modules:1, h:58*MM, kind:'terminal' },
  pebus:  { title:'Защитная колодка XPE (шина PE)', modules:1, h:58*MM, kind:'terminal' },
  mcb3:   { title:'Вводной автомат 3P, C25',        modules:3, h:82*MM, kind:'mcb', poles:3, rating:'C25' },
  mcb1:   { title:'Автомат 1P, C10',                modules:1, h:82*MM, kind:'mcb', poles:1, rating:'C10' },
  rcd:    { title:'УЗО 2P, 25 А / 30 мА',           modules:2, h:82*MM, kind:'rcd', poles:2, rating:'25 А' },
  meter:  { title:'Счётчик энергии 1Ф, 230 В',       modules:4, h:82*MM, kind:'meter' },
  sensor: { title:'Датчик напряжения и тока PVA1',   modules:2, h:82*MM, kind:'sensor' },
  lamp:   { title:'Сигнальная лампа HL1, зелёная, 220 В', modules:1, h:82*MM, kind:'lamp' },
  bulb:   { title:'Лампа накаливания EL1, 220 В / 100 Вт', modules:2, h:60*MM, kind:'bulb', freeOnly:true },
  outlet: { title:'Двойная розетка XS1, 220 В', modules:4, h:60*MM, kind:'outlet', freeOnly:true },
  junction:{ title:'Разветвительная коробка', modules:4, h:70*MM, kind:'junction', freeOnly:true },
  wallSwitch:{ title:'Выключатель освещения SA1', modules:3, h:60*MM, kind:'wallSwitch', freeOnly:true },
  twoWaySwitch:{ title:'Проходной выключатель SA', modules:3, h:60*MM, kind:'twoWaySwitch', freeOnly:true },
  fridge: { title:'Холодильник', modules:3, h:60*MM, kind:'appliance', freeOnly:true, defaultPower:300 },
  washer: { title:'Стиральная машина', modules:3, h:60*MM, kind:'appliance', freeOnly:true, defaultPower:2200 },
  boiler: { title:'Бойлер', modules:3, h:60*MM, kind:'appliance', freeOnly:true, defaultPower:2000 },
  stove:  { title:'Электрическая плита', modules:3, h:60*MM, kind:'appliance', freeOnly:true, defaultPower:7000 },
  vfd:    { title:'Частотный преобразователь UZ, 3×380 В', modules:4, h:110*MM, kind:'vfd' },
  tp:     { title:'Тиристорный преобразователь, 3×380 В', modules:4, h:82*MM, kind:'converter' },
  timer:  { title:'Реле времени KT1, 220 В', modules:1, h:82*MM, kind:'timer' },
  km1:    { title:'Магнитный пускатель KM1', modules:3, h:82*MM, kind:'contactor', overR:PAD_W },
  kk1:    { title:'Тепловое реле KK1',    modules:3, h:74*MM, kind:'relay', over:PIN_TOP }
};
const STOCK = { klemma:1, pebus:1, mcb3:1, mcb1:1, rcd:1, meter:1, sensor:1, lamp:3, bulb:1, outlet:1, wallSwitch:1, twoWaySwitch:1, fridge:1, washer:1, boiler:1, stove:1, vfd:1, tp:1, timer:1, km1:2, kk1:2 };
STOCK.junction=1;TAGS.junction='XR1';TAG_PREFIX.junction='XR';
const KIND_RU = { mcb:'автоматический выключатель', terminal:'клеммная шина: все зажимы соединены внутри',
                  junction:'открытая коробка: 4 независимые колодки по 3 клеммы',
                  rcd:'УЗО: двухполюсное отключение фазы и нуля, TEST 30 мА',
                  meter:'однофазный счётчик: 1–2 фаза, 3–4 нейтраль, учёт кВт·ч',
                  sensor:'измеритель напряжения и тока с проходными L и N',
                  lamp:'сигнальная лампа 220 В', timer:'реле времени: A1–A2 питание, S пуск, 15–16–18 контакт',
                  bulb:'лампа накаливания 220 В · свободное размещение',
                  outlet:'двойная розетка 220 В с общими L, N и PE',
                  wallSwitch:'настенный выключатель: одна или две независимые клавиши',
                  twoWaySwitch:'проходной выключатель: перекидной контакт L–1/L–2',
                  appliance:'бытовой электроприёмник 220 В с клеммами L, N и PE',
                  vfd:'преобразователь частоты: вход 3×380 В, регулируемый трёхфазный выход',
                  converter:'тиристорный преобразователь: вход 3×380 В, выходы якоря Я+/Я− и возбуждения Ш+/Ш−',
                  contactor:'электромагнитный аппарат', relay:'насадка на зажимы пускателя' };
/* Машина постоянного тока независимого возбуждения (ДПТ НВ).
   Якорь Я1–Я2 питается регулируемым напряжением преобразователя, обмотка
   возбуждения Ш1–Ш2 — от его же выпрямителя. Паспортные данные по умолчанию
   выбраны так, чтобы машина была сопоставима с асинхронным двигателем стенда. */
const DC_MOTOR_TERMS = [
  { key:'ya1', label:'Я1', dx:84,  dy:4,  color:WC.C },
  { key:'ya2', label:'Я2', dx:148, dy:4,  color:WC.C2 },
  { key:'sh1', label:'Ш1', dx:84,  dy:28, color:WC.L1 },
  { key:'sh2', label:'Ш2', dx:148, dy:28, color:WC.L3 },
  { key:'PE',  label:'PE', dx:208, dy:206, color:WC.PE, caseGround:true }
];
const DCM = { ratedArmatureVoltage:220, ratedFieldVoltage:220, ratedArmatureCurrent:5,
              ratedSpeed:1500, armatureResistance:1.6, fieldResistance:220,
              ratedPower:1.2, inertiaFactor:.6 };
/* Корпус машины постоянного тока выкрашен в зелёный, чтобы её нельзя было
   спутать с синим асинхронным двигателем стенда. Металл вала, коллектор
   и щётки остаются неокрашенными. */
const DC_GREEN = {
  edge:'#123c22', feet:'#2f7f47', base:'#1f5c33', bolt:'#0b2e18',
  bodyOuter:'#25703c', bodyMid:'#2f8a4c', bodyMidStroke:'#7fd39a', bodyInner:'#2a7f45',
  rib:'#1a5c30', cover:'#1b5c33', coverStroke:'#c9ecd6',
  box:'#2f8a4c', boxInner:'#2a7f45', boxLine:'#1f5c33',
  plate:'#def7e6', plateName:'#1c5c33', termLabel:'#eefaf1'
};

/* Ход рукоятки: вверх — «I» (включено), вниз — «0» (отключено),
   при срабатывании защиты — среднее положение */
const TRACK_TOP = 132;      // начало направляющей рукоятки
const TRACK_H   = 62;       // высота направляющей
const HANDLE_W  = 24;       // ширина рукоятки
const HANDLE_H  = 26;       // высота рукоятки
const HANDLE_TRAVEL = 32;   // полный ход, px
function handleY(tripped, on){
  return TRACK_TOP + 2 + (tripped ? HANDLE_TRAVEL/2 : (on ? 0 : HANDLE_TRAVEL));
}

/* Паспортное напряжение теперь участвует в расчётах, а не служит только подписью.
   Рабочий диапазон оставляем примерно таким же, каким раньше был диапазон
   180–260 В для аппарата на 220 В. */
function ratedVoltageOf(obj,fallback){
  const value=Number(obj&&obj.ratedVoltage);
  return isFinite(value)&&value>0?value:(fallback||220);
}
/* Бытовые нагрузки в текущей модели имеют cos φ = 1: P = U·I, R = U²/P.
   Храним согласованные номиналы без округления тока до десятых. */
function applianceRatings(obj,changedKey){
  const type=TYPES[obj.type],voltage=ratedVoltageOf(obj,220);
  const savedPower=Number(obj.ratedPower),savedCurrent=Number(obj.ratedCurrent);
  const hasPower=isFinite(savedPower)&&savedPower>0,hasCurrent=isFinite(savedCurrent)&&savedCurrent>0;
  const power=(changedKey==='ratedCurrent'&&hasCurrent)||(!hasPower&&hasCurrent)
    ?voltage*savedCurrent:(hasPower?savedPower:type.defaultPower);
  return {ratedVoltage:voltage,ratedPower:power,ratedCurrent:power/voltage};
}
function syncApplianceRatings(obj,changedKey){Object.assign(obj,applianceRatings(obj,changedKey));}
function voltageRatio(voltage,obj,fallback){return Math.max(0,Number(voltage)||0)/ratedVoltageOf(obj,fallback);}
function voltageIsOperating(voltage,obj,fallback){const ratio=voltageRatio(voltage,obj,fallback);return ratio>=.8&&ratio<=1.18;}
function voltageIsDestructive(voltage,obj,fallback){return voltageRatio(voltage,obj,fallback)>1.27;}
function voltageBrightness(voltage,obj,fallback){
  const ratio=voltageRatio(voltage,obj,fallback);
  return ratio<.15?0:Math.max(.08,Math.min(1,ratio*ratio));
}

const state = { power:false, devices:[], relays:[], wires:[], nextId:1,
                pb:{ up:false, stop:false, down:false },
                 motors:[], pushbuttons:[], clamps:[], panels:[], standaloneRails:false,
                mm:{ mode:false, fn:'voltage', a:null, b:null },
                specialProps:{inbox:{tag:'XT1',customName:'Ввод 3×380 В',ratedVoltage:380,frequency:50},multimeter:{tag:'PV1',customName:'Цифровой мультиметр'}},
                special:{ inbox:true, pushbutton:false, motor:false, multimeter:true } };
let terminalGuidesEnabled = false;
const METER = { x:875, y:1080, w:230, h:330,
                redX:1033, redY:1022, blackX:947, blackY:1022 };

/* Исходное состояние: монтажный щит со встроенным вводом XT1 и двумя DIN-рейками.
   Все аппараты находятся в лотке. */
function initialState(){
  state.power = true;                // сеть на вводе XT1 уже есть — можно мерить мультиметром
  state.devices = [
    { id:1, type:'klemma', rail:0, slot:8, on:false, tripped:false, coil:false },  // XN — справа от QF2, как на образце
    { id:2, type:'mcb3',   rail:0, slot:2, on:false, tripped:false, coil:false, breakerType:'C25' },  // QF1
    { id:3, type:'mcb1',   rail:0, slot:6, on:false, tripped:false, coil:false, breakerType:'C10' },  // QF2 (цепь управления 220 В)
    { id:4, type:'km1',    rail:1, slot:2, on:false, tripped:false, coil:false },  // KM1
    { id:6, type:'lamp',   rail:0, slot:10, on:false, tripped:false, coil:false, indicator:'green',  tag:'HL1' },
    { id:7, type:'km1',    rail:1, slot:6, on:false, tripped:false, coil:false },  // KM2 — независимый реверсивный пускатель
    { id:9, type:'lamp',   rail:0, slot:11, on:false, tripped:false, coil:false, indicator:'yellow', tag:'HL2' },
    { id:10,type:'lamp',   rail:0, slot:12, on:false, tripped:false, coil:false, indicator:'red',    tag:'HL3' }
    ,{ id:11,type:'pebus', rail:0, slot:9, on:false, tripped:false, coil:false }     // XPE — защитная шина
  ];
  state.relays = [
    { id:5, kmId:4, tripped:false, set:25, tested:false },
    { id:8, kmId:7, tripped:false, set:25, tested:false }
  ];
  state.wires = [
    { id:1,  a:{ devId:'IN', key:'L1' }, b:{ devId:2, key:'t0' } },   // L1 → QF1 зажим 1
    { id:2,  a:{ devId:'IN', key:'L2' }, b:{ devId:2, key:'t1' } },   // L2 → QF1 зажим 3
    { id:3,  a:{ devId:'IN', key:'L3' }, b:{ devId:2, key:'t2' } },   // L3 → QF1 зажим 5
    { id:4,  a:{ devId:2, key:'b0' },    b:{ devId:4, key:'t0' } },   // QF1:2 → KM1 1 L1
    { id:5,  a:{ devId:2, key:'b1' },    b:{ devId:4, key:'t1' } },   // QF1:4 → KM1 3 L2
    { id:6,  a:{ devId:2, key:'b2' },    b:{ devId:4, key:'t2' } },   // QF1:6 → KM1 5 L3
    { id:7,  a:{ devId:'IN', key:'L3' }, b:{ devId:3, key:'t0' } },   // отдельный зелёный провод L3 → QF2
    { id:8,  a:{ devId:3, key:'b0' },    b:{ devId:4, key:'A1' } },   // QF2:2 → катушка A1
    { id:9,  a:{ devId:'IN', key:'N' },  b:{ devId:1, key:'k0' } },   // ноль → нулевая колодка XN
    { id:10, a:{ devId:1, key:'k3' },    b:{ devId:4, key:'A2' } },   // с нулевой колодки → катушка A2
    { id:11, a:{ devId:'IN', key:'PE' }, b:{ devId:11,key:'k0' } }    // защитный проводник → шина XPE
  ];
  // Новый запуск начинается с ввода XT1 и щита в верхней левой части поля.
  state.devices = [];
  state.relays = [];
  state.wires = [];
  state.mm = { mode:false, fn:'voltage', a:null, b:null };
  state.pb = { up:false, stop:false, down:false };
  state.motors = [];
  state.pushbuttons = [];
  state.clamps = [];
  state.panels = [{id:'PN1',tag:'ЩР1',railCount:2,x:24,y:-176,inbox:true,inletVoltage:380}];
  state.standaloneRails = false;
  clampState=null;
  state.specialProps = {inbox:{tag:'XT1',customName:'Ввод 3×380 В',ratedVoltage:380,frequency:50},multimeter:{tag:'PV1',customName:'Цифровой мультиметр'}};
  state.special = { inbox:true, pushbutton:false, motor:false, multimeter:false };
  syncPanelInbox();
  state.nextId = 1;
  wireSeq = 1;
METER.x=875;METER.y=1080;METER.redX=1033;METER.redY=1022;METER.blackX=947;METER.blackY=1022;
MOTOR.rpmActual=0;MOTOR.angle=0;
}

/* ============================================================
   3. ОТРИСОВКА АППАРАТОВ (локальные координаты 0,0 … w,h)
   ============================================================ */
/* Винт под крестовую отвёртку (Phillips) */
function screw(cx, cy, r){
  const arm = r - 1.5;
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#c9a227" stroke="#8d6f14"/>'
       + '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*0.74).toFixed(1)+'" fill="#d9b83f" stroke="#a98517"/>'
       + '<line x1="'+(cx-arm)+'" y1="'+cy+'" x2="'+(cx+arm)+'" y2="'+cy+'" stroke="#6b5410" stroke-width="1.7" stroke-linecap="round"/>'
       + '<line x1="'+cx+'" y1="'+(cy-arm)+'" x2="'+cx+'" y2="'+(cy+arm)+'" stroke="#6b5410" stroke-width="1.7" stroke-linecap="round"/>';
}
function caseScrew(cx, cy, r){
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#b7bcc2" stroke="#8d9299"/>'
       + '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*0.66).toFixed(1)+'" fill="#cbd0d5" stroke="#a4aab1"/>';
}

/* Автоматический выключатель */
function mcbInner(type, o){
  const t = TYPES[type], w = t.modules*MODULE, h = t.h, poles = t.poles, poleW = w/poles;
  const on = !!o.on, tripped = !!o.tripped;
  const displayedRating = (type==='mcb1'||type==='mcb3') ? (o.breakerType || t.rating) : t.rating;
  let s = '';

  // корпус
  s += '<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="7" fill="#f3f4f1" stroke="#9aa0a8" stroke-width="1.5"/>';
  s += '<rect x="4" y="4" width="'+(w-8)+'" height="'+(h-8)+'" rx="5" fill="none" stroke="rgba(255,255,255,.85)"/>';
  s += '<rect x="'+(w-8)+'" y="6" width="4" height="'+(h-12)+'" fill="rgba(0,0,0,.05)"/>';

  // верхние и нижние зажимы
  s += '<rect x="3" y="3" width="'+(w-6)+'" height="30" rx="5" fill="#e2e5e9" stroke="#b3b8be"/>';
  s += '<rect x="3" y="'+(h-33)+'" width="'+(w-6)+'" height="30" rx="5" fill="#e2e5e9" stroke="#b3b8be"/>';
  for (let i=0;i<poles;i++){
    const cx = (i+0.5)*poleW, r = Math.min(9, poleW*0.26);
    s += screw(cx, 18, r);
    s += screw(cx, h-18, r);
  }

  // наклейка с характеристиками
  const st = 38, sh = 74;
  s += '<rect x="6" y="'+st+'" width="'+(w-12)+'" height="'+sh+'" rx="3" fill="#fcfcfa" stroke="#d8dbdf"/>';
  s += '<text x="'+(w/2)+'" y="'+(st+22)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#1b3a6b" font-family="Segoe UI,Arial">'+(o.tag||'QF')+'</text>';
  s += '<text x="'+(w/2)+'" y="'+(st+52)+'" text-anchor="middle" font-size="15" font-weight="700" fill="#c62828" font-family="Segoe UI,Arial">'+displayedRating+'</text>';
  s += '<text x="'+(w/2)+'" y="'+(st+66)+'" text-anchor="middle" font-size="8" fill="#5b6470" font-family="Segoe UI,Arial">'
     + (poles===3 ? '3P  380В~' : '1P  230В~') + '</text>';

  // окно индикатора состояния (красный — вкл., зелёный — откл., оранжевый — сработал)
  const winColor = tripped ? '#ff8a00' : (on ? '#e01b1b' : '#1e6b3a');
  for (let i=0;i<poles;i++){
    const cx = (i+0.5)*poleW;
    s += '<rect x="'+(cx-15)+'" y="118" width="30" height="12" rx="3" fill="#2b2f34" stroke="#9aa0a8"/>';
    s += '<rect class="win" x="'+(cx-12)+'" y="120.5" width="24" height="7" rx="2" fill="'+winColor+'"/>';
  }

  // направляющие рукояток
  const hy = handleY(tripped, on);
  for (let i=0;i<poles;i++){
    const cx = (i+0.5)*poleW;
    s += '<g transform="translate('+cx+',0)">'
       +   '<rect x="-14" y="'+TRACK_TOP+'" width="28" height="'+TRACK_H+'" rx="4" fill="#e4e7ea" stroke="#c2c7cd"/>'
       +   '<rect x="-14" y="'+TRACK_TOP+'" width="28" height="7" rx="3" fill="rgba(0,0,0,.08)"/>'
       +   '<rect x="-14" y="'+(TRACK_TOP+TRACK_H-6)+'" width="28" height="6" rx="3" fill="rgba(0,0,0,.05)"/>'
       + '</g>';
  }
  // рукоятки ходят вверх («I») / вниз («0»); у 3P они соединены общей жёлтой перемычкой
  s += '<g class="hdl" transform="translate(0,'+hy+')">';
  if (poles > 1){
    const bx0 = 0.5*poleW - HANDLE_W/2 - 5, bx1 = (poles-0.5)*poleW + HANDLE_W/2 + 5;
    s += '<rect x="'+bx0+'" y="10.5" width="'+(bx1-bx0)+'" height="9.5" rx="4.75" fill="#f2c218" stroke="#b98d0a" stroke-width="1.1"/>';
    s += '<rect x="'+(bx0+3)+'" y="12.5" width="'+(bx1-bx0-6)+'" height="3" rx="1.5" fill="rgba(255,255,255,.5)"/>';
  }
  for (let i=0;i<poles;i++){
    const cx = (i+0.5)*poleW;
    s += '<g transform="translate('+cx+',0)">'
       +   '<rect x="'+(-HANDLE_W/2)+'" y="0" width="'+HANDLE_W+'" height="'+HANDLE_H+'" rx="4" fill="#f2c218" stroke="#b98d0a" stroke-width="1.2"/>'
       +   '<rect x="'+(-HANDLE_W/2)+'" y="0" width="'+HANDLE_W+'" height="8" rx="4" fill="rgba(255,255,255,.5)"/>'
       +   '<line x1="-6" y1="16" x2="6" y2="16" stroke="rgba(120,90,0,.4)" stroke-width="2"/>'
       + '</g>';
  }
  s += '</g>';

  // надпись состояния
  const stTxt = tripped ? 'СРАБОТАЛ' : (on ? 'ВКЛ' : 'ОТКЛ');
  const stCol = tripped ? '#ff8a00' : (on ? '#c62828' : '#4b5563');
  s += '<text class="stateTxt" x="'+(w/2)+'" y="206" text-anchor="middle" font-size="11" font-weight="700" fill="'+stCol+'" font-family="Segoe UI,Arial">'+stTxt+'</text>';

  return s;
}

/* Двухполюсное УЗО: общий механизм одновременно размыкает фазу и нейтраль.
   Внешний вид повторяет язык автоматов стенда, а кнопка TEST имитирует ток утечки. */
function rcdInner(o){
  const w = TYPES.rcd.modules*MODULE, h = TYPES.rcd.h;
  const on = !!o.on, tripped = !!o.tripped;
  const xL = w*0.25, xN = w*0.75;
  let s = '';

  s += '<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="7" fill="#f3f4f1" stroke="#9aa0a8" stroke-width="1.5"/>';
  s += '<rect x="4" y="4" width="'+(w-8)+'" height="'+(h-8)+'" rx="5" fill="none" stroke="rgba(255,255,255,.85)"/>';
  s += '<rect x="'+(w-8)+'" y="6" width="4" height="'+(h-12)+'" fill="rgba(0,0,0,.05)"/>';
  s += '<rect x="3" y="3" width="'+(w-6)+'" height="30" rx="5" fill="#e2e5e9" stroke="#b3b8be"/>';
  s += '<rect x="3" y="'+(h-33)+'" width="'+(w-6)+'" height="30" rx="5" fill="#e2e5e9" stroke="#b3b8be"/>';
  s += screw(xL,18,9)+screw(xN,18,9)+screw(xL,h-18,9)+screw(xN,h-18,9);
  // Маркировка стоит справа от винтов и не перекрывает кресты клемм.
  s += '<text x="'+(xL+14)+'" y="22" text-anchor="start" font-size="8" font-weight="700" fill="#4b5563" font-family="Segoe UI,Arial">1</text>';
  s += '<text x="'+(xN-14)+'" y="22" text-anchor="end" font-size="8" font-weight="700" fill="#4b5563" font-family="Segoe UI,Arial">N</text>';
  s += '<text x="'+(xL+14)+'" y="'+(h-15)+'" text-anchor="start" font-size="8" font-weight="700" fill="#4b5563" font-family="Segoe UI,Arial">2</text>';
  s += '<text x="'+(xN-14)+'" y="'+(h-15)+'" text-anchor="end" font-size="8" font-weight="700" fill="#4b5563" font-family="Segoe UI,Arial">N</text>';

  // Наклейка построена теми же размерами, шрифтами и отступами, что у автомата C10.
  s += '<rect x="6" y="38" width="'+(w-12)+'" height="76" rx="3" fill="#fcfcfa" stroke="#d8dbdf"/>';
  s += '<rect x="'+(w/2-23)+'" y="61" width="46" height="9" rx="1.5" fill="#f2c218"/>';
  s += '<text x="'+(w/2)+'" y="55" text-anchor="middle" font-size="12" font-weight="700" fill="#1b3a6b" font-family="Segoe UI,Arial">'+(o.tag||'QD')+'</text>';
  s += '<text x="'+(w/2)+'" y="87" text-anchor="middle" font-size="15" font-weight="700" fill="#c62828" font-family="Segoe UI,Arial">25 А</text>';
  s += '<text x="'+(w/2)+'" y="101" text-anchor="middle" font-size="8" fill="#5b6470" font-family="Segoe UI,Arial">230 В~ · 50 Гц</text>';
  s += '<text x="'+(w/2)+'" y="111" text-anchor="middle" font-size="8" font-weight="700" fill="#5b6470" font-family="Segoe UI,Arial">IΔn 30 мА</text>';

  const winColor = tripped ? '#ff8a00' : (on ? '#e01b1b' : '#1e6b3a');
  s += '<rect x="14" y="119" width="28" height="12" rx="3" fill="#2b2f34" stroke="#9aa0a8"/>';
  s += '<rect class="win" x="17" y="121.5" width="22" height="7" rx="2" fill="'+winColor+'"/>';

  s += '<rect x="57" y="'+TRACK_TOP+'" width="34" height="'+TRACK_H+'" rx="5" fill="#e4e7ea" stroke="#c2c7cd"/>';
  s += '<rect x="57" y="'+TRACK_TOP+'" width="34" height="7" rx="3" fill="rgba(0,0,0,.08)"/>';
  s += '<g class="hdl" transform="translate(0,'+handleY(tripped,on)+')">'
     + '<rect x="56" y="0" width="36" height="26" rx="4" fill="#f2c218" stroke="#b98d0a" stroke-width="1.2"/>'
     + '<rect x="56" y="0" width="36" height="8" rx="4" fill="rgba(255,255,255,.5)"/>'
     + '<line x1="66" y1="17" x2="82" y2="17" stroke="#9a7300" stroke-width="2.4" stroke-linecap="round"/></g>';

  s += '<g class="rcd-test" data-rcd-test="1" style="cursor:pointer;touch-action:none">'
     + '<ellipse cx="29" cy="166" rx="18" ry="13" fill="rgba(0,0,0,.18)"/>'
     + '<rect x="11" y="150" width="36" height="25" rx="9" fill="#8d949a" stroke="#5f666c" stroke-width="1.2"/>'
     + '<rect x="14" y="152" width="30" height="8" rx="5" fill="rgba(255,255,255,.45)"/>'
     + '<text x="29" y="168" text-anchor="middle" font-size="14" font-weight="800" fill="#343a40">T</text>'
     + '<title>TEST — проверка срабатывания УЗО</title></g>';

  const stTxt = tripped ? 'СРАБОТАЛО' : (on ? 'ВКЛ' : 'ОТКЛ');
  const stCol = tripped ? '#ff8a00' : (on ? '#c62828' : '#4b5563');
  s += '<text class="stateTxt" x="'+(w/2)+'" y="206" text-anchor="middle" font-size="10" font-weight="700" fill="'+stCol+'" font-family="Segoe UI,Arial">'+stTxt+'</text>';
  return s;
}

/* Однофазный электронный счётчик. Главные цепи: 1→2 (L) и 3→4 (N).
   Дисплей показывает накопленную энергию, нижняя строка — текущую мощность. */
function meterInner(o){
  const w=TYPES.meter.modules*MODULE,h=TYPES.meter.h;
  const tx=[.125,.375,.625,.875].map(function(k){return w*k;});
  const energy=Math.max(0,Number(o.energyKwh)||0);
  const power=Math.max(0,Number(o.meterPowerW)||0);
  const digits=energy.toFixed(6).padStart(10,'0');
  const pulse=!!o.meterPulse;
  let s='';
  s+='<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="8" fill="#f3f4f1" stroke="#9aa0a8" stroke-width="1.5"/>';
  s+='<rect x="4" y="4" width="'+(w-8)+'" height="'+(h-8)+'" rx="6" fill="none" stroke="rgba(255,255,255,.9)"/>';
  s+='<rect x="'+(w-9)+'" y="7" width="5" height="'+(h-14)+'" fill="rgba(0,0,0,.05)"/>';
  s+='<rect x="3" y="3" width="'+(w-6)+'" height="27" rx="6" fill="#e8eaed" stroke="#c0c5cb"/>';
  s+='<path d="M12 22 H '+(w-12)+'" stroke="rgba(255,255,255,.9)" stroke-width="2"/>';
  s+='<rect x="3" y="'+(h-50)+'" width="'+(w-6)+'" height="47" rx="6" fill="#e2e5e9" stroke="#b3b8be"/>';
  tx.forEach(function(cx){s+=screw(cx,h-18,10);});
  const terminalLabels=['1 · L ВХ','2 · L ВЫХ','3 · N ВХ','4 · N ВЫХ'];
  tx.forEach(function(cx,i){
    s+='<text x="'+cx+'" y="'+(h-35)+'" text-anchor="middle" font-size="7" font-weight="700" fill="'+(i<2?'#8b5a2b':'#2a6fd6')+'" font-family="Segoe UI,Arial">'+terminalLabels[i]+'</text>';
  });

  s+='<rect x="8" y="34" width="'+(w-16)+'" height="154" rx="5" fill="#fcfcfa" stroke="#d8dbdf"/>';
  s+='<text x="'+(w/2)+'" y="52" text-anchor="middle" font-size="12" font-weight="800" fill="#1b3a6b" font-family="Segoe UI,Arial">'+(o.tag||'PI')+'</text>';
  s+='<text x="'+(w/2)+'" y="66" text-anchor="middle" font-size="8" fill="#5b6470" font-family="Segoe UI,Arial">1 ФАЗА · 2 ПРОВОДА · 230 В</text>';
  s+='<rect x="17" y="74" width="'+(w-34)+'" height="62" rx="4" fill="#3a3327" stroke="#25211a" stroke-width="2"/>';
  s+='<rect x="21" y="78" width="'+(w-42)+'" height="54" rx="2" fill="#d58a35" stroke="#efb15d"/>';
  s+='<text class="meter-energy" x="'+(w/2)+'" y="112" text-anchor="middle" font-size="25" font-weight="700" fill="#151515" font-family="Consolas,monospace">'+digits+'</text>';
  s+='<text x="'+(w-25)+'" y="128" text-anchor="end" font-size="9" font-weight="800" fill="#382612" font-family="Segoe UI,Arial">kW·h</text>';
  s+='<circle cx="31" cy="149" r="6" fill="#245d39" stroke="#384047"/><text x="42" y="152" font-size="7" fill="#4b5563" font-family="Segoe UI,Arial">POWER</text>';
  s+='<circle class="meter-pulse" cx="88" cy="149" r="6" fill="'+(pulse?'#ff3b30':'#657079')+'" stroke="#384047"/><text x="99" y="152" font-size="7" fill="#4b5563" font-family="Segoe UI,Arial">PULSE</text>';
  s+='<text class="meter-power" x="'+(w/2)+'" y="173" text-anchor="middle" font-size="13" font-weight="800" fill="#26333c" font-family="Segoe UI,Arial">'+Math.round(power)+' W</text>';
  s+='<text x="'+(w/2)+'" y="184" text-anchor="middle" font-size="7.5" fill="#5b6470" font-family="Segoe UI,Arial">5(60) A · 50 Гц · 1000 imp/kWh</text>';
  return s;
}

/* Комбинированный DIN-индикатор напряжения и тока. Фаза и нейтраль проходят
   через прибор, поэтому измеряется именно нагрузка, подключённая к выходам. */
function sensorInner(o){
  const w=TYPES.sensor.modules*MODULE,h=TYPES.sensor.h;
  const xs=[w*.25,w*.75];
  const voltage=Math.max(0,Number(o.sensorVoltage)||0);
  const current=Math.max(0,Number(o.sensorCurrentA)||0);
  let s='';
  s+='<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="7" fill="#f3f4f1" stroke="#9aa0a8" stroke-width="1.5"/>';
  s+='<rect x="4" y="4" width="'+(w-8)+'" height="'+(h-8)+'" rx="5" fill="none" stroke="#ffffff" opacity=".85"/>';
  s+='<rect x="3" y="3" width="'+(w-6)+'" height="41" rx="5" fill="#e2e5e9" stroke="#b3b8be"/>';
  s+='<rect x="3" y="'+(h-44)+'" width="'+(w-6)+'" height="41" rx="5" fill="#e2e5e9" stroke="#b3b8be"/>';
  xs.forEach(function(cx){s+=screw(cx,19,10)+screw(cx,h-19,10);});
  s+='<text x="'+xs[0]+'" y="41" text-anchor="middle" font-size="6" font-weight="700" fill="#4b5563" font-family="Segoe UI,Arial">L · ВХ</text>';
  s+='<text x="'+xs[1]+'" y="41" text-anchor="middle" font-size="6" font-weight="700" fill="#4b5563" font-family="Segoe UI,Arial">N · ВХ</text>';
  s+='<text x="'+xs[0]+'" y="'+(h-35)+'" text-anchor="middle" font-size="6" font-weight="700" fill="#4b5563" font-family="Segoe UI,Arial">L · ВЫХ</text>';
  s+='<text x="'+xs[1]+'" y="'+(h-35)+'" text-anchor="middle" font-size="6" font-weight="700" fill="#4b5563" font-family="Segoe UI,Arial">N · ВЫХ</text>';
  s+='<rect x="8" y="49" width="'+(w-16)+'" height="150" rx="4" fill="#fcfcfa" stroke="#d8dbdf"/>';
  s+='<text x="'+(w/2)+'" y="65" text-anchor="middle" font-size="11" font-weight="800" fill="#1b3a6b" font-family="Segoe UI,Arial">'+(o.tag||'PVA')+'</text>';
  s+='<text x="'+(w/2)+'" y="78" text-anchor="middle" font-size="7.5" fill="#5b6470" font-family="Segoe UI,Arial">AC 50 Гц</text>';
  s+='<rect x="15" y="87" width="'+(w-30)+'" height="43" rx="3" fill="#252a2d" stroke="#777e84" stroke-width="1.5"/>';
  s+='<text class="sensor-v" x="'+(w/2-5)+'" y="120" text-anchor="middle" font-size="29" font-weight="700" fill="#ef2828" font-family="Consolas,monospace">'+Math.round(voltage)+'</text>';
  s+='<text x="'+(w-20)+'" y="121" text-anchor="end" font-size="14" font-weight="800" fill="#ef2828" font-family="Segoe UI,Arial">V</text>';
  s+='<rect x="15" y="139" width="'+(w-30)+'" height="43" rx="3" fill="#252a2d" stroke="#777e84" stroke-width="1.5"/>';
  s+='<text class="sensor-a" x="'+(w/2-5)+'" y="172" text-anchor="middle" font-size="27" font-weight="700" fill="#1fc3a2" font-family="Consolas,monospace">'+current.toFixed(1)+'</text>';
  s+='<text x="'+(w-20)+'" y="173" text-anchor="end" font-size="14" font-weight="800" fill="#1fc3a2" font-family="Segoe UI,Arial">A</text>';
  s+='<text x="'+(w/2)+'" y="196" text-anchor="middle" font-size="7" fill="#6a7178" font-family="Segoe UI,Arial">0–400 В · 0–100 А</text>';
  return s;
}

/* Нулевая колодка: один модуль, шесть зажимов в столбик.
   Все зажимы соединены внутри общей шиной — это один узел «ноль». */
function terminalInner(type,o){
  type = type || 'klemma';
  o = o || {};
  const w = TYPES.klemma.modules*MODULE, h = TYPES.klemma.h;
  const N = 6;
  const pe = type === 'pebus';
  let s = '';
  // корпус
  s += '<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="5" fill="'+(pe?'#2f9d48':'#1d6fb8')+'" stroke="'+(pe?'#176b2c':'#12507f')+'" stroke-width="1.5"/>';
  s += '<rect x="4" y="4" width="'+(w-8)+'" height="'+(h-8)+'" rx="4" fill="none" stroke="rgba(255,255,255,.35)"/>';
  const cell = h/N;
  // внутренняя шина, связывающая все зажимы
  s += '<rect x="'+(w/2-5)+'" y="'+(cell/2)+'" width="10" height="'+(h-cell)+'" rx="3" fill="#b87333" stroke="#8a5522"/>';
  s += '<rect x="'+(w/2-3)+'" y="'+(cell/2+2)+'" width="4" height="'+(h-cell-4)+'" rx="2" fill="#d99a5b" opacity=".7"/>';
  for (let i=0;i<N;i++){
    const cy = (i+0.5)*cell;
    s += '<rect x="6" y="'+(cy-cell/2+3)+'" width="'+(w-12)+'" height="'+(cell-6)+'" rx="3" fill="'+(pe?'#43b85d':'#2a80cc')+'"/>';
    s += screw(w/2, cy, 8.5);
  }
  // обозначение нулевой шины
  s += '<text x="5" y="12" font-size="7" font-weight="700" fill="'+(pe?'#efff68':'#cfe4f5')+'" font-family="Segoe UI,Arial">'+(o.tag||(pe?'XPE':'XN'))+'</text>';
  s += '<text x="'+(w-5)+'" y="'+(h-7)+'" text-anchor="end" font-size="9" font-weight="700" fill="'+(pe?'#efff68':'#cfe4f5')+'" font-family="Segoe UI,Arial">'+(pe?'PE':'N')+'</text>';
  // защёлка на рейку
  s += '<rect x="'+(w-11)+'" y="'+(h/2-12)+'" width="8" height="24" rx="2" fill="'+(pe?'#176b2c':'#12507f')+'"/>';
  return s;
}

/* Зажим пускателя/реле: тёмное гнездо с латунным винтом под крестовую отвёртку */
function contactHole(cx, cy, r){
  const arm = r*0.62;
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#23262a" stroke="#a9aeb5" stroke-width="1"/>'
       + '<circle cx="'+cx+'" cy="'+cy+'" r="'+arm+'" fill="#c9a227" stroke="#8d6f14"/>'
       + '<line x1="'+(cx-arm*0.9)+'" y1="'+cy+'" x2="'+(cx+arm*0.9)+'" y2="'+cy+'" stroke="#6b5410" stroke-width="1.6" stroke-linecap="round"/>'
       + '<line x1="'+cx+'" y1="'+(cy-arm*0.9)+'" x2="'+cx+'" y2="'+(cy+arm*0.9)+'" stroke="#6b5410" stroke-width="1.6" stroke-linecap="round"/>';
}

/* Магнитный пускатель KMI-22510:
   сверху 1 L1 / 3 L2 / 5 L3 / 13 НО, снизу 2 T1 / 4 T2 / 6 T3 / 14 НО,
   на лицевой стороне — выводы катушки A1 и A2 (питание 380 В),
   жёлтая траверса (якорь) втягивается при подаче питания на катушку */
function kmInner(o){
  const w = TYPES.km1.modules*MODULE, h = TYPES.km1.h;   // 157,5 × 246
  const on = !!o.coil;
  const animatePress = !!(on && o.coilAnim);
  o.coilAnim = false;
  const n = 4, cell = w/n;
  const topLab = ['1 L1','3 L2','5 L3','13 НО'];
  const botLab = ['2 T1','4 T2','6 T3','14 НО'];
  let s = '';

  // корпус
  s += '<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="8" fill="#3a4046" stroke="#22262a" stroke-width="1.5"/>';
  s += '<rect x="4" y="4" width="'+(w-8)+'" height="'+(h-8)+'" rx="6" fill="none" stroke="rgba(255,255,255,.08)"/>';

  // наклейка катушки
  s += '<rect x="'+(w*0.16)+'" y="1" width="'+(w*0.68)+'" height="13" rx="3" fill="'+(o.coilBurned?'#b32622':'#1f6fb8')+'"/>';
  s += '<text x="'+(w/2)+'" y="10.5" text-anchor="middle" font-size="7" font-weight="'+(o.coilBurned?'800':'400')+'" fill="#dbeaff" font-family="Segoe UI,Arial">'+(o.coilBurned?'КАТУШКА СГОРЕЛА':'Uc '+Math.round(ratedVoltageOf(o,220))+'В · 50 Гц')+'</text>';

  // верхняя колодка зажимов
  s += '<rect x="4" y="16" width="'+(w-8)+'" height="62" rx="4" fill="#e3e6ea" stroke="#b6bbc2"/>';
  for (let i=0;i<n;i++){
    const cx = (i+0.5)*cell;
    s += contactHole(cx, 34, 11);
    s += '<text x="'+cx+'" y="54" text-anchor="middle" font-size="9" fill="#2b3138" font-family="Segoe UI,Arial">'+topLab[i]+'</text>';
  }

  // маркировка корпуса
  s += '<text x="'+(w/2)+'" y="105" text-anchor="middle" font-size="12" font-weight="700" fill="#cfd6dc" font-family="Segoe UI,Arial">'+(o.tag||'KM')+'</text>';

  // Углубление под траверсой и жёлтые пластины, вид сверху.
  // При срабатывании пластины уменьшаются и темнеют, создавая эффект вдавливания в корпус.
  const py = 104;
  s += '<rect x="13" y="93" width="'+(w-26)+'" height="62" rx="8" fill="#252a2f" stroke="#171a1d" stroke-width="2"/>';
  s += '<g class="plg" data-zone="manual-contactor" transform="translate(0,'+py+')" style="cursor:pointer;touch-action:none"><g class="plg-depth '
     + (on ? 'pressed'+(animatePress ? ' pressing' : '') : 'released')+'">';
  for (let i=0;i<n;i++){
    s += '<rect class="plg-plate" x="'+(16+i*(w-32)/n+2)+'" y="0" width="'+((w-32)/n-4)+'" height="40" rx="4" fill="#f2c218" stroke="#b98d0a"/>';
    s += '<rect class="plg-shine" x="'+(16+i*(w-32)/n+2)+'" y="0" width="'+((w-32)/n-4)+'" height="10" rx="4" fill="rgba(255,255,255,.45)"/>';
  }
  s += '<rect class="plg-plate" x="'+(w/2-17)+'" y="-9" width="34" height="58" rx="5" fill="#f2c218" stroke="#b98d0a"/>';
  s += '<rect class="plg-shine" x="'+(w/2-17)+'" y="-9" width="34" height="11" rx="5" fill="rgba(255,255,255,.45)"/>';
  s += '</g></g>';

  // Дополнительная контактная колодка ПКИ-11 закреплена на лицевой стороне.
  // Она находится между основными верхними и нижними клеммами и не закрывает их.
  s += '<g class="aux-block">';
  s += '<rect x="36.75" y="82" width="84" height="84" rx="6" fill="#eef0f2" stroke="#9da3a9" stroke-width="1.5"/>';
  s += '<rect x="39.75" y="85" width="78" height="78" rx="5" fill="none" stroke="#ffffff" opacity=".75"/>';
  s += '<text x="59.75" y="94" text-anchor="middle" font-size="8" font-weight="700" fill="#33383d" font-family="Segoe UI,Arial">53</text>';
  s += '<text x="97.75" y="94" text-anchor="middle" font-size="8" font-weight="700" fill="#33383d" font-family="Segoe UI,Arial">61</text>';
  s += contactHole(59.75, 104, 8);
  s += contactHole(97.75, 104, 8);
  const auxX = on ? 71.75 : 69.75, auxY = on ? 117 : 115;
  const auxW = on ? 14 : 18, auxH = on ? 14 : 18;
  s += '<g class="aux-actuator plg-depth'+(on ? ' pressed'+(animatePress ? ' pressing' : '') : '')+'">'
     + '<rect x="'+auxX+'" y="'+auxY+'" width="'+auxW+'" height="'+auxH+'" rx="3" fill="#f2c218" stroke="#b98d0a" stroke-width="1.2"/>'
     + '<rect x="'+(auxX+2)+'" y="'+(auxY+2)+'" width="'+(auxW-4)+'" height="4" rx="2" fill="#fff3a5" opacity="'+(on ? '.18' : '.62')+'"/>'
     + '</g>';
  s += contactHole(59.75, 144, 8);
  s += contactHole(97.75, 144, 8);
  s += '<text x="59.75" y="160" text-anchor="middle" font-size="8" font-weight="700" fill="#33383d" font-family="Segoe UI,Arial">54</text>';
  s += '<text x="97.75" y="160" text-anchor="middle" font-size="8" font-weight="700" fill="#33383d" font-family="Segoe UI,Arial">62</text>';
  s += '<text x="57.75" y="126" text-anchor="end" font-size="6.5" fill="#687078" font-family="Segoe UI,Arial">НО</text>';
  s += '<text x="100.75" y="126" font-size="6.5" fill="#687078" font-family="Segoe UI,Arial">НЗ</text>';
  s += '</g>';

  // нижняя колодка зажимов
  s += '<rect x="4" y="'+(h-78)+'" width="'+(w-8)+'" height="62" rx="4" fill="#e3e6ea" stroke="#b6bbc2"/>';
  for (let i=0;i<n;i++){
    const cx = (i+0.5)*cell;
    s += contactHole(cx, h-34, 11);
    s += '<text x="'+cx+'" y="'+(h-54)+'" text-anchor="middle" font-size="9" fill="#2b3138" font-family="Segoe UI,Arial">'+botLab[i]+'</text>';
  }

  // приставная колодка катушки A1–A2: приставлена справа вплотную к корпусу (заподлицо),
  // выводы вертикально, цвет — как у клеммных колодок
  const px0 = w-1.5, pw = PAD_W, px1 = px0+pw, padH = 150,
        py0 = (h-padH)/2, py1 = py0+padH, rr = 5, pcx = px0 + pw/2;
  s += '<path d="M '+px0+' '+py0+' H '+(px1-rr)+' A '+rr+' '+rr+' 0 0 1 '+px1+' '+(py0+rr)
     + ' V '+(py1-rr)+' A '+rr+' '+rr+' 0 0 1 '+(px1-rr)+' '+py1+' H '+px0+' Z" fill="#e3e6ea" stroke="#b6bbc2"/>';
  s += '<line x1="'+px0+'" y1="'+(py0+2)+'" x2="'+px0+'" y2="'+(py1-2)+'" stroke="#9aa0a8"/>';
  s += '<text x="'+pcx+'" y="'+(py0+40)+'" text-anchor="middle" font-size="10" font-weight="700" fill="#2b3138" font-family="Segoe UI,Arial">A1</text>';
  s += screw(pcx, py0+18, 9);
  s += '<text x="'+pcx+'" y="'+(py1-40)+'" text-anchor="middle" font-size="10" font-weight="700" fill="#2b3138" font-family="Segoe UI,Arial">A2</text>';
  s += screw(pcx, py1-18, 9);
  s += '<rect class="zone" data-zone="coil" x="'+(px0-2)+'" y="'+(py0-2)+'" width="'+(pw+4)+'" height="'+(py1-py0+4)+'" fill="transparent" pointer-events="all"/>';
  return s;
}

/* Тепловое реле KEA3-25: три щупа сверху вставляются прямо в зажимы 2 T1 / 4 T2 / 6 T3
   магнитного пускателя — своя DIN-рейка реле не нужна. Контакты: 95-96 NC, 97-98 NO. */
function relayInner(o){
  const w = TYPES.kk1.modules*MODULE, h = TYPES.kk1.h;      // 157,5 × 174
  const tripped = !!o.tripped, set = o.set || 25;
  /* шаг щупов — точно такой же, как шаг зажимов трёхфазного пускателя
     (ширина пускателя / 4 зажима): щупы встают строго под зажимы 2 T1 / 4 T2 / 6 T3 */
  const cell = TYPES.km1.modules*MODULE/4;
  const pinX = [0,1,2].map(function(i){ return (i+0.5)*cell; });
  let s = '';

  // медные щупы, уходящие вверх в зажимы пускателя.
  // После крепления на пускатель щупы не рисуются — они «ушли» внутрь его зажимов.
  if (!o.attached){
    pinX.forEach(function(cx){
      s += '<rect x="'+(cx-4)+'" y="'+(-PIN_TOP)+'" width="8" height="'+(PIN_TOP+18)+'" rx="2.5" fill="#b5722f" stroke="#5e3a13" stroke-width="1"/>';
      s += '<rect x="'+(cx-2.4)+'" y="'+(-PIN_TOP+1.5)+'" width="3" height="'+(PIN_TOP+13)+'" rx="1.5" fill="#e0a464"/>';
      s += '<circle cx="'+cx+'" cy="'+(-PIN_TOP)+'" r="4" fill="#b5722f" stroke="#5e3a13" stroke-width="1"/>';
    });
  }

  // корпус
  s += '<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="6" fill="#1f5f9e" stroke="#12406e" stroke-width="1.5"/>';
  s += '<rect x="4" y="4" width="'+(w-8)+'" height="'+(h-8)+'" rx="4" fill="none" stroke="rgba(255,255,255,.25)"/>';
  pinX.forEach(function(cx){
    s += '<rect x="'+(cx-8)+'" y="4" width="16" height="15" rx="3" fill="#2b3036"/>';
  });

  // лимб уставки: 17…25 А
  s += '<circle cx="42" cy="62" r="31" fill="#123c66" stroke="#0d2d4d"/>';
  s += '<circle cx="42" cy="62" r="24" fill="#1b5a92" stroke="#0d2d4d"/>';
  for (let i=0;i<9;i++){
    const a = (-120 + i*30) * Math.PI/180;
    const nx = 42 + Math.sin(a)*20, ny = 62 - Math.cos(a)*20;
    const t1x = 42 + Math.sin(a)*25, t1y = 62 - Math.cos(a)*25;
    const t2x = 42 + Math.sin(a)*29.5, t2y = 62 - Math.cos(a)*29.5;
    s += '<line x1="'+t1x+'" y1="'+t1y+'" x2="'+t2x+'" y2="'+t2y+'" stroke="#8fc0e6" stroke-width="1.2"/>';
    s += '<text x="'+nx+'" y="'+(ny+2.6)+'" text-anchor="middle" font-size="6.8" fill="#cfe4f5" font-family="Segoe UI,Arial">'+(17+i)+'</text>';
  }
  const sa = (-120 + (set-17)*30) * Math.PI/180;
  s += '<line x1="42" y1="62" x2="'+(42+Math.sin(sa)*21)+'" y2="'+(62-Math.cos(sa)*21)+'" stroke="#ffd230" stroke-width="2.6" stroke-linecap="round"/>';
  s += '<circle cx="42" cy="62" r="5" fill="#0d2d4d" stroke="#8fc0e6"/>';
  s += '<text x="42" y="'+(62+45)+'" text-anchor="middle" font-size="7.5" fill="#9dc6e8" font-family="Segoe UI,Arial">уставка '+(set)+' А</text>';

  // индикатор срабатывания
  s += '<circle cx="146" cy="20" r="6" fill="'+(tripped ? '#ff3b30' : '#1f8f52')+'" stroke="#0d2d4d"/>';
  s += '<text x="'+(w-10)+'" y="106" text-anchor="end" font-size="8" font-weight="700" fill="#cfe4f5" font-family="Segoe UI,Arial">'+(o.tag||'KK')+'</text>';

  // кнопки TEST (красная) и RESET (синяя)
  s += '<text x="100" y="47" text-anchor="middle" font-size="9" font-weight="700" fill="#cfe4f5" font-family="Segoe UI,Arial">TEST</text>';
  s += '<text x="131" y="47" text-anchor="middle" font-size="9" font-weight="700" fill="#cfe4f5" font-family="Segoe UI,Arial">RESET</text>';
  s += '<ellipse cx="100" cy="72" rx="15" ry="13" fill="rgba(5,20,34,.5)"/>';
  s += '<g class="relay-btn relay-test">'
     + '<circle cx="100" cy="68" r="14" fill="#e0242b" stroke="#9c1418" stroke-width="1.2"/>'
     + '<circle cx="100" cy="64" r="9" fill="#ff8a8e" opacity=".62"/>'
     + '</g>';
  s += '<rect x="117" y="56" width="29" height="31" rx="6" fill="rgba(5,20,34,.5)"/>';
  s += '<g class="relay-btn relay-reset">'
     + '<rect x="118" y="52" width="27" height="32" rx="5" fill="#2a80cc" stroke="#12406e"/>'
     + '<rect x="120" y="54" width="23" height="9" rx="4" fill="#71b8ef" opacity=".52"/>'
     + '<path d="M131.5 58 v20 M121.5 68 h20" stroke="#dbeaff" stroke-width="3" stroke-linecap="round"/>'
     + '</g>';

  // зоны нажатия
  s += '<rect class="zone" data-zone="dial"  x="8"   y="30" width="68" height="66" fill="transparent" pointer-events="all"/>';
  s += '<rect class="zone" data-zone="test"  x="84"  y="50" width="32" height="38" fill="transparent" pointer-events="all"/>';
  s += '<rect class="zone" data-zone="reset" x="116" y="50" width="32" height="38" fill="transparent" pointer-events="all"/>';

  // колодка вспомогательных контактов: 98 NO, 97 — 96 NC, 95
  s += '<rect x="3" y="112" width="'+(w-6)+'" height="60" rx="4" fill="#1a558c" stroke="#12406e"/>';
  const lab = ['98','97','96','95'];
  for (let i=0;i<4;i++){
    const cx = (i+0.5)*cell;
    s += contactHole(cx, 140, 9.5);
    s += '<text x="'+cx+'" y="166" text-anchor="middle" font-size="9" fill="#dbeaff" font-family="Segoe UI,Arial">'+lab[i]+'</text>';
  }
  s += '<text x="'+cell+'" y="126" text-anchor="middle" font-size="8" fill="#9dc6e8" font-family="Segoe UI,Arial">NO</text>';
  s += '<text x="'+(3*cell)+'" y="126" text-anchor="middle" font-size="8" fill="#9dc6e8" font-family="Segoe UI,Arial">NC</text>';

  // три силовых вывода к двигателю: 2 T1, 4 T2, 6 T3
  s += '<rect x="3" y="176" width="'+(w-6)+'" height="'+(h-180)+'" rx="4" fill="#1b5e9e" stroke="#12406e"/>';
  const pLab = ['2 T1','4 T2','6 T3'];
  for (let i=0;i<3;i++){
    const cx = (i+0.5)*cell;
    s += contactHole(cx, 196, 10);
    s += '<text x="'+cx+'" y="216" text-anchor="middle" font-size="9" fill="#dbeaff" font-family="Segoe UI,Arial">'+pLab[i]+'</text>';
  }
  return s;
}

/* Одномодульные сигнальные лампы HL1-HL3 на DIN-рейку, питание 220 В. */
function lampInner(o){
  const w = TYPES.lamp.modules*MODULE, h = TYPES.lamp.h;
  const voltage = lampVoltage(o);
  const burned = !!o.burned;
  const nominal= ratedVoltageOf(o,220), brightness=!burned?voltageBrightness(voltage,o,220):0;
  const lit = !burned && brightness>0;
  const indicator = o.indicator || 'green';
  const palettes = {
    green:  { on:'#35e47d', off:'#286b47', strokeOn:'#baffd4', strokeOff:'#17442d', text:'#148d49' },
    yellow: { on:'#ffd928', off:'#7a6820', strokeOn:'#fff4a3', strokeOff:'#514613', text:'#9a7900' },
    red:    { on:'#f34a45', off:'#71302e', strokeOn:'#ffc0bc', strokeOff:'#4a1d1b', text:'#b32622' }
  };
  const pal = palettes[indicator] || palettes.green;
  const lampTag = o.tag || 'HL';
  let s = '';
  s += '<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="5" fill="#eceff1" stroke="#aeb4ba" stroke-width="1.5"/>';
  s += '<rect x="4" y="4" width="'+(w-8)+'" height="'+(h-8)+'" rx="4" fill="none" stroke="#ffffff" opacity=".8"/>';
  s += screw(w/2, 18, 10);
  s += screw(w/2, h-18, 10);
  s += '<rect x="7" y="61" width="'+(w-14)+'" height="17" rx="2" fill="#f2c218"/>';
  s += '<text x="'+(w/2)+'" y="73" text-anchor="middle" font-size="8" font-weight="700" fill="#4d5155" font-family="Segoe UI,Arial">'+lampTag+'</text>';
  s += '<text x="'+(w/2)+'" y="89" text-anchor="middle" font-size="8" fill="#454b50" font-family="Segoe UI,Arial">'+Math.round(nominal)+' В~</text>';
  s += '<rect x="7" y="98" width="'+(w-14)+'" height="66" rx="5" fill="#263b31" stroke="#68756f" stroke-width="2"/>';
  s += '<rect class="lamp-window lamp-'+indicator+(lit ? ' lit' : '')+'" x="11" y="102" width="'+(w-22)+'" height="58" rx="3" fill="'+(burned?'#24282b':(lit ? pal.on : pal.off))+'" fill-opacity="'+(lit?(0.28+0.72*brightness).toFixed(2):'1')+'" stroke="'+(burned?'#d94a45':(lit ? pal.strokeOn : pal.strokeOff))+'" stroke-width="'+(burned?'2.5':'1.5')+'"/>';
  s += '<path d="M14 106 H'+(w-14)+' V113 H14 Z" fill="#ffffff" opacity="'+(lit?(0.12+0.30*brightness).toFixed(2):'.12')+'"/>';
  if(burned) s += '<path d="M16 111 L'+(w-16)+' 151 M'+(w-16)+' 111 L16 151" stroke="#f15b55" stroke-width="4" stroke-linecap="round"/>';
  s += '<text x="'+(w/2)+'" y="184" text-anchor="middle" font-size="9" font-weight="700" fill="#495057" font-family="Segoe UI,Arial">'+lampTag+'</text>';
  s += '<text x="'+(w/2)+'" y="196" text-anchor="middle" font-size="7.5" font-weight="'+(burned?'800':'400')+'" fill="'+(burned?'#c62828':(lit ? pal.text : '#6c737a'))+'" font-family="Segoe UI,Arial">'+(burned ? 'ПЕРЕГОРЕЛА' : (lit ? (brightness<.65?'СВЕТИТСЯ ТУСКЛО':'СВЕТИТСЯ') : Math.round(voltage)+' В'))+'</text>';
  return s;
}

/* Обычная лампа накаливания в патроне. Объект располагается свободно,
   а наружные винтовые клеммы L и N доступны для монтажа учебной схемы. */
function bulbInner(o){
  const w=TYPES.bulb.modules*MODULE,h=TYPES.bulb.h;
  const voltage=bulbVoltage(o),burned=!!o.burned;
  const brightness=!burned?voltageBrightness(voltage,o,220):0,lit=!burned&&brightness>0;
  let s='';
  s+='<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="10" fill="#eef0f2" stroke="#9da3a9" stroke-width="1.5"/>';
  s+='<rect x="4" y="4" width="'+(w-8)+'" height="'+(h-8)+'" rx="8" fill="none" stroke="#ffffff" opacity=".85"/>';
  s+='<text x="'+(w-10)+'" y="18" text-anchor="end" font-size="8" font-weight="700" fill="#5b6470" font-family="Segoe UI,Arial">'+(o.tag||'EL')+'</text>';
  // Стеклянная колба и нить накала.
  s+='<ellipse class="bulb-glass'+(lit?' lit':'')+'" cx="'+(w/2)+'" cy="62" rx="38" ry="42" fill="'+(burned?'#62676b':(lit?'#ffd861':'#dbe7ec'))+'" fill-opacity="'+(lit?(0.30+0.62*brightness).toFixed(2):'.58')+'" stroke="'+(burned?'#3d4246':(lit?'#fff2a4':'#94a6af'))+'" stroke-width="2"/>';
  s+='<path d="M'+(w/2-27)+' 43 Q '+(w/2)+' 24 '+(w/2+27)+' 43" fill="none" stroke="#fff" stroke-width="4" opacity="'+(lit?(0.16+0.32*brightness).toFixed(2):'.72')+'"/>';
  s+='<path d="M'+(w/2-13)+' 76 L '+(w/2-7)+' 61 L '+(w/2)+' 77 L '+(w/2+7)+' 61 L '+(w/2+13)+' 76" fill="none" stroke="#6f7478" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
  if(burned)s+='<path d="M'+(w/2-7)+' 66 L '+(w/2+9)+' 73" stroke="#e0443e" stroke-width="3"/>';
  // Цоколь и патрон выполнены теми же серыми материалами, что корпуса аппаратов.
  s+='<path d="M'+(w/2-24)+' 94 H '+(w/2+24)+' L '+(w/2+20)+' 119 H '+(w/2-20)+' Z" fill="#aeb4ba" stroke="#747b82"/>';
  for(let y=99;y<=114;y+=5)s+='<line x1="'+(w/2-20)+'" y1="'+y+'" x2="'+(w/2+20)+'" y2="'+y+'" stroke="#747b82"/>';
  s+='<rect x="10" y="124" width="'+(w-20)+'" height="46" rx="6" fill="#e2e5e9" stroke="#b3b8be"/>';
  s+=screw(w*.28,147,10)+screw(w*.72,147,10);
  s+='<text x="'+(w/2)+'" y="166" text-anchor="middle" font-size="8.5" font-weight="700" fill="'+(burned?'#c62828':'#606870')+'" font-family="Segoe UI,Arial">'+(Number(o.ratedPower)||100)+' Вт</text>';
  return s;
}

/* Двойная розетка в общем корпусе. Нижние винтовые клеммы питают обе чашки,
   а отверстия розеток остаются доступными для щупов мультиметра. */
function outletInner(o){
  const w=TYPES.outlet.modules*MODULE,h=TYPES.outlet.h;
  const voltage=outletVoltage(o),energized=voltageIsOperating(voltage,o,220);
  const centers=[w*.28,w*.72];
  let s='';
  s+='<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="14" fill="#eceff1" stroke="#9da3a9" stroke-width="1.7"/>';
  s+='<rect x="5" y="5" width="'+(w-10)+'" height="'+(h-10)+'" rx="11" fill="none" stroke="#ffffff" opacity=".85"/>';
  // Общая вводная колодка находится сверху корпуса.
  s+='<rect x="31" y="7" width="'+(w-62)+'" height="36" rx="6" fill="#e2e5e9" stroke="#b3b8be"/>';
  const tx=[w*.32,w*.50,w*.68],labs=['L','N','PE'],cols=['#4b5563','#4b5563','#5f7a00'];
  tx.forEach(function(cx,i){s+=screw(cx,21,8)+'<text x="'+cx+'" y="39" text-anchor="middle" font-size="7" font-weight="800" fill="'+cols[i]+'" font-family="Segoe UI,Arial">'+labs[i]+'</text>';});
  s+='<text x="'+(w-10)+'" y="59" text-anchor="end" font-size="7.5" font-weight="700" fill="#5b6470" font-family="Segoe UI,Arial">'+(o.tag||'XS')+' · 2×16 А</text>';
  centers.forEach(function(cx,index){
    s+='<circle cx="'+cx+'" cy="108" r="43" fill="#dfe3e6" stroke="#a3a9af" stroke-width="2"/>';
    s+='<circle cx="'+cx+'" cy="108" r="36" fill="'+(energized?'#f5f6f4':'#eaeced')+'" stroke="#c2c7cc" stroke-width="1.5"/>';
    s+='<circle cx="'+(cx-14)+'" cy="108" r="7" fill="#34393e" stroke="#171a1d" stroke-width="1.5"/>';
    s+='<circle cx="'+(cx+14)+'" cy="108" r="7" fill="#34393e" stroke="#171a1d" stroke-width="1.5"/>';
    // Видимые защитные контакты, как у розетки Schuko: сверху и снизу чашки.
    s+='<rect x="'+(cx-7)+'" y="69" width="14" height="15" rx="2" fill="#c2a13a" stroke="#806819"/>';
    s+='<rect x="'+(cx-4)+'" y="75" width="8" height="12" rx="2" fill="#e1c363"/>';
    s+='<rect x="'+(cx-7)+'" y="132" width="14" height="15" rx="2" fill="#c2a13a" stroke="#806819"/>';
    s+='<rect x="'+(cx-4)+'" y="129" width="8" height="12" rx="2" fill="#e1c363"/>';
    s+='<text x="'+cx+'" y="161" text-anchor="middle" font-size="7.5" font-weight="700" fill="#6a7076" font-family="Segoe UI,Arial">РОЗЕТКА '+(index+1)+'</text>';
  });
  return s;
}

/* Настенный выключатель освещения. Общая клемма L подаёт фазу на один
   либо два независимых выхода; число клавиш выбирается в характеристиках. */
function wallSwitchInner(o){
  const w=TYPES.wallSwitch.modules*MODULE,h=TYPES.wallSwitch.h;
  const gangs=Number(o.gangs)===2?2:1;
  const on1=!!o.switchOn1,on2=gangs===2&&!!o.switchOn2;
  const terminals=gangs===2
    ? [{x:w*.22,label:'L'},{x:w*.50,label:'1'},{x:w*.78,label:'2'}]
    : [{x:w*.32,label:'L'},{x:w*.68,label:'1'}];
  let s='';
  s+='<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="14" fill="#eceff1" stroke="#9da3a9" stroke-width="1.7"/>';
  s+='<rect x="5" y="5" width="'+(w-10)+'" height="'+(h-10)+'" rx="11" fill="none" stroke="#ffffff" opacity=".85"/>';
  s+='<rect x="12" y="8" width="'+(w-24)+'" height="39" rx="6" fill="#e2e5e9" stroke="#b3b8be"/>';
  terminals.forEach(function(t){
    s+=screw(t.x,23,8);
    s+='<text x="'+t.x+'" y="43" text-anchor="middle" font-size="7" font-weight="800" fill="#4b5563" font-family="Segoe UI,Arial">'+t.label+'</text>';
  });
  s+='<text x="'+(w/2)+'" y="61" text-anchor="middle" font-size="9" font-weight="800" fill="#596168" font-family="Segoe UI,Arial">'+(o.tag||'SA')+'</text>';
  function rocker(x,width,index,on){
    const faceY=on?73:78,faceH=75;
    let q='<g data-switch-key="'+index+'" style="cursor:pointer;touch-action:none">';
    q+='<rect x="'+x+'" y="70" width="'+width+'" height="86" rx="8" fill="#cdd2d6" stroke="#979ea5" stroke-width="1.5"/>';
    q+='<rect x="'+(x+5)+'" y="'+faceY+'" width="'+(width-10)+'" height="'+faceH+'" rx="6" fill="'+(on?'#f7f8f6':'#e8eaeb')+'" stroke="#aab0b5" stroke-width="1.3"/>';
    q+='<path d="M '+(x+10)+' '+(faceY+11)+' H '+(x+width-10)+'" stroke="#ffffff" stroke-width="3" opacity=".8"/>';
    q+='<text x="'+(x+width/2)+'" y="'+(faceY+35)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#6a7178" font-family="Segoe UI,Arial">'+(on?'I':'0')+'</text>';
    q+='<rect x="'+x+'" y="70" width="'+width+'" height="86" rx="8" fill="transparent" pointer-events="all"/>';
    return q+'</g>';
  }
  if(gangs===1)s+=rocker(18,w-36,1,on1);
  else{
    const gap=6,keyW=(w-42-gap)/2;
    s+=rocker(18,keyW,1,on1)+rocker(18+keyW+gap,keyW,2,on2);
  }
  s+='<text x="'+(w/2)+'" y="169" text-anchor="middle" font-size="7.5" fill="#697078" font-family="Segoe UI,Arial">'+gangs+' кл. · '+Math.round(ratedVoltageOf(o,220))+' В~ · '+(Number(o.ratedCurrent)||10)+' А</text>';
  return s;
}

/* Проходной выключатель: общий контакт L постоянно соединён с одним из
   двух выходов. Нажатие клавиши перекидывает контакт L–1 / L–2. */
function twoWaySwitchInner(o){
  const w=TYPES.twoWaySwitch.modules*MODULE,h=TYPES.twoWaySwitch.h;
  const position=Number(o.switchPosition)===2?2:1;
  const tx=[w*.22,w*.50,w*.78],labels=['L','1','2'];
  let s='';
  s+='<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="14" fill="#eceff1" stroke="#9da3a9" stroke-width="1.7"/>';
  s+='<rect x="5" y="5" width="'+(w-10)+'" height="'+(h-10)+'" rx="11" fill="none" stroke="#ffffff" opacity=".85"/>';
  s+='<rect x="12" y="8" width="'+(w-24)+'" height="39" rx="6" fill="#e2e5e9" stroke="#b3b8be"/>';
  tx.forEach(function(x,i){
    s+=screw(x,23,8);
    s+='<text x="'+x+'" y="43" text-anchor="middle" font-size="7" font-weight="800" fill="#4b5563" font-family="Segoe UI,Arial">'+labels[i]+'</text>';
  });
  s+='<text x="'+(w/2)+'" y="61" text-anchor="middle" font-size="9" font-weight="800" fill="#596168" font-family="Segoe UI,Arial">'+(o.tag||'SA')+'</text>';
  const x=18,width=w-36,faceY=position===1?73:78;
  s+='<g data-two-way-switch="1" style="cursor:pointer;touch-action:none">';
  s+='<rect x="'+x+'" y="70" width="'+width+'" height="86" rx="8" fill="#cdd2d6" stroke="#979ea5" stroke-width="1.5"/>';
  s+='<rect x="'+(x+5)+'" y="'+faceY+'" width="'+(width-10)+'" height="75" rx="6" fill="#f2f4f3" stroke="#aab0b5" stroke-width="1.3"/>';
  s+='<path d="M '+(x+10)+' '+(faceY+11)+' H '+(x+width-10)+'" stroke="#ffffff" stroke-width="3" opacity=".8"/>';
  s+='<path d="M '+(w/2-18)+' '+(faceY+46)+' H '+(w/2-5)+' M '+(w/2-5)+' '+(faceY+46)+' L '+(w/2+16)+' '+(faceY+(position===1?34:58))+'" fill="none" stroke="#657079" stroke-width="3" stroke-linecap="round"/>';
  s+='<circle cx="'+(w/2-18)+'" cy="'+(faceY+46)+'" r="3.5" fill="#657079"/>';
  s+='<circle cx="'+(w/2+16)+'" cy="'+(faceY+34)+'" r="3.5" fill="#657079"/>';
  s+='<circle cx="'+(w/2+16)+'" cy="'+(faceY+58)+'" r="3.5" fill="#657079"/>';
  s+='<text x="'+(w/2-29)+'" y="'+(faceY+49)+'" text-anchor="middle" font-size="8" font-weight="800" fill="#4f5961" font-family="Segoe UI,Arial">L</text>';
  s+='<text x="'+(w/2+29)+'" y="'+(faceY+37)+'" text-anchor="middle" font-size="8" font-weight="800" fill="#4f5961" font-family="Segoe UI,Arial">1</text>';
  s+='<text x="'+(w/2+29)+'" y="'+(faceY+61)+'" text-anchor="middle" font-size="8" font-weight="800" fill="#4f5961" font-family="Segoe UI,Arial">2</text>';
  s+='<rect x="'+x+'" y="70" width="'+width+'" height="86" rx="8" fill="transparent" pointer-events="all"/>';
  s+='</g>';
  s+='<text x="'+(w/2)+'" y="169" text-anchor="middle" font-size="7.5" fill="#697078" font-family="Segoe UI,Arial">ПРОХОДНОЙ · '+Math.round(ratedVoltageOf(o,220))+' В~ · '+(Number(o.ratedCurrent)||10)+' А</text>';
  return s;
}

/* Карточки квартирных электроприёмников. Это полноценные однофазные нагрузки:
   L/N питают прибор, PE подключается к корпусу, мощность задаётся в свойствах. */
function applianceInner(type,o){
  const t=TYPES[type],w=t.modules*MODULE,h=t.h;
  const names={fridge:'ХОЛОДИЛЬНИК',washer:'СТИРАЛЬНАЯ МАШИНА',boiler:'БОЙЛЕР',stove:'ЭЛЕКТРОПЛИТА'};
  const power=Math.max(1,Number(o.ratedPower)||t.defaultPower||1000);
  const powerText=power>=1000?(power/1000).toFixed(power%1000?1:0)+' кВт':Math.round(power)+' Вт';
  const voltage=applianceVoltage(o),powered=voltageIsOperating(voltage,o,220);
  const burned=!!o.applianceBurned,active=!!(o.applianceOn&&powered&&!burned);
  const status=burned?'АВАРИЯ':(active?'РАБОТА':(o.applianceOn?'НЕТ ПИТ.':'ВЫКЛ'));
  const statusColor=burned?'#d93630':(active?'#219653':(o.applianceOn?'#d39a17':'#69727a'));
  const tx=[w*.25,w*.50,w*.75],labs=['L','N','PE'];
  let s='';
  s+='<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="12" fill="#eceff1" stroke="#9da3a9" stroke-width="1.7"/>';
  s+='<rect x="5" y="5" width="'+(w-10)+'" height="'+(h-10)+'" rx="9" fill="none" stroke="#ffffff" opacity=".85"/>';
  s+='<rect x="12" y="8" width="'+(w-24)+'" height="39" rx="6" fill="#e2e5e9" stroke="#b3b8be"/>';
  tx.forEach(function(x,i){s+=screw(x,23,8)+'<text x="'+x+'" y="43" text-anchor="middle" font-size="7" font-weight="800" fill="'+(i===2?'#607b00':'#4b5563')+'" font-family="Segoe UI,Arial">'+labs[i]+'</text>';});
  s+='<text x="14" y="61" font-size="9" font-weight="800" fill="#596168" font-family="Segoe UI,Arial">'+escapeHtml(o.tag||'E')+'</text>';
  s+='<text x="'+(w-12)+'" y="61" text-anchor="end" font-size="8" font-weight="700" fill="#596168" font-family="Segoe UI,Arial">'+names[type]+'</text>';
  s+='<rect x="12" y="68" width="'+(w-24)+'" height="68" rx="7" fill="#f8f9f7" stroke="#c4c9cd"/>';
  if(type==='fridge'){
    s+='<rect x="24" y="77" width="38" height="51" rx="4" fill="#dce5e8" stroke="#7f8b92" stroke-width="1.5"/><line x1="24" y1="98" x2="62" y2="98" stroke="#7f8b92"/><rect x="55" y="84" width="3" height="10" rx="1" fill="#707980"/><rect x="55" y="105" width="3" height="13" rx="1" fill="#707980"/>';
  }else if(type==='washer'){
    s+='<rect x="21" y="77" width="44" height="51" rx="5" fill="#dce5e8" stroke="#7f8b92" stroke-width="1.5"/><circle cx="43" cy="106" r="15" fill="#6f8792" stroke="#4f6068" stroke-width="2"/><circle cx="43" cy="106" r="10" fill="#aac1ca"/><circle cx="29" cy="85" r="2.5" fill="#45a36b"/><rect x="36" y="82" width="21" height="5" rx="2" fill="#aab4b9"/>';
  }else if(type==='boiler'){
    s+='<rect x="27" y="75" width="32" height="55" rx="15" fill="#dce5e8" stroke="#7f8b92" stroke-width="1.5"/><path d="M35 130 v5 M51 130 v5" stroke="#d64545" stroke-width="3"/><circle cx="43" cy="118" r="3" fill="#d93630"/>';
  }else{
    s+='<rect x="20" y="77" width="46" height="51" rx="4" fill="#cad1d5" stroke="#737d84" stroke-width="1.5"/><circle cx="32" cy="91" r="7" fill="#596168"/><circle cx="53" cy="91" r="7" fill="#596168"/><circle cx="32" cy="112" r="7" fill="#596168"/><circle cx="53" cy="112" r="7" fill="#596168"/>';
  }
  s+='<text x="78" y="91" font-size="13" font-weight="800" fill="#29343c" font-family="Segoe UI,Arial">'+powerText+'</text>';
  s+='<text x="78" y="107" font-size="8" fill="#697078" font-family="Segoe UI,Arial">'+Math.round(ratedVoltageOf(o,220))+' В~ · 50 Гц</text>';
  s+='<circle cx="82" cy="122" r="4.5" fill="'+statusColor+'" stroke="#7a8389"/>';
  s+='<text x="91" y="125" font-size="8" font-weight="700" fill="'+statusColor+'" font-family="Segoe UI,Arial">'+status+'</text>';
  s+='<g data-appliance-toggle="1" style="cursor:pointer;touch-action:none">';
  s+='<rect x="29" y="143" width="'+(w-58)+'" height="24" rx="7" fill="'+(o.applianceOn?'#2d9c5c':'#d5dadd')+'" stroke="#8e969c" stroke-width="1.4"/>';
  s+='<text x="'+(w/2)+'" y="159" text-anchor="middle" font-size="9" font-weight="800" fill="'+(o.applianceOn?'#ffffff':'#505961')+'" font-family="Segoe UI,Arial">'+(o.applianceOn?'ВКЛЮЧЕНО':'ВКЛЮЧИТЬ')+'</text>';
  s+='<rect x="29" y="143" width="'+(w-58)+'" height="24" rx="7" fill="transparent" pointer-events="all"/></g>';
  return s;
}

/* Реле времени KT1: A1–A2 — питание 220 В, S — пуск от той же фазы,
   15–16 — НЗ, 15–18 — НО. Три красных регулятора действуют независимо. */
const TIMER_RANGES = [1, 10, 60];
const TIMER_LEVELS = [0.25, 0.5, 0.75, 1];
const TIMER_MODES = ['on', 'off', 'pulse'];
function timerDelayMs(d){
  return (TIMER_RANGES.includes(d.timerRange) ? d.timerRange : 10)
       * (TIMER_LEVELS.includes(d.timerLevel) ? d.timerLevel : 0.5) * 1000;
}
function timerStatus(d, now){
  if (d.timerBurned) return 'СГОРЕЛО';
  if (!d.timerSupply) return 'НЕТ ПИТ.';
  if (d.timerActive && d.timerMode !== 'pulse' && !(d.timerMode === 'off' && d.timerSince != null)) return '15–18 ЗАМК.';
  if (d.timerSince != null){
    const left = Math.max(0, (timerDelayMs(d) - (now - d.timerSince))/1000);
    return left.toFixed(1)+' с';
  }
  return 'ОЖИД. S';
}
function timerInner(o){
  const w=TYPES.timer.modules*MODULE,h=TYPES.timer.h, cx=w/2;
  const range=TIMER_RANGES.includes(o.timerRange)?o.timerRange:10;
  const level=TIMER_LEVELS.includes(o.timerLevel)?o.timerLevel:0.5;
  const mode=TIMER_MODES.includes(o.timerMode)?o.timerMode:'on';
  let s='';
  // Корпус, клеммные колодки и этикетка повторяют оформление автоматов.
  s+='<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="7" fill="#f3f4f1" stroke="#9aa0a8" stroke-width="1.5"/>';
  s+='<rect x="4" y="4" width="'+(w-8)+'" height="'+(h-8)+'" rx="5" fill="none" stroke="rgba(255,255,255,.85)"/>';
  s+='<rect x="3" y="3" width="'+(w-6)+'" height="35" rx="5" fill="#e2e5e9" stroke="#b3b8be"/>';
  s+='<rect x="3" y="'+(h-38)+'" width="'+(w-6)+'" height="35" rx="5" fill="#e2e5e9" stroke="#b3b8be"/>';
  ['A1','S','A2'].forEach(function(label,i){
    const x=10+i*(w-20)/2;
    s+='<text x="'+x+'" y="11" text-anchor="middle" font-size="7" font-weight="700" fill="#2b3138" font-family="Segoe UI,Arial">'+label+'</text>';
    s+=screw(x,22,6.5);
  });
  ['15','16','18'].forEach(function(label,i){
    const x=10+i*(w-20)/2;
    s+=screw(x,h-22,6.5);
    s+='<text x="'+x+'" y="'+(h-7)+'" text-anchor="middle" font-size="7" font-weight="700" fill="#2b3138" font-family="Segoe UI,Arial">'+label+'</text>';
  });
  s+='<rect x="6" y="41" width="'+(w-12)+'" height="167" rx="3" fill="#fcfcfa" stroke="#d8dbdf"/>';
  s+='<text x="'+cx+'" y="68" text-anchor="middle" font-size="7" fill="#5b6470" font-family="Segoe UI,Arial">'+(o.tag||'KT')+' · '+Math.round(ratedVoltageOf(o,220))+' В~</text>';
  s+='<circle cx="16" cy="74" r="3" fill="'+(o.timerSupply&&!o.timerBurned?'#32c86e':'#386047')+'" stroke="#56646a"/>';
  s+='<circle cx="'+(w-16)+'" cy="74" r="3" fill="'+(o.timerActive?'#e6463d':'#6c3431')+'" stroke="#56646a"/>';
  s+='<text x="'+cx+'" y="85" text-anchor="middle" font-size="5.4" font-weight="700" fill="'+(o.timerBurned?'#c62828':'#4b5563')+'" font-family="Segoe UI,Arial" class="timer-state">'+timerStatus(o,performance.now())+'</text>';
  function dial(name,y,label,value,angle){
    let q='<g data-timer-control="'+name+'" style="cursor:pointer;touch-action:none">';
    q+='<text x="'+cx+'" y="'+(y-15)+'" text-anchor="middle" font-size="5.2" font-weight="700" fill="#4b5563" font-family="Segoe UI,Arial">'+label+'</text>';
    q+='<circle cx="'+cx+'" cy="'+y+'" r="11" fill="#d9dde0" stroke="#a2a9ae"/>';
    q+='<circle cx="'+cx+'" cy="'+y+'" r="9" fill="#d93931" stroke="#8f2724" stroke-width="1.5"/>';
    q+='<g transform="rotate('+angle+' '+cx+' '+y+')"><path d="M'+(cx-6)+' '+y+' H'+(cx+6)+' M'+cx+' '+(y-6)+' V'+(y+6)+'" stroke="#54201f" stroke-width="2.2" stroke-linecap="round"/></g>';
    q+='<circle cx="'+cx+'" cy="'+y+'" r="13" fill="transparent" pointer-events="all"/>';
    q+='<text x="'+cx+'" y="'+(y+17)+'" text-anchor="middle" font-size="5.2" font-weight="700" fill="#4b5563" font-family="Segoe UI,Arial">'+value+'</text>';
    return q+'</g>';
  }
  s+=dial('range',107,'ДИАПАЗОН',range===60?'60 с':range+' с',TIMER_RANGES.indexOf(range)*30);
  s+=dial('level',146,'УСТАВКА',Math.round(level*100)+' %',TIMER_LEVELS.indexOf(level)*25);
  s+=dial('mode',185,'РЕЖИМ',mode==='on'?'ВКЛ':mode==='off'?'ВЫКЛ':'ИМП.',TIMER_MODES.indexOf(mode)*35);
  return s;
}

/* Кнопочный пост: две зелёные кнопки НО и красная кнопка НЗ.
   Клеммы учебной модели вынесены наружу по бокам корпуса. */
const PB = { x:930, y:720, w:170, h:300 };
const PB_TERMS = [
  { key:'upL',   label:'SB1:1', dx:-18,      dy:75,  color:WC.C },
  { key:'upR',   label:'SB1:2', dx:PB.w+18,  dy:75,  color:WC.C },
  { key:'stopL', label:'SB2:1', dx:-18,      dy:150, color:WC.C },
  { key:'stopR', label:'SB2:2', dx:PB.w+18,  dy:150, color:WC.C },
  { key:'downL', label:'SB3:1', dx:-18,      dy:225, color:WC.C },
  { key:'downR', label:'SB3:2', dx:PB.w+18,  dy:225, color:WC.C }
];
function pushbuttonInner(pb){
  const buttons=(pb&&pb.buttons)||state.pb;
  let s = '';
  // Плоский фронтальный корпус в той же стилистике, что автоматы, лампы и реле.
  s += '<rect x="1" y="1" width="168" height="298" rx="8" fill="#eceff1" stroke="#9aa0a8" stroke-width="1.8"/>';
  s += '<rect x="5" y="5" width="160" height="290" rx="6" fill="none" stroke="#ffffff" opacity=".85"/>';
  s += '<rect x="25" y="8" width="120" height="31" rx="4" fill="#f7f8f6" stroke="#c2c7cc"/>';
  s += '<rect x="25" y="34" width="120" height="5" fill="#f2c218"/>';
  s += '<text x="136" y="27" text-anchor="end" font-size="8" font-weight="800" fill="#596168" font-family="Segoe UI,Arial">'+((pb&&pb.tag)||'SB1–SB3')+'</text>';
  [[14,14],[156,14],[14,286],[156,286]].forEach(function(p){ s += caseScrew(p[0],p[1],6); });

  function button(y, color, light, name, mark, down){
    let q = '';
    q += '<circle cx="85" cy="'+y+'" r="29" fill="#d5d9dd" stroke="#8e959c" stroke-width="1.8"/>';
    q += '<circle cx="85" cy="'+y+'" r="24" fill="#747c84" stroke="#5c636a" stroke-width="1.2"/>';
    q += '<g class="pb-button'+(down ? ' is-down' : '')+'">';
    q += '<circle cx="85" cy="'+y+'" r="20" fill="'+color+'" stroke="#4e555b" stroke-width="1.5"/>';
    q += '</g>';
    q += '<circle cx="132" cy="'+y+'" r="14" fill="#f7f8f6" stroke="#b3b8bd"/>';
    q += '<text x="132" y="'+(y+5)+'" text-anchor="middle" font-size="18" font-weight="700" fill="#545b62" font-family="Segoe UI Symbol,Segoe UI,Arial">'+mark+'</text>';
    q += '<rect x="51" y="'+(y+29)+'" width="68" height="15" rx="3" fill="#f7f8f6" stroke="#c5c9cd"/>';
    q += '<text x="85" y="'+(y+40)+'" text-anchor="middle" font-size="8" font-weight="700" fill="#596168" font-family="Segoe UI,Arial">'+name+'</text>';
    return q;
  }
  s += button(75,  '#72b861', '#c8efbe', 'ВПЕРЁД · НО', '↗', buttons.up);
  s += button(150, '#c94f50', '#ffb0aa', 'СТОП · НЗ',   '○', buttons.stop);
  s += button(225, '#72b861', '#c8efbe', 'НАЗАД · НО',  '↙', buttons.down);

  PB_TERMS.forEach(function(t, i){
    const left = i%2 === 0;
    s += '<line x1="'+(left ? 1 : PB.w-1)+'" y1="'+t.dy+'" x2="'+t.dx+'" y2="'+t.dy+'" stroke="#8f969d" stroke-width="5"/>';
    s += '<rect x="'+(t.dx-12)+'" y="'+(t.dy-12)+'" width="24" height="24" rx="4" fill="#e3e6ea" stroke="#aeb4ba"/>';
    s += screw(t.dx, t.dy, 8);
    s += '<text x="'+t.dx+'" y="'+(t.dy-16)+'" text-anchor="middle" font-size="8" font-weight="700" fill="#596168" font-family="Segoe UI,Arial">'+(left ? '1' : '2')+'</text>';
  });
  s += '<rect class="zone" data-pb="up" x="55" y="45" width="60" height="60" rx="30" fill="transparent" pointer-events="all"/>';
  s += '<rect class="zone" data-pb="stop" x="55" y="120" width="60" height="60" rx="30" fill="transparent" pointer-events="all"/>';
  s += '<rect class="zone" data-pb="down" x="55" y="195" width="60" height="60" rx="30" fill="transparent" pointer-events="all"/>';
  return s;
}

/* Частотный преобразователь: силовой вход R/S/T и регулируемый выход U/V/W.
   Органы управления выполнены теми же простыми SVG-формами, что и остальные аппараты. */
function vfdInner(o){
  o=o||{};
  const w=TYPES.vfd.modules*MODULE,h=TYPES.vfd.h;
  const set=Math.max(0,Math.min(Number(o.maxFrequency)||100,Number(o.setFrequency===undefined?50:o.setFrequency)||0));
  const supplied=!!o.vfdInputReady,running=supplied&&!!o.running&&set>.05&&!o.fault;
  const status=o.fault?'АВАРИЯ':(running?'РАБОТА':(supplied?'ГОТОВ':'НЕТ СЕТИ'));
  const statusColor=o.fault?'#d9342b':(running?'#22a95f':(supplied?'#d69b14':'#65717d'));
  const tag=o.tag||'UZ';
  const topTermX=[w/6,w/2,w*5/6],bottomTermX=[.125,.375,.625,.875].map(function(k){return w*k;});
  let s='';
  s+='<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="12" fill="#343a40" stroke="#151a1f" stroke-width="2"/>';
  s+='<rect x="6" y="6" width="'+(w-12)+'" height="'+(h-12)+'" rx="9" fill="none" stroke="#69727b" stroke-width="1.5" opacity=".95"/>';
  s+='<rect x="3" y="3" width="'+(w-6)+'" height="47" rx="6" fill="#4a525a" stroke="#747e87"/>';
  ['R · L1','S · L2','T · L3'].forEach(function(label,index){
    const cx=topTermX[index];
    s+=screw(cx,18,10)+'<text x="'+cx+'" y="43" text-anchor="middle" font-size="7" font-weight="700" fill="#eef2f5" font-family="Segoe UI,Arial">'+label+'</text>';
  });
  s+='<text x="'+(w-14)+'" y="64" text-anchor="end" font-size="9" font-weight="800" fill="#e8edf2" font-family="Segoe UI,Arial">ПЧ · '+tag+'</text>';
  s+='<rect x="23" y="76" width="'+(w-46)+'" height="82" rx="7" fill="#19242b" stroke="#59656d" stroke-width="3"/>';
  s+='<rect x="31" y="84" width="'+(w-62)+'" height="66" rx="3" fill="#102d27" stroke="#25483f"/>';
  s+='<text class="vfd-frequency" x="'+(w/2-12)+'" y="119" text-anchor="middle" font-size="32" font-weight="800" fill="'+(running?'#55ee98':'#8da79a')+'" font-family="Consolas,monospace">'+set.toFixed(1)+'</text>';
  s+='<text x="'+(w-50)+'" y="118" text-anchor="middle" font-size="10" font-weight="800" fill="#b8c8c0" font-family="Segoe UI,Arial">Hz</text>';
  s+='<text class="vfd-sequence" x="'+(w/2)+'" y="143" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="1" fill="#86d9b1" font-family="Segoe UI,Arial">'+(o.reverse?'U–W–V':'U–V–W')+'</text>';
  s+='<circle cx="31" cy="169" r="5" fill="'+statusColor+'" stroke="#59636c"/>';
  s+='<text class="vfd-status" x="41" y="172" font-size="8.5" font-weight="500" fill="'+statusColor+'" font-family="Segoe UI,Arial">'+status+'</text>';
  function button(cx,cy,r,fill,label,control,textColor){
    const pressed=o.vfdPressed===control,faceR=pressed?r-1.4:r;
    return '<g class="vfd-button'+(pressed?' pressed':'')+'" data-vfd-control="'+control+'" style="cursor:pointer">'
      +'<circle cx="'+cx+'" cy="'+cy+'" r="'+(r+2)+'" fill="#596168" stroke="#737c84"/>'
      +'<circle cx="'+cx+'" cy="'+cy+'" r="'+faceR+'" fill="'+fill+'" fill-opacity="'+(pressed?'.78':'1')+'" stroke="'+(pressed?'#30383e':'#4f5961')+'" stroke-width="'+(pressed?'2.2':'1.5')+'"/>'
      +'<text x="'+cx+'" y="'+(cy+3)+'" text-anchor="middle" font-size="8" font-weight="900" fill="'+(textColor||'#fff')+'" opacity="'+(pressed?'.88':'1')+'" font-family="Segoe UI,Arial">'+label+'</text></g>';
  }
  s+=button(46,202,17,'#2ba967','RUN','run');
  s+=button(w/2,202,17,'#d94841','STOP','stop');
  s+=button(w-46,202,17,'#3979ba','REV','reverse');
  s+=button(76,242,15,'#d8dde1','▲','up','#35404a');
  s+=button(w-76,242,15,'#d8dde1','▼','down','#35404a');
  s+='<text x="'+(w/2)+'" y="271" text-anchor="middle" font-size="8" font-weight="700" fill="#c4cbd1" font-family="Segoe UI,Arial">3×380 В · 0…'+Math.round(Number(o.maxFrequency)||100)+' Гц</text>';
  s+='<rect x="3" y="'+(h-50)+'" width="'+(w-6)+'" height="47" rx="6" fill="#4a525a" stroke="#747e87"/>';
  ['U','V','W','PE'].forEach(function(label,index){
    const cx=bottomTermX[index];
    s+='<text x="'+cx+'" y="'+(h-35)+'" text-anchor="middle" font-size="7" font-weight="700" fill="'+(label==='PE'?'#e8d800':'#eef2f5')+'" font-family="Segoe UI,Arial">'+label+'</text>'+screw(cx,h-18,10);
  });
  return s;
}

/* Тиристорный преобразователь: силовой вход R/S/T, регулируемый выход якоря
   Я+/Я− и нерегулируемый выход возбуждения Ш+/Ш−. Питание обмотки возбуждения
   появляется вместе с сетью, а якорь — только после кнопки «СЕТЬ». */
function tpInner(o){
  o=o||{};
  const w=TYPES.tp.modules*MODULE,h=TYPES.tp.h;
  const set=tpSetArmatureVoltage(o);
  const fieldVoltage=tpFieldVoltage(o);
  const supplied=!!o.tpInputReady, live=supplied&&!!o.tpOn&&set>.5;
  const status=!supplied?'НЕТ СЕТИ':(live?'ВЫХОД ВКЛ':'ВЫХОД ОТКЛ');
  const statusColor=live?'#22a95f':(supplied?'#d69b14':'#65717d');
  const tag=o.tag||'UZT';
  const topTermX=[w/6,w/2,w*5/6],botX=[.1,.3,.5,.7,.9].map(function(k){return w*k;});
  let s='';
  s+='<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="12" fill="#343a40" stroke="#151a1f" stroke-width="2"/>';
  s+='<rect x="6" y="6" width="'+(w-12)+'" height="'+(h-12)+'" rx="9" fill="none" stroke="#69727b" stroke-width="1.5" opacity=".95"/>';
  s+='<rect x="3" y="3" width="'+(w-6)+'" height="47" rx="6" fill="#4a525a" stroke="#747e87"/>';
  ['R · L1','S · L2','T · L3'].forEach(function(label,index){
    const cx=topTermX[index];
    s+=screw(cx,18,10)+'<text x="'+cx+'" y="43" text-anchor="middle" font-size="7" font-weight="700" fill="#eef2f5" font-family="Segoe UI,Arial">'+label+'</text>';
  });
  s+='<text x="'+(w-14)+'" y="63" text-anchor="end" font-size="9" font-weight="800" fill="#e8edf2" font-family="Segoe UI,Arial">ТП · '+escapeHtml(tag)+'</text>';
  // Лицевая панель рассчитана на корпус высотой 82 мм — как у автоматов.
  s+='<rect x="23" y="68" width="'+(w-46)+'" height="54" rx="7" fill="#19242b" stroke="#59656d" stroke-width="3"/>';
  s+='<rect x="31" y="74" width="'+(w-62)+'" height="42" rx="3" fill="#102d27" stroke="#25483f"/>';
  s+='<text class="tp-voltage" x="'+(w/2-12)+'" y="100" text-anchor="middle" font-size="26" font-weight="800" fill="'+(live?'#55ee98':'#8da79a')+'" font-family="Consolas,monospace">'+Math.round(set)+'</text>';
  s+='<text x="'+(w-48)+'" y="97" text-anchor="middle" font-size="9" font-weight="800" fill="#b8c8c0" font-family="Segoe UI,Arial">V</text>';
  s+='<text class="tp-mode" x="'+(w/2)+'" y="113" text-anchor="middle" font-size="8" font-weight="800" letter-spacing=".5" fill="#86d9b1" font-family="Segoe UI,Arial">ЯКОРЬ · Ш '+Math.round(fieldVoltage)+' В</text>';
  s+='<circle cx="31" cy="136" r="4.5" fill="'+statusColor+'" stroke="#59636c"/>';
  s+='<text class="tp-status" x="40" y="139" font-size="8" font-weight="500" fill="'+statusColor+'" font-family="Segoe UI,Arial">'+status+'</text>';
  function button(cx,cy,r,fill,label,control,textColor,pressed){
    const faceR=pressed?r-1.4:r;
    return '<g class="tp-button'+(pressed?' pressed':'')+'" data-tp-control="'+control+'" style="cursor:pointer">'
      +'<circle cx="'+cx+'" cy="'+cy+'" r="'+(r+2)+'" fill="#596168" stroke="#737c84"/>'
      +'<circle cx="'+cx+'" cy="'+cy+'" r="'+faceR+'" fill="'+fill+'" fill-opacity="'+(pressed?'.78':'1')+'" stroke="'+(pressed?'#30383e':'#4f5961')+'" stroke-width="'+(pressed?'2.2':'1.5')+'"/>'
      +'<text x="'+cx+'" y="'+(cy+3)+'" text-anchor="middle" font-size="8" font-weight="900" fill="'+(textColor||'#fff')+'" opacity="'+(pressed?'.88':'1')+'" font-family="Segoe UI,Arial">'+label+'</text></g>';
  }
  // Все органы управления в один ряд: при высоте 82 мм второй ряд не помещается.
  s+=button(38,162,15.5,o.tpOn?'#2ba967':'#7d868e','СЕТЬ','mains','#fff',!!o.tpOn);
  s+=button(w-62,162,13.5,'#d8dde1','▲','up','#35404a',o.tpPressed==='up');
  s+=button(w-24,162,13.5,'#d8dde1','▼','down','#35404a',o.tpPressed==='down');
  s+='<text x="'+(w/2)+'" y="190" text-anchor="middle" font-size="7" font-weight="700" fill="#c4cbd1" font-family="Segoe UI,Arial">3×380 В · якорь 0…'+Math.round(tpMaxArmatureVoltage(o))+' В</text>';
  s+='<rect x="3" y="'+(h-50)+'" width="'+(w-6)+'" height="47" rx="6" fill="#4a525a" stroke="#747e87"/>';
  ['Я+','Я−','Ш+','Ш−','PE'].forEach(function(label,index){
    const cx=botX[index];
    s+='<text x="'+cx+'" y="'+(h-35)+'" text-anchor="middle" font-size="7" font-weight="700" fill="'+(label==='PE'?'#e8d800':'#eef2f5')+'" font-family="Segoe UI,Arial">'+label+'</text>'+screw(cx,h-18,10);
  });
  return s;
}

/* Открытая коробка: четыре кабельных ввода и четыре отдельные шины. */
function junctionTerms(){
  const w=TYPES.junction.modules*MODULE,h=TYPES.junction.h,out=[];
  const rows=[['top',[.35,.5,.65].map(function(p){return {x:w*p,y:38};})],
    ['right',[.35,.5,.65].map(function(p){return {x:w-38,y:h*p};})],
    ['bottom',[.35,.5,.65].map(function(p){return {x:w*p,y:h-38};})],
    ['left',[.35,.5,.65].map(function(p){return {x:38,y:h*p};})]];
  rows.forEach(function(row,side){row[1].forEach(function(p,i){
    const number=side*3+i+1;
    out.push({key:row[0]+i,label:String(number)+' · колодка '+(side+1),dx:p.x,dy:p.y,color:WC.C,hitR:10,side:row[0],number:number});
  });});
  return out;
}
function junctionInner(o){
  const w=TYPES.junction.modules*MODULE,h=TYPES.junction.h;
  let s='';
  // Ступенчатые серые вводы остаются в пределах габаритов объекта.
  function entry(x,y,angle){
    return '<g transform="translate('+x+','+y+') rotate('+angle+')">'
      +'<rect x="-17" y="-14" width="34" height="14" rx="4" fill="#c5cbd0" stroke="#929aa2"/>'
      +'<rect x="-14" y="-16" width="28" height="4" rx="2" fill="#dde1e4" stroke="#a5adb4"/>'
      +'<path d="M -15 -9 H 15 M -15 -5 H 15" stroke="#a5adb4" stroke-width="1"/></g>';
  }
  s+=entry(w/2,17,0)+entry(w-17,h/2,90)+entry(w/2,h-17,180)+entry(17,h/2,-90);
  s+='<rect x="14" y="14" width="'+(w-28)+'" height="'+(h-28)+'" rx="16" fill="#eceff1" stroke="#979fa7" stroke-width="2"/>';
  s+='<rect x="19" y="19" width="'+(w-38)+'" height="'+(h-38)+'" rx="12" fill="#cbd1d5" stroke="#ffffff" stroke-width="2"/>';
  s+='<rect x="24" y="24" width="'+(w-48)+'" height="'+(h-48)+'" rx="9" fill="#e1e5e7" stroke="#aab2b9"/>';
  [[30,30],[w-30,30],[30,h-30],[w-30,h-30]].forEach(function(p){
    s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="#f1f3f4" stroke="#a5adb4" stroke-width="1.5"/>';
  });
  function strip(x,y,width,height,vertical){
    let q='<rect x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" rx="4" fill="#c5cbd0" stroke="#989fa7" stroke-width="1.3"/>';
    q+='<rect x="'+(x+3)+'" y="'+(y+3)+'" width="'+(width-6)+'" height="'+(height-6)+'" rx="3" fill="#d9b64b" stroke="#abb2b9"/>';
    if(vertical)q+='<rect x="'+(x+width/2-4)+'" y="'+(y+6)+'" width="8" height="'+(height-12)+'" rx="2" fill="#b48a26"/>';
    else q+='<rect x="'+(x+6)+'" y="'+(y+height/2-4)+'" width="'+(width-12)+'" height="8" rx="2" fill="#b48a26"/>';
    return q;
  }
  s+=strip(w*.275,25,w*.45,26,false)+strip(w*.275,h-51,w*.45,26,false);
  s+=strip(25,h*.275,26,h*.45,true)+strip(w-51,h*.275,26,h*.45,true);
  junctionTerms().forEach(function(t){
    s+=screw(t.dx,t.dy,8.5);
    let x=t.dx,y=t.dy,anchor='middle';
    if(t.side==='top')y+=22;
    if(t.side==='bottom')y-=16;
    if(t.side==='left'){x+=19;y+=2.5;anchor='start';}
    if(t.side==='right'){x-=19;y+=2.5;anchor='end';}
    s+='<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="7" fill="#596168" font-family="Segoe UI,Arial">'+t.number+'</text>';
  });
  s+='<text x="'+(w/2)+'" y="'+(h/2+4)+'" text-anchor="middle" font-size="11" font-weight="700" fill="#596168" font-family="Segoe UI,Arial">'+escapeHtml(o.tag||'XR')+'</text>';
  s+='<circle cx="'+(w/2)+'" cy="'+(h/2+26)+'" r="9" fill="none" stroke="#c3cbd1" stroke-width="2"/>';
  return s;
}
function deviceInner(type, o){
  o = o || {};
  const kind = TYPES[type].kind;
  if (kind === 'mcb') return mcbInner(type, o);
  if (kind === 'rcd') return rcdInner(o);
  if (kind === 'meter') return meterInner(o);
  if (kind === 'sensor') return sensorInner(o);
  if (kind === 'lamp') return lampInner(o);
  if (kind === 'bulb') return bulbInner(o);
  if (kind === 'outlet') return outletInner(o);
  if (kind === 'junction') return junctionInner(o);
  if (kind === 'wallSwitch') return wallSwitchInner(o);
  if (kind === 'twoWaySwitch') return twoWaySwitchInner(o);
  if (kind === 'appliance') return applianceInner(type,o);
  if (kind === 'vfd') return vfdInner(o);
  if (kind === 'converter') return tpInner(o);
  if (kind === 'timer') return timerInner(o);
  if (kind === 'contactor') return kmInner(o);
  if (kind === 'relay') return relayInner(o);
  return terminalInner(type, o);
}

/* ============================================================
   Трёхфазный асинхронный двигатель М1 — вид сбоку
   ============================================================ */
const MOTOR = {x:463,y:875,w:313,h:351,scale:1.5,load:0,rpmActual:0,angle:0,polePairs:2,ratedSlipPercent:10,ratedFrequency:50};
const MOTOR_TERMS = [
  { key:'U1', label:'U1', dx:84,  dy:4,  color:WC.L1 },
  { key:'V1', label:'V1', dx:116, dy:4,  color:WC.L2 },
  { key:'W1', label:'W1', dx:148, dy:4,  color:WC.L3 },
  { key:'W2', label:'W2', dx:84,  dy:28, color:WC.L3 },
  { key:'U2', label:'U2', dx:116, dy:28, color:WC.L1 },
  { key:'V2', label:'V2', dx:148, dy:28, color:WC.L2 },
  { key:'PE', label:'PE', dx:208, dy:206, color:WC.PE, caseGround:true }
];
/* nс = 60·f/p — скорость вращения магнитного поля;
   n = nс·(1-s) — скорость ротора асинхронного двигателя. */
function motorSpeedByFormula(motor,frequency,load){
  motor=motor||MOTOR;
  const f=Math.max(0,Number(frequency)||0);
  const p=Math.max(1,Math.round(Number(motor.polePairs)||2));
  const loadPercent=Math.max(0,Math.min(100,Number(load)||0));
  const configuredSlip=Number(motor.ratedSlipPercent);
  const baseSlip=Math.max(0,Math.min(.95,(isFinite(configuredSlip)?configuredSlip:10)/100));
  const loadFactor=Math.pow(loadPercent/100,1.7);
  // Под нагрузкой скольжение возрастает; прежняя характеристика нагрузки
  // сохранена, но теперь обороты всегда получаются через формулу скольжения.
  const slip=Math.min(.98,1-(1-baseSlip)*(1-.92*loadFactor));
  const synchronousRpm=60*f/p;
  const rpm=Math.max(0,Math.round(synchronousRpm*(1-slip)));
  return {polePairs:p,frequencyHz:f,synchronousRpm:synchronousRpm,slip:slip,slipPercent:slip*100,rpm:rpm};
}
function motorOperatingPoint(motor,direction){
  motor=motor||MOTOR;
  const load = Math.max(0, Math.min(100, Number(motor.load) || 0));
  const supplyFrequency=direction?motorSupplyFrequency(motor):0;
  if (!direction||supplyFrequency<=0) return {load:load,rpm:0,current:0,frequencyHz:0,synchronousRpm:0,slipPercent:0,visualDur:1};
  const k = Math.pow(load/100, 1.7);
  const nominalCurrent=Math.max(.1,Number(motor.ratedCurrent)||9);
  const speed=motorSpeedByFormula(motor,supplyFrequency,load);
  const current = nominalCurrent*(1+5.67*k);
  return {load:load,rpm:speed.rpm,current:current,frequencyHz:supplyFrequency,
    synchronousRpm:speed.synchronousRpm,slipPercent:speed.slipPercent,polePairs:speed.polePairs,
    visualDur:Math.max(0.12,240/Math.max(1,speed.rpm))};
}
function motorVisualOperating(motor,electricalDirection){
  motor=motor||MOTOR;
  const target=motorOperatingPoint(motor,electricalDirection);
  const rpm=Math.max(0,Math.round(Math.abs(motor.rpmActual||0)));
  return {load:target.load,rpm:rpm,current:target.current,frequencyHz:target.frequencyHz,
          synchronousRpm:target.synchronousRpm,slipPercent:target.slipPercent,polePairs:target.polePairs,
          visualDur:Math.max(0.12,240/Math.max(1,rpm))};
}
function motorIsDc(motor){ return !!motor && motor.kind === 'dc'; }

/* ---------- машина постоянного тока независимого возбуждения ----------
   E = c·Φ·ω, Iя = (Uя − E)/Rя, M = c·Φ·Iя, J·dω/dt = M − Mс.
   Постоянная машины c·Φ и номинальный момент выводятся из паспортных данных:
   при номинальных напряжении якоря, потоке и нагрузке машина даёт номинальные
   обороты, ток и момент. Никаких повреждений на этом этапе не моделируется. */
function dcMotorData(motor){
  motor=motor||{};
  const Ua=Math.max(1,Number(motor.ratedArmatureVoltage)||DCM.ratedArmatureVoltage);
  const Ia=Math.max(.1,Number(motor.ratedArmatureCurrent)||DCM.ratedArmatureCurrent);
  const Uf=Math.max(1,Number(motor.ratedFieldVoltage)||DCM.ratedFieldVoltage);
  const Ra=Math.max(.01,Number(motor.armatureResistance)||DCM.armatureResistance);
  const Rf=Math.max(1,Number(motor.fieldResistance)||DCM.fieldResistance);
  const nNom=Math.max(1,Number(motor.ratedSpeed)||DCM.ratedSpeed);
  const omegaNom=nNom*Math.PI/30;
  const emfNom=Math.max(1,Ua-Ia*Ra);
  const cPhi=emfNom/omegaNom;
  const torqueNom=cPhi*Ia;
  const accelTime=Math.max(.05,Number(motor.inertiaFactor)||DCM.inertiaFactor);
  const inertia=Math.max(1e-4,torqueNom*accelTime/omegaNom);
  return {Ua:Ua,Ia:Ia,Uf:Uf,Ra:Ra,Rf:Rf,nNom:nNom,omegaNom:omegaNom,
          emfNom:emfNom,cPhi:cPhi,torqueNom:torqueNom,inertia:inertia};
}
/* Карта потенциалов принимается и целиком, и как таблица pot: так функцию
   нельзя вызвать с «почти правильным» аргументом и получить молчаливый ноль. */
function dcPotentialTable(map){
  if(!map)return potentialMap().pot;
  return map.pot?map.pot:map;
}
/* Напряжение между двумя зажимами машины. Для постоянного тока это разность
   действительных частей; если на зажимы попало переменное напряжение, оно
   возвращается по модулю с признаком dc:false — режим работы машины неверный. */
function dcTerminalVoltage(motor,plusKey,minusKey,map){
  const pot=dcPotentialTable(map);
  const a=pot[nodeKey({devId:motor.id,key:plusKey})];
  const b=pot[nodeKey({devId:motor.id,key:minusKey})];
  if(!a||!b)return {volts:0,dc:true,present:false};
  const ac=(!a.dc&&Number(a.frequencyHz)>0)||(!b.dc&&Number(b.frequencyHz)>0);
  if(ac)return {volts:Math.hypot(a.r-b.r,a.i-b.i),dc:false,present:true};
  return {volts:a.r-b.r,dc:true,present:true};
}
function dcMotorOperatingPoint(motor,map){
  motor=motor||{};
  const pot=dcPotentialTable(map);
  const d=dcMotorData(motor);
  const armature=dcTerminalVoltage(motor,'ya1','ya2',pot);
  const field=dcTerminalVoltage(motor,'sh1','sh2',pot);
  const load=Math.max(0,Math.min(100,Number(motor.load)||0));
  const fieldVolts=field.dc?field.volts:Math.abs(field.volts);
  const flux=fieldVolts/d.Uf;
  const omega=(Number(motor.rpmActual)||0)*Math.PI/30;
  const cPhiFlux=d.cPhi*flux;
  const emf=cPhiFlux*omega;
  const armatureCurrent=(armature.volts-emf)/d.Ra;
  const torque=cPhiFlux*armatureCurrent;
  const loadTorque=d.torqueNom*(load/100);
  return {data:d,load:load,
    armatureVoltage:armature.volts,armatureDc:armature.dc,armaturePresent:armature.present,
    armatureCurrent:armatureCurrent,emf:emf,cPhiFlux:cPhiFlux,
    fieldVoltage:field.volts,fieldDc:field.dc,fieldCurrent:fieldVolts/d.Rf,
    flux:flux,torque:torque,loadTorque:loadTorque,
    rpm:Math.round(Math.abs(omega)*30/Math.PI),
    direction:Math.abs(omega)>.5?(omega>0?1:-1):0,
    supplied:armature.present&&Math.abs(armature.volts)>1,
    acSupply:!armature.dc||!field.dc};
}
/* Один шаг механики: явный Эйлер с подшагами. Чаг подшага много меньше
   механической постоянной J·Rя/(c·Φ)², поэтому интегрирование устойчиво. */
function dcMotorInertiaStep(motor,dt){
  const d=dcMotorData(motor);
  const point=dcMotorOperatingPoint(motor);
  let omega=(Number(motor.rpmActual)||0)*Math.PI/30;
  const steps=10,h=Math.max(0,dt)/steps;
  for(let i=0;i<steps;i++){
    const emf=point.cPhiFlux*omega;
    const armatureCurrent=(point.armatureVoltage-emf)/d.Ra;
    const torque=point.cPhiFlux*armatureCurrent;
    const resisting=point.loadTorque*Math.tanh(omega/4);
    omega+=(torque-resisting)/d.inertia*h;
  }
  // Страховка прототипа: без ослабления потока разнос недостижим, но
  // ограничение не даёт численно «взорваться» при неверном монтаже.
  const limit=3*d.omegaNom;
  if(Math.abs(omega)>limit)omega=Math.sign(omega)*limit;
  motor.rpmActual=omega*30/Math.PI;
}
function newDcMotor(id,x,y){
  return {id:id,tag:id,kind:'dc',x:x,y:y,w:MOTOR.w,h:MOTOR.h,scale:MOTOR.scale,
    load:0,rpmActual:0,angle:0,
    ratedArmatureVoltage:DCM.ratedArmatureVoltage,ratedFieldVoltage:DCM.ratedFieldVoltage,
    ratedArmatureCurrent:DCM.ratedArmatureCurrent,ratedSpeed:DCM.ratedSpeed,
    armatureResistance:DCM.armatureResistance,fieldResistance:DCM.fieldResistance,
    ratedPower:DCM.ratedPower,inertiaFactor:DCM.inertiaFactor};
}
function motorInner(direction, operating, motor){
  motor=motor||MOTOR;
  const running = direction !== 0;
  operating = operating || motorOperatingPoint(motor,direction);
  let s = '';
  // Корпус увеличен вдвое вокруг верхней центральной точки; внешний масштаб увеличивает весь двигатель вместе с клеммной коробкой.
  s += '<g transform="translate(116 46) scale(2) translate(-116 -46)">';
  // Корпус и лапы двигателя при взгляде спереди.
  s += '<path d="M72 126 L83 135 L78 144 L58 144 L62 134 Z M160 126 L171 134 L174 144 L154 144 L149 135 Z" fill="#2266a8" stroke="#123c66" stroke-width="1.5"/>';
  s += '<rect x="55" y="142" width="122" height="7" rx="2" fill="#1b5490" stroke="#123c66"/>';
  s += '<circle cx="66" cy="145" r="2.4" fill="#0e3358"/><circle cx="166" cy="145" r="2.4" fill="#0e3358"/>';
  // Круглый торцевой щит и неподвижные рёбра корпуса.
  s += '<circle cx="116" cy="99" r="53" fill="#1f5fa8" stroke="#123c66" stroke-width="2"/>';
  s += '<circle cx="116" cy="99" r="46" fill="#2a6fbf" stroke="#69a6e0" stroke-width="2"/>';
  s += '<circle cx="116" cy="99" r="39" fill="#2868ad" stroke="#123c66" stroke-width="2"/>';
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6, x1=116+29*Math.cos(a), y1=99+29*Math.sin(a), x2=116+36*Math.cos(a), y2=99+36*Math.sin(a);
    s += '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="#174c83" stroke-width="2.2" stroke-linecap="round"/>';
  }
  // Крышка подшипника и торец вала: шпонка и центральный кружок вращаются вместе с валом.
  s += '<circle cx="116" cy="99" r="22" fill="#184d83" stroke="#b7d2eb" stroke-width="2"/>';
  // Вал, шпонка и центральная точка остаются одной неизменной деталью.
  s += '<g class="motor-rotor" transform="rotate('+(motor.angle||0).toFixed(3)+' 116 99)">';
  s += '<circle cx="116" cy="99" r="15" fill="#c4cbd1" stroke="#707983" stroke-width="1.5"/>';
  s += '<rect x="112" y="84" width="8" height="7" rx="1.5" fill="#747d86" stroke="#525b64" stroke-width="1"/>';
  s += '<circle cx="116" cy="99" r="4" fill="#7b848d" stroke="#e7eaed" stroke-width="1.2"/>';
  s += '</g>';
  s += '</g>';
  // PE-винт отрисовывается тем же компонентом и в том же масштабе, что винты клеммной коробки.
  s += contactHole(208,206,6);
  s += '<text x="208" y="226" text-anchor="middle" font-size="9" font-weight="800" fill="#e8d800" stroke="#176b2c" stroke-width=".3" font-family="Segoe UI,Arial">PE</text>';
  // Клеммная коробка сверху корпуса с перемычкой звезды.
  s += '<rect x="61" y="-8" width="110" height="60" rx="6" fill="#2a6fbf" stroke="#123c66" stroke-width="1.5"/>';
  s += '<rect x="65" y="-4" width="102" height="52" rx="4" fill="#2a6fbf" stroke="#1b5490"/>';
  s += '<circle cx="69" cy="1" r="2.6" fill="#c8ccd0" stroke="#8d9299"/><circle cx="163" cy="1" r="2.6" fill="#c8ccd0" stroke="#8d9299"/>';
  s += '<circle cx="69" cy="43" r="2.6" fill="#c8ccd0" stroke="#8d9299"/><circle cx="163" cy="43" r="2.6" fill="#c8ccd0" stroke="#8d9299"/>';
  s += '<rect class="motor-star-bridge" x="78" y="23" width="76" height="10" rx="5" fill="#d4af37" stroke="#8d6f14" stroke-width="1.2"/>';
  s += '<path d="M84 25 H148" stroke="#f4d978" stroke-width="1.5" pointer-events="none"/>';
  MOTOR_TERMS.filter(function(t){ return !t.caseGround; }).forEach(function(t){
    s += contactHole(t.dx,t.dy,6);
    const labelY = t.dy > 15 ? 45 : t.dy + 15;
    s += '<text x="'+t.dx+'" y="'+labelY+'" text-anchor="middle" font-size="6.5" fill="#eaf3ff" font-family="Segoe UI,Arial">'+t.label+'</text>';
  });
  return s;
}

/* ============================================================
   Машина постоянного тока независимого возбуждения (ДПТ НВ)
   Корпус тот же, что у асинхронного двигателя, но выкрашен в зелёный,
   чтобы машины нельзя было спутать. На валу виден коллектор со щётками,
   а в клеммной коробке вместо перемычки звезды — четыре зажима:
   якорь Я1–Я2 и обмотка возбуждения Ш1–Ш2.
   ============================================================ */
function dcMotorInner(direction, operating, motor){
  motor=motor||{};
  const C=DC_GREEN;
  let s = '';
  s += '<g transform="translate(116 46) scale(2) translate(-116 -46)">';
  s += '<path d="M72 126 L83 135 L78 144 L58 144 L62 134 Z M160 126 L171 134 L174 144 L154 144 L149 135 Z" fill="'+C.feet+'" stroke="'+C.edge+'" stroke-width="1.5"/>';
  s += '<rect x="55" y="142" width="122" height="7" rx="2" fill="'+C.base+'" stroke="'+C.edge+'"/>';
  s += '<circle cx="66" cy="145" r="2.4" fill="'+C.bolt+'"/><circle cx="166" cy="145" r="2.4" fill="'+C.bolt+'"/>';
  s += '<circle cx="116" cy="99" r="53" fill="'+C.bodyOuter+'" stroke="'+C.edge+'" stroke-width="2"/>';
  s += '<circle cx="116" cy="99" r="46" fill="'+C.bodyMid+'" stroke="'+C.bodyMidStroke+'" stroke-width="2"/>';
  s += '<circle cx="116" cy="99" r="39" fill="'+C.bodyInner+'" stroke="'+C.edge+'" stroke-width="2"/>';
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6, x1=116+29*Math.cos(a), y1=99+29*Math.sin(a), x2=116+36*Math.cos(a), y2=99+36*Math.sin(a);
    s += '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+C.rib+'" stroke-width="2.2" stroke-linecap="round"/>';
  }
  // Коллектор на валу и неподвижные щётки над ним.
  s += '<circle cx="116" cy="99" r="23" fill="'+C.cover+'" stroke="'+C.coverStroke+'" stroke-width="2"/>';
  s += '<circle cx="116" cy="99" r="19" fill="none" stroke="#b8794a" stroke-width="4"/>';
  s += '<rect x="86" y="93" width="11" height="13" rx="2" fill="#2b3138" stroke="#5d666f"/>';
  s += '<rect x="135" y="93" width="11" height="13" rx="2" fill="#2b3138" stroke="#5d666f"/>';
  s += '<g class="motor-rotor" transform="rotate('+(motor.angle||0).toFixed(3)+' 116 99)">';
  s += '<circle cx="116" cy="99" r="15" fill="#c4cbd1" stroke="#707983" stroke-width="1.5"/>';
  s += '<rect x="112" y="84" width="8" height="7" rx="1.5" fill="#747d86" stroke="#525b64" stroke-width="1"/>';
  s += '<circle cx="116" cy="99" r="4" fill="#7b848d" stroke="#e7eaed" stroke-width="1.2"/>';
  s += '</g>';
  s += '<text x="116" y="68" text-anchor="middle" font-size="7.5" font-weight="800" fill="'+C.plate+'" font-family="Segoe UI,Arial">ДПТ</text>';
  s += '</g>';
  s += contactHole(208,206,6);
  s += '<text x="208" y="226" text-anchor="middle" font-size="9" font-weight="800" fill="#e8d800" stroke="#176b2c" stroke-width=".3" font-family="Segoe UI,Arial">PE</text>';
  s += '<text x="116" y="270" text-anchor="middle" font-size="9.5" font-weight="800" fill="'+C.plateName+'" font-family="Segoe UI,Arial">ДПТ НВ · независимое возбуждение</text>';
  // Клеммная коробка: якорь в верхнем ряду, обмотка возбуждения — в нижнем.
  // Разделитель только вертикальный: горизонтальный перечёркивал бы подписи.
  s += '<rect x="61" y="-8" width="110" height="60" rx="6" fill="'+C.box+'" stroke="'+C.edge+'" stroke-width="1.5"/>';
  s += '<rect x="65" y="-4" width="102" height="52" rx="4" fill="'+C.boxInner+'" stroke="'+C.boxLine+'"/>';
  s += '<line x1="116" y1="-4" x2="116" y2="48" stroke="'+C.boxLine+'" stroke-width="1.4"/>';
  DC_MOTOR_TERMS.filter(function(t){ return !t.caseGround; }).forEach(function(t){
    s += contactHole(t.dx,t.dy,6);
    // Отступ такой же, как у асинхронного двигателя: иначе подпись верхнего
    // ряда уходит под шляпку винта.
    const labelY = t.dy > 15 ? 45 : t.dy + 15;
    s += '<text x="'+t.dx+'" y="'+labelY+'" text-anchor="middle" font-size="6.5" fill="'+C.termLabel+'" font-family="Segoe UI,Arial">'+t.label+'</text>';
  });
  return s;
}

/* ============================================================
   4. СЛОИ СЦЕНЫ
   ============================================================ */
const scene       = document.getElementById('scene');
const railLayer   = document.getElementById('railLayer');
const guideLayer  = document.getElementById('guideLayer');
const motorLayer  = document.getElementById('motorLayer');
const boxLayer    = document.getElementById('boxLayer');
const relayLayer  = document.getElementById('relayLayer');
const deviceLayer = document.getElementById('deviceLayer');
const mmLayer     = document.getElementById('mmLayer');

// Равные отступы от верхней и нижней грани до осей крайних реек.
const PANEL={width:SLOTS*MODULE+80,firstRail:360,pitch:400,baseHeight:720,inboxX:26,inboxY:36};
function panelRailCount(panel){return Math.max(1,Math.min(5,Math.round(Number(panel.railCount)||2)));}
function panelHeight(panel){return PANEL.baseHeight+(panelRailCount(panel)-1)*PANEL.pitch;}
function panelById(id){return state.panels.find(function(p){return p.id===id;})||null;}
function inboxPanel(){return state.panels.find(function(p){return p.inbox;})||null;}
function panelInletVoltage(panel){return Number(panel&&panel.inletVoltage)===220?220:380;}
function inboxSinglePhase(){const panel=inboxPanel();return !!panel&&panelInletVoltage(panel)===220;}
function inboxWidth(){return inboxSinglePhase()?180:INBOX.w;}
function inboxTerms(){return inboxSinglePhase()?INBOX_SINGLE_TERMS:INBOX_TERMS;}
function pruneInboxConnections(){
  const keys=inboxTerms().map(function(t){return t.key;});
  function missing(t){return t&&String(t.devId)==='IN'&&!keys.includes(t.key);}
  state.wires=state.wires.filter(function(w){return !missing(w.a)&&!missing(w.b);});
  ['a','b'].forEach(function(key){if(missing(state.mm[key]))state.mm[key]=null;});
  state.clamps.forEach(function(c){if(!state.wires.some(function(w){return w.id===c.wireId;}))c.wireId=null;});
  if(pending&&missing(pending.from))cancelWire();
}
function setPanelInlet(panel,value){
  const voltage=Number(value)===220?220:380;
  if(panel.inbox&&voltage===220){
    // Снятые щупы остаются на прежнем месте после исчезновения L2 и L3.
    ['a','b'].forEach(function(key){
      const sel=state.mm[key];if(!sel||String(sel.devId)!=='IN'||!['L2','L3'].includes(sel.key))return;
      const p=terminal(sel.devId,sel.key);
      if(p){if(key==='a'){METER.redX=p.x;METER.redY=p.y;}else{METER.blackX=p.x;METER.blackY=p.y;}}
    });
  }
  panel.inletVoltage=voltage;
  if(panel.inbox){
    state.specialProps.inbox.ratedVoltage=voltage;
    state.specialProps.inbox.customName=voltage===220?'Ввод 220 В':'Ввод 3×380 В';
    pruneInboxConnections();
  }
}
function syncPanelInbox(){
  const panel=inboxPanel();if(!panel)return;
  INBOX.x=panel.x+PANEL.inboxX;INBOX.y=panel.y+PANEL.inboxY;
}
function mountingRails(){
  const rails=state.standaloneRails!==false?RAILS.map(function(y,i){return {id:i,x:RAIL_X0,y:y,slots:SLOTS};}):[];
  state.panels.forEach(function(p){for(let row=0;row<panelRailCount(p);row++)rails.push({id:p.id+':'+row,x:p.x+40,y:p.y+PANEL.firstRail+row*PANEL.pitch,slots:SLOTS,panelId:p.id,row:row});});
  return rails;
}
function mountingRail(id){return mountingRails().find(function(r){return r.id===id;})||null;}
function mountingRailTitle(id){
  const rail=mountingRail(id);
  return rail&&rail.panelId?(panelById(rail.panelId).tag+' · рейка '+(rail.row+1)):String(Number(id)+1);
}
function railPlacement(left,centerY,modules,exceptId){
  let chosen=null,best=Infinity;
  mountingRails().forEach(function(r){
    if(left+modules*MODULE<r.x-30||left>r.x+r.slots*MODULE+30)return;
    const gap=Math.abs(centerY-r.y);
    if(gap<best||(gap===best&&r.panelId)){best=gap;chosen=r;}
  });
  if(!chosen||best>150)return null;
  const slot=Math.max(0,Math.min(chosen.slots-modules,Math.round((left-chosen.x)/MODULE)));
  return {rail:chosen.id,slot:slot,railOk:true,ok:isFree(chosen.id,slot,modules,exceptId)};
}
function panelInner(panel){
  const w=PANEL.width,h=panelHeight(panel);
  let s='<rect x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" rx="13" fill="#c6ccd1" stroke="#8f979f" stroke-width="3"/>';
  s+='<rect x="8" y="8" width="'+(w-16)+'" height="'+(h-16)+'" rx="9" fill="none" stroke="#edf0f2" stroke-width="3"/>';
  s+='<rect x="23" y="23" width="'+(w-46)+'" height="'+(h-46)+'" rx="6" fill="#dce1e5" stroke="#949ca4" stroke-width="2"/>';
  s+='<rect x="34" y="34" width="'+(w-68)+'" height="'+(h-68)+'" rx="4" fill="#e4e8eb" stroke="#bcc4ca"/>';
  [[16,16],[w-16,16],[16,h-16],[w-16,h-16]].forEach(function(p){s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="#dfe3e6" stroke="#9ca4ab"/>';});
  for(let i=0;i<5;i++)s+='<ellipse cx="'+(w/2+(i-2)*44)+'" cy="'+(h-15)+'" rx="13" ry="5" fill="#b3bbc2" stroke="#919aa2"/>';
  s+='<text x="'+(w/2)+'" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#5b646c" font-family="Segoe UI,Arial">'+escapeHtml(panel.tag||'ЩР')+'</text>';
  return s;
}
function renderPanels(){
  const layer=document.getElementById('panelLayer');
  if(layer)layer.innerHTML=state.panels.map(function(p){
    // Кабель проходит за корпусом щита, по центру крышки ввода.
    const cable=p.inbox&&state.special.inbox?'<g transform="translate('+PANEL.inboxX+','+PANEL.inboxY+')">'+inboxCableInner()+'</g>':'';
    return '<g data-panel-id="'+p.id+'" transform="translate('+p.x+','+p.y+')" style="cursor:grab;touch-action:none">'+cable+panelInner(p)+'</g>';
  }).join('');
}
function detachPanelDevices(panel,fromRow){
  state.devices.forEach(function(d){
    if(typeof d.rail!=='string'||!d.rail.startsWith(panel.id+':'))return;
    const row=Number(d.rail.split(':')[1]);if(row<fromRow)return;
    d.x=panel.x+40+d.slot*MODULE;d.y=panel.y+PANEL.firstRail+row*PANEL.pitch-TYPES[d.type].h/2;
    delete d.rail;delete d.slot;
  });
}
function railSvg(rail){
  const W=rail.slots*MODULE,RAIL_X0=rail.x,RAIL_X1=rail.x+W,SLOTS=rail.slots,cy=rail.y;
  let s = '';
    const top = cy - RAIL_H/2, bot = cy + RAIL_H/2;
    s += '<rect x="'+(RAIL_X0-3)+'" y="'+(top-4)+'" width="'+(W+6)+'" height="'+(RAIL_H+9)+'" rx="4" fill="rgba(0,0,0,.13)"/>';
    s += '<rect x="'+RAIL_X0+'" y="'+top+'" width="'+W+'" height="'+RAIL_H+'" fill="#c9ced4" stroke="#9aa0a8"/>';
    s += '<rect x="'+RAIL_X0+'" y="'+(top+2)+'" width="'+W+'" height="4" fill="rgba(255,255,255,.6)"/>';
    s += '<rect x="'+RAIL_X0+'" y="'+(bot-6)+'" width="'+W+'" height="4" fill="rgba(0,0,0,.12)"/>';
    s += '<line x1="'+RAIL_X0+'" y1="'+(top+10)+'" x2="'+RAIL_X1+'" y2="'+(top+10)+'" stroke="#a2a8af"/>';
    s += '<line x1="'+RAIL_X0+'" y1="'+(bot-10)+'" x2="'+RAIL_X1+'" y2="'+(bot-10)+'" stroke="#a2a8af"/>';
    for (let i=0;i<SLOTS;i++){
      const cx = RAIL_X0 + (i+0.5)*MODULE;
      s += '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+(MODULE*0.30)+'" ry="11" fill="#a4a9b0" stroke="#8c9299"/>';
      s += '<ellipse cx="'+cx+'" cy="'+(cy-2)+'" rx="'+(MODULE*0.27)+'" ry="8.5" fill="#9aa0a8" opacity=".55"/>';
    }
  return s;
}
function renderRail(){
  railLayer.innerHTML=mountingRails().map(railSvg).join('');
}

function renderDevices(){
  let s = '';
  // подсветка места установки при перетаскивании
  const placementDrag = (drag && drag.candidate) ? drag
                      : (freeDeviceDrag && freeDeviceDrag.candidate ? freeDeviceDrag : null);
  if (placementDrag && placementDrag.candidate && !placementDrag.candidate.relay && !placementDrag.candidate.free){
    const c = placementDrag.candidate;
    const col = c.ok ? 'rgba(47,191,113,.35)' : 'rgba(255,91,91,.35)';
    const brd = c.ok ? '#2fbf71' : '#ff5b5b';
    const t = TYPES[placementDrag.type], rail=mountingRail(c.rail),cy=rail.y,top=cy-RAIL_H/2;
    const x = rail.x + c.slot*MODULE, w = t.modules*MODULE;
    s += '<rect x="'+x+'" y="'+(top-6)+'" width="'+w+'" height="'+(RAIL_H+12)+'" rx="4" fill="'+col+'" stroke="'+brd+'" stroke-dasharray="6 4"/>';
    s += '<text x="'+(x+w/2)+'" y="'+(top-14)+'" text-anchor="middle" font-size="12" font-weight="700" fill="'+brd+'" font-family="Segoe UI,Arial">'
       + (c.ok ? ('поз. '+(c.slot+1)) : (c.railOk === false ? 'только рейка '+(t.rail+1) : 'занято')) + '</text>';
  }
  state.devices.forEach(function(d){
    const t = TYPES[d.type], h = t.h, w = t.modules*MODULE;
    const o = originOf(d);
    const x = o.x, y = o.y;
    s += '<g class="dev" data-id="'+d.id+'" transform="translate('+x+','+y+')" style="cursor:grab">'
       +   deviceInner(d.type, d)
       + '</g>';
  });
  state.pushbuttons.forEach(function(pb){
    s += '<g class="push-station" data-dev="'+pb.id+'" transform="translate('+pb.x+','+pb.y+')" style="cursor:grab;touch-action:none">'
       + pushbuttonInner(pb) + '</g>';
  });
  deviceLayer.innerHTML = s;
}

/* тепловое реле — поверх аппаратов: щупы видно входящими в зажимы пускателя,
   а своя колодка 98/97/96/95 занимает место его нижних зажимов */
function renderRelays(){
  let s = '';
  state.relays.forEach(function(r){
    const km = devById(r.kmId);
    if (!km) return;
    const t = TYPES.km1, ko = originOf(km);
    const x = ko.x;
    const y = ko.y + t.h - RELAY_DROP;
    s += '<g class="relay" data-rid="'+r.id+'" transform="translate('+x+','+y+')" style="cursor:pointer">'
       +   relayInner({ tripped:r.tripped, set:r.set, attached:true, tag:r.tag })
       + '</g>';
  });
  // наведение реле на зажимы пускателя: подсветка места установки
  const c = drag && drag.candidate;
  if (c && c.relay){
    const km = devById(c.kmId);
    if (km){
      const t = TYPES.km1,ko=originOf(km);
      const x = ko.x, w = t.modules*MODULE;
      const y = ko.y + t.h - RELAY_DROP;
      const ok = c.ok, col = ok ? '#2fbf71' : '#ff5b5b';
      s += '<rect x="'+x+'" y="'+(y-PIN_TOP)+'" width="'+w+'" height="'+(TYPES.kk1.h+PIN_TOP)+'" rx="5" fill="'+(ok?'rgba(47,191,113,.18)':'rgba(255,91,91,.18)')+'" stroke="'+col+'" stroke-dasharray="6 4"/>';
      s += '<text x="'+(x+w/2)+'" y="'+(y+TYPES.kk1.h+16)+'" text-anchor="middle" font-size="12" font-weight="700" fill="'+col+'" font-family="Segoe UI,Arial">'
         + (ok ? 'щупы → зажимы 2 T1 · 4 T2 · 6 T3' : 'пускатель уже занят') + '</text>';
    }
  }
  relayLayer.innerHTML = s;
}

/* клеммная коробка ввода XT1: болты выкрашены в цвета проводов ввода */
function inboxCableInner(){
  const cx=inboxWidth()/2,end=INBOX.h/2;
  return '<path d="M'+cx+' -100000 V'+end+'" fill="none" stroke="#101317" stroke-width="30" stroke-linecap="round"/>'
    +'<path d="M'+cx+' -100000 V'+end+'" fill="none" stroke="#272c32" stroke-width="24" stroke-linecap="round"/>'
    +'<path d="M'+(cx-6)+' -100000 V'+end+'" fill="none" stroke="#555b62" stroke-width="2" stroke-linecap="round" opacity=".75"/>';
}
function inboxInner(withCable){
  const w = inboxWidth(), h = INBOX.h;
  const single=inboxSinglePhase(),voltage=networkLineVoltageRms(),frequency=networkFrequencyHz();
  let s = '';
  // Общий вводной кабель с пятью жилами внутри: оболочка и тонкий блик.
  if(withCable!==false)s+=inboxCableInner();
  // Компактный вводной корпус; выводы вынесены ниже нижней грани коробки.
  s += '<rect x="0" y="0" width="'+w+'" height="72" rx="11" fill="#cfd4da" stroke="#858d96" stroke-width="2"/>';
  s += '<rect x="5" y="5" width="'+(w-10)+'" height="62" rx="8" fill="#e4e7ea" stroke="#f9fafb" stroke-width="1.5"/>';
  s += '<rect x="10" y="9" width="'+(w-20)+'" height="10" rx="5" fill="#c5cbd1" stroke="#a0a7ae"/>';
  s += '<text x="'+(w/2)+'" y="39" text-anchor="middle" font-size="18" font-weight="900" fill="#343a40" font-family="Segoe UI,Arial">ВВОД '+(single?'':'3×')+voltage+' В</text>';
  s += '<text x="'+(w/2)+'" y="57" text-anchor="middle" font-size="9" font-weight="600" fill="#68717a" font-family="Segoe UI,Arial">'+(single?'ОДНОФАЗНАЯ':'ТРЁХФАЗНАЯ')+' СЕТЬ · '+frequency+' Гц</text>';
  // Один предупреждающий знак из предоставленного образца.
  s += single
    ? '<image href="assets/high-voltage-warning.png" x="8" y="24" width="24" height="24" preserveAspectRatio="xMidYMid meet"/>'
    : '<image href="assets/high-voltage-warning.png" x="10" y="23" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>';
  inboxTerms().forEach(function(t){
    s += '<rect x="'+(t.dx-18)+'" y="67" width="36" height="48" rx="7" fill="#d7dbe0" stroke="#9299a1" stroke-width="1.5"/>';
    s += '<text x="'+t.dx+'" y="83" text-anchor="middle" font-size="10.5" font-weight="800" fill="'+(t.tc||'#2b3138')+'" font-family="Segoe UI,Arial">'+t.label+'</text>';
    s += '<circle cx="'+t.dx+'" cy="'+t.dy+'" r="14" fill="rgba(0,0,0,.11)"/>';
    s += '<circle cx="'+t.dx+'" cy="'+t.dy+'" r="11" fill="'+t.color+'" stroke="rgba(0,0,0,.45)" stroke-width="1.4"/>';
    s += '<circle cx="'+t.dx+'" cy="'+t.dy+'" r="7.5" fill="none" stroke="rgba(255,255,255,.45)"/>';
    if (t.color === WCF.PE){                       // жёлто-зелёный: зелёные штрихи
      s += '<circle cx="'+t.dx+'" cy="'+t.dy+'" r="7.5" fill="none" stroke="#1f9d3a" stroke-width="3.6" stroke-dasharray="4.4 4.4"/>';
    }
    s += '<circle cx="'+t.dx+'" cy="'+t.dy+'" r="5.8" fill="#c9a227" stroke="#8d6f14" stroke-width="1"/>';
    const arm = 4.6;
    s += '<line x1="'+(t.dx-arm)+'" y1="'+t.dy+'" x2="'+(t.dx+arm)+'" y2="'+t.dy+'" stroke="#6b5410" stroke-width="2" stroke-linecap="round"/>';
    s += '<line x1="'+t.dx+'" y1="'+(t.dy-arm)+'" x2="'+t.dx+'" y2="'+(t.dy+arm)+'" stroke="#6b5410" stroke-width="2" stroke-linecap="round"/>';
  });
  return s;
}

/* обводки провода: цвет, для PE — жёлтый с зелёными штрихами */
function wireStrokeGeom(d, color, cls, dashed){
  const c = cls ? ' class="'+cls+'"' : '';
  const ds = dashed ? ' stroke-dasharray="10 6"' : '';
  if (color === WC.PE){
    return '<path'+c+' d="'+d+'" fill="none" stroke="#e8d800" stroke-width="4" stroke-linecap="round"'+ds+'/>'
         + '<path class="wire-stripe" d="'+d+'" fill="none" stroke="#1f9d3a" stroke-width="4" stroke-linecap="round" stroke-dasharray="7 7"/>';
  }
  return '<path'+c+' d="'+d+'" fill="none" stroke="'+color+'" stroke-width="4" stroke-linecap="round"'+ds+'/>';
}
function renderInbox(){
  if(!state.special.inbox){boxLayer.innerHTML='';return;}
  syncPanelInbox();
  let s = '<g class="inbox-draggable" data-dev="IN" transform="translate('+INBOX.x+','+INBOX.y+')" style="cursor:grab;touch-action:none">' + inboxInner(!inboxPanel()) + '</g>';
  boxLayer.innerHTML = s;
}

/* Направление вращения определяется порядком фаз на U1, V1 и W1.
   L1-L2-L3 и циклические перестановки — прямое вращение; перестановка любых двух фаз — обратное. */
function motorById(id){return state.motors.filter(function(m){return String(m.id)===String(id);})[0]||null;}
function pushbuttonById(id){return state.pushbuttons.filter(function(p){return String(p.id)===String(id);})[0]||null;}
function nextSpecialNumber(list,prefix){let max=0;list.forEach(function(o){const m=String(o.id||'').match(new RegExp('^'+prefix+'(\\d+)$'));if(m)max=Math.max(max,+m[1]);});return max+1;}
function motorSupplyFrequency(motor,map){
  motor=motor||state.motors[0];if(!motor)return 0;
  map=map||potentialMap();
  const phases=['U1','V1','W1'].map(function(key){return map.pot[nodeKey({devId:motor.id,key:key})];});
  if(phases.some(function(v){return !v;}))return 0;
  const frequencies=phases.map(function(v){return Number(v.frequencyHz)||networkFrequencyHz();});
  return Math.max.apply(null,frequencies)-Math.min.apply(null,frequencies)<=.05
    ?frequencies.reduce(function(sum,v){return sum+v;},0)/frequencies.length:0;
}
function motorPhaseDirection(motor){
  motor=motor||state.motors[0];
  if(!motor)return 0;
  if(motorIsDc(motor))return 0;            // у машины постоянного тока нет порядка фаз
  const map = potentialMap();
  if (map.conflict) return 0;
  const phases = ['U1','V1','W1'].map(function(key){ return map.pot[nodeKey({devId:motor.id,key:key})]; });
  if (phases.some(function(v){ return !v; })) return 0;
  const supplyFrequency=motorSupplyFrequency(motor,map);
  if(supplyFrequency<=0)return 0;
  // До базовой частоты ПЧ поддерживает постоянное отношение U/f.
  const nominalLineVoltage=ratedVoltageOf(motor,380);
  const baseFrequency=Math.max(1,Number(motor.ratedFrequency)||50);
  const expectedLineVoltage=nominalLineVoltage*Math.min(1,supplyFrequency/baseFrequency);
  const expectedPhaseVoltage=expectedLineVoltage/Math.sqrt(3);
  for (let i=0;i<3;i++){
    const phaseMagnitude=Math.hypot(phases[i].r,phases[i].i);
    if(phaseMagnitude<expectedPhaseVoltage*.8||phaseMagnitude>expectedPhaseVoltage*1.18)return 0;
    for (let j=i+1;j<3;j++){
      const lineVoltage=Math.hypot(phases[i].r-phases[j].r,phases[i].i-phases[j].i);
      if(lineVoltage<expectedLineVoltage*.8||lineVoltage>expectedLineVoltage*1.18)return 0;
    }
  }
  const refs = [vecPhase(0,expectedPhaseVoltage),vecPhase(120,expectedPhaseVoltage),vecPhase(240,expectedPhaseVoltage)];
  const order = phases.map(function(v){
    let best = 0, dist = Infinity;
    refs.forEach(function(ref, i){
      const d = Math.hypot(v.r-ref.r, v.i-ref.i);
      if (d < dist){ dist = d; best = i; }
    });
    return best;
  });
  if (new Set(order).size !== 3) return 0;
  let inversions = 0;
  for (let i=0;i<3;i++) for (let j=i+1;j<3;j++) if (order[i] > order[j]) inversions++;
  return inversions % 2 ? -1 : 1;
}
function motorHasThreePhase(){ return state.motors.some(function(m){return motorPhaseDirection(m)!==0;}); }
function renderMotor(){
  if(!state.motors.length){motorLayer.innerHTML='';updateMotorSound(0);return;}
  let s='',soundRpm=0,soundDir=0;
  state.motors.forEach(function(motor){
    const visualDirection = Math.abs(motor.rpmActual||0)>1 ? Math.sign(motor.rpmActual) : 0;
    if(motorIsDc(motor)){
      const operating=dcMotorOperatingPoint(motor);
      const rpm=Math.round(Math.abs(motor.rpmActual||0));
      if(rpm>soundRpm){soundRpm=rpm;soundDir=visualDirection;}
      s += '<g class="motor-draggable" data-dev="'+motor.id+'" transform="translate('+motor.x+','+motor.y+') scale('+motor.scale+')" style="cursor:grab;touch-action:none">' + dcMotorInner(visualDirection, operating, motor) + '</g>';
      const dpx = motor.x + 232*motor.scale + 18, dpy = motor.y + 78;
      s += '<foreignObject x="'+dpx+'" y="'+dpy+'" width="270" height="252">'
       + '<div xmlns="http://www.w3.org/1999/xhtml" class="motor-load-control dc-motor-control">'
       + '<div class="motor-tag">'+escapeHtml(motor.tag||motor.id)+'</div>'
       + '<div class="motor-load-title">Нагрузка на валу</div>'
       + '<input class="motor-load" data-mid="'+motor.id+'" type="range" min="0" max="100" step="1" value="'+operating.load+'" />'
       + '<div class="motor-load-value">'+operating.load.toFixed(0)+' %</div>'
       + '<div class="motor-readout"><span>Напряжение якоря</span><b class="motor-armature-voltage">'+(operating.armaturePresent?operating.armatureVoltage.toFixed(0):'—')+' В</b></div>'
       + '<div class="motor-readout"><span>Ток якоря</span><b class="motor-armature-current">'+(operating.armaturePresent?operating.armatureCurrent.toFixed(1):'—')+' А</b></div>'
       + '<div class="motor-readout"><span>ЭДС якоря</span><b class="motor-emf-value">'+(operating.armaturePresent?operating.emf.toFixed(0):'—')+' В</b></div>'
       + '<div class="motor-readout"><span>Ток возбуждения</span><b class="motor-field-current">'+operating.fieldCurrent.toFixed(2)+' А</b></div>'
       + '<div class="motor-readout"><span>Момент</span><b class="motor-torque-value">'+(operating.armaturePresent?operating.torque.toFixed(1):'—')+' Н·м</b></div>'
       + '<div class="motor-readout"><span>Скорость</span><b class="motor-rpm-value">'+rpm+' об/мин</b></div>'
       + (operating.acSupply?'<div class="motor-alert">На зажимы машины подано переменное напряжение.</div>':'')
       + '</div></foreignObject>';
      return;
    }
    const electricalDirection = motorPhaseDirection(motor);
    const operating = motorVisualOperating(motor,electricalDirection);
    if(operating.rpm>soundRpm){soundRpm=operating.rpm;soundDir=visualDirection;}
    s += '<g class="motor-draggable" data-dev="'+motor.id+'" transform="translate('+motor.x+','+motor.y+') scale('+motor.scale+')" style="cursor:grab;touch-action:none">' + motorInner(visualDirection, operating, motor) + '</g>';
    const px = motor.x + 232*motor.scale + 18, py = motor.y + 78;
    const activeRelay = motorSupplyRelay(motor);
    const heat = activeRelay ? Math.round((activeRelay.heat || 0)*100) : 0;
    s += '<foreignObject x="'+px+'" y="'+py+'" width="270" height="190">'
     + '<div xmlns="http://www.w3.org/1999/xhtml" class="motor-load-control">'
     + '<div class="motor-tag">'+escapeHtml(motor.tag||motor.id)+'</div>'
     + '<div class="motor-load-title">Нагрузка на валу</div>'
     + '<input class="motor-load" data-mid="'+motor.id+'" type="range" min="0" max="100" step="1" value="'+operating.load+'" />'
     + '<div class="motor-load-value">'+operating.load.toFixed(0)+' %</div>'
     + '<div class="motor-readout"><span>Частота питания</span><b class="motor-frequency-value">'+operating.frequencyHz.toFixed(1)+' Гц</b></div>'
     + '<div class="motor-readout"><span>Скорость</span><b class="motor-rpm-value">'+operating.rpm+' об/мин</b></div>'
     + '<div class="motor-readout"><span>Ток двигателя</span><b class="motor-current-value">'+operating.current.toFixed(1)+' А</b></div>'
     + '<div class="motor-readout"><span>Нагрев реле</span><b class="motor-heat-value">'+heat+' %</b></div>'
     + '</div></foreignObject>';
  });
  motorLayer.innerHTML = s;
  updateMotorSound(soundDir,soundRpm);
}

/* ============================================================
   5. ЛОГИКА РАЗМЕЩЕНИЯ
   ============================================================ */
function occupancy(rail){
  const map = {};
  state.devices.forEach(function(d){
    // Свободно стоящий аппарат уже не занимает прежнее место на рейке.
    if (d.rail !== rail || (isFinite(d.x) && isFinite(d.y))) return;
    for (let i=0;i<TYPES[d.type].modules;i++) map[d.slot+i] = d;
  });
  return map;
}
function isFree(rail, slot, modules, exceptId){
  const mounting=mountingRail(rail);
  if (!mounting || !isFinite(slot) || slot < 0 || slot + modules > mounting.slots) return false;
  const map = occupancy(rail);
  for (let i=0;i<modules;i++){
    const o = map[slot+i];
    if (o && o.id !== exceptId) return false;
  }
  return true;
}
function stockLeft(type){
  return Infinity;
}
function nextLampIndicator(){
  const order = ['green','yellow','red'];
  const used = state.devices.filter(function(d){ return d.type === 'lamp'; }).map(function(d){ return d.indicator || 'green'; });
  return order.filter(function(color){ return used.indexOf(color) < 0; })[0] || 'green';
}
function lampTagFor(indicator){ return indicator === 'yellow' ? 'HL2' : (indicator === 'red' ? 'HL3' : 'HL1'); }
function usedTagNumbers(prefix){
  const nums=[];
  state.devices.forEach(function(d){const m=String(d.tag||'').match(new RegExp('^'+prefix+'(\\d+)$'));if(m)nums.push(+m[1]);});
  state.relays.forEach(function(r){const m=String(r.tag||'').match(new RegExp('^'+prefix+'(\\d+)$'));if(m)nums.push(+m[1]);});
  return nums;
}
function nextTag(prefix){
  const used=usedTagNumbers(prefix);return prefix+((used.length?Math.max.apply(null,used):0)+1);
}
function nextDeviceTag(type){return nextTag(TAG_PREFIX[type]||String(TAGS[type]||type).replace(/\d+$/,''));}
function ensureInstanceTags(){
  state.devices.slice().sort(function(a,b){return a.id-b.id;}).forEach(function(d){if(!d.tag)d.tag=nextDeviceTag(d.type);});
  state.relays.slice().sort(function(a,b){return a.id-b.id;}).forEach(function(r){if(!r.tag)r.tag=nextTag('KK');});
}
function devById(id){
  return state.devices.filter(function(d){ return d.id === id; })[0] || null;
}
function findDevice(type, onlyOn){
  const list = state.devices.filter(function(d){ return d.type === type && (!onlyOn || (d.on && !d.tripped)); });
  return list.length ? list[0] : null;
}
function contactor(){
  return state.devices.filter(function(d){ return d.type === 'km1'; })[0] || null;
}
function relayFor(kmId){
  return state.relays.filter(function(r){ return r.kmId === kmId; })[0] || null;
}
function anyRelayById(id){
  return state.relays.filter(function(r){ return r.id === id; })[0] || null;
}
function anyRelay(){ return state.relays[0] || null; }
function relayTripped(){
  const r = anyRelay();
  return !!(r && r.tripped);
}
/* аппарат под нагрузкой: автомат включён либо катушка пускателя под напряжением */
function isLive(dev){
  const kind = TYPES[dev.type].kind;
  if (kind === 'mcb' || kind === 'rcd') return !!(dev.on && !dev.tripped);
  if (kind === 'meter') return meterVoltage(dev) >= 50;
  if (kind === 'sensor') return meterVoltage(dev) >= 50;
  if (kind === 'contactor') return !!dev.coil;
  if (kind === 'lamp') return lampVoltage(dev) >= 50;
  if (kind === 'bulb') return bulbVoltage(dev) >= 50;
  if (kind === 'outlet') return outletVoltage(dev) >= 50;
  if (kind === 'appliance') return applianceVoltage(dev) >= 50;
  if (kind === 'junction'){
    const map=potentialMap();
    return junctionTerms().some(function(t){const v=map.pot[nodeKey({devId:dev.id,key:t.key})];return !!(v&&Math.hypot(v.r,v.i)>=50);});
  }
  if (kind === 'wallSwitch' || kind === 'twoWaySwitch'){
    const map=potentialMap();
    if(map.conflict)return false;
    return ['L','O1','O2'].some(function(key){const v=map.pot[nodeKey({devId:dev.id,key:key})];return !!(v&&Math.hypot(v.r,v.i)>=50);});
  }
  if (kind === 'vfd') return !!(dev.vfdInputReady || dev.running);
  if (kind === 'converter') return !!(dev.tpOn && tpInputState(dev,potentialMap().pot).ready);
  if (kind === 'timer') return !!dev.timerSupply;
  return false;
}

/* ============================================================
   6. ПЕРЕТАСКИВАНИЕ
   ============================================================ */
let drag = null;

/* Касания перехватываются до обработчиков мыши. Короткое касание выполняет
   обычное действие, движение — перенос, удержание корпуса — контекстное меню.
   Второй палец переводит жест в масштабирование, сохраняя черновик провода. */
const touchPointers=new Map();
let touchGesture=null,touchPanMode=false,touchPlacement=null,touchMoveFrame=0,touchMoveEvent=null;
function mobileTouchLayout(){
  return typeof window.matchMedia==='function'
    && window.matchMedia('(pointer: coarse) and (hover: none)').matches;
}
function touchUI(){
  if(!mobileTouchLayout())return;
  const root=document.documentElement||document.body;
  root.classList.add('touch-ui');
  document.body.classList.add('touch-input');
}
function touchStatus(text){
  const status=document.getElementById('touchStatus');
  if(status)status.textContent=text||'';
  const cancel=document.getElementById('touchCancel');
  if(cancel)cancel.disabled=!pending&&!touchPlacement;
}
function touchObjectTarget(el){
  let g=el.closest('[data-clamp-id]');if(g)return {kind:'special',key:'clamp',id:g.dataset.clampId};
  g=el.closest('.mm-probe,.multimeter-body');if(g)return {kind:'special',key:'multimeter'};
  g=el.closest('.motor-draggable');if(g)return {kind:'special',key:motorIsDc(motorById(g.dataset.dev))?'dcmotor':'motor',id:g.dataset.dev};
  g=el.closest('.push-station');if(g)return {kind:'special',key:'pushbutton',id:g.dataset.dev};
  g=el.closest('.relay');if(g)return {kind:'relay',id:+g.dataset.rid};
  g=el.closest('.dev');if(g)return {kind:'device',id:+g.dataset.id};
  g=el.closest('.inbox-draggable');if(g){const panel=inboxPanel();return panel?{kind:'special',key:'panel',id:panel.id}:{kind:'special',key:'inbox'};}
  g=el.closest('[data-panel-id]');if(g)return {kind:'special',key:'panel',id:g.dataset.panelId};
  return null;
}
function nearestTouchTerminal(evt){
  const matrix=ctmNode().getScreenCTM();if(!matrix)return null;
  let best=null,distance=22;
  termLayer.querySelectorAll('.term').forEach(function(el){
    const p=new DOMPoint(+el.getAttribute('cx'),+el.getAttribute('cy')).matrixTransform(matrix);
    const d=Math.hypot(p.x-evt.clientX,p.y-evt.clientY);
    if(d<distance){distance=d;best=el;}
  });
  return best;
}
function replayTouch(type,session,point,target){
  const event=new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:session.id,pointerType:'touch',
    isPrimary:true,button:0,buttons:type==='pointerup'||type==='pointercancel'?0:1,
    clientX:point.clientX,clientY:point.clientY});
  Object.defineProperty(event,'touchReplay',{value:true});
  (target||document).dispatchEvent(event);
}
function touchLayoutSnapshot(session){
  // Только геометрия: отмена жеста не откатывает электрические процессы.
  const target=touchObjectTarget(session.target),wire=session.target.closest('[data-wid]');
  let obj=null;
  if(target){
    if(target.kind==='device')obj=devById(target.id);
    else if(target.kind==='relay'){const r=anyRelayById(target.id);obj=r&&devById(r.kmId);}
    else if(target.key==='panel')obj=panelById(target.id);
    else if(target.key==='motor'||target.key==='dcmotor')obj=motorById(target.id);
    else if(target.key==='pushbutton')obj=pushbuttonById(target.id);
    else if(target.key==='clamp')obj=state.clamps.find(function(c){return c.id===target.id;});
    else if(target.key==='inbox')obj=INBOX;
    else if(target.key==='multimeter')obj=METER;
  }
  const fields=['x','y','rail','slot','wireId','fraction','redX','redY','blackX','blackY'];
  if(obj){const saved={};fields.forEach(function(k){saved[k]=obj[k];});session.restore=function(){fields.forEach(function(k){if(saved[k]===undefined)delete obj[k];else obj[k]=saved[k];});};}
  if(target&&target.key==='multimeter'){
    const restore=session.restore,a=state.mm.a,b=state.mm.b;
    session.restore=function(){if(restore)restore();state.mm.a=a;state.mm.b=b;};
  }
  if(wire){const w=state.wires.find(function(w){return w.id===+wire.dataset.wid;});if(w){const pts=JSON.parse(JSON.stringify(w.pts||[]));session.restore=function(){w.pts=pts;};}}
}
function startTouchAction(session,point){
  clearTimeout(session.timer);session.timer=null;
  const actual=document.elementFromPoint(session.sx,session.sy);
  if(session.target.closest('.term'))session.target=nearestTouchTerminal({clientX:session.sx,clientY:session.sy})||session.target;
  else if(actual&&actual.closest&&(actual.closest('#scene')||actual.closest('.tray-item')))session.target=actual;
  touchLayoutSnapshot(session);
  session.mode='action';
  replayTouch('pointerdown',session,{clientX:session.sx,clientY:session.sy},session.target);
  if(session.tray)sideMenuItems.forEach(function(item){item.open=false;});
}
function flushTouchMove(){
  if(touchMoveFrame){cancelAnimationFrame(touchMoveFrame);touchMoveFrame=0;}
  const move=touchMoveEvent;touchMoveEvent=null;
  if(move)replayTouch('pointermove',move.session,move.point);
}
function cancelTouchAction(session){
  clearTimeout(session.timer);
  if(touchMoveFrame){cancelAnimationFrame(touchMoveFrame);touchMoveFrame=0;}touchMoveEvent=null;
  if(session.mode!=='action')return;
  // Сбрасываем перенос до pointercancel, чтобы отпускание не включило аппарат
  // и не установило щуп/деталь при переходе к жесту двумя пальцами.
  if(drag){drag.ghost.remove();drag=null;}
  if(specialTrayDrag){specialTrayDrag.ghost.remove();specialTrayDrag=null;}
  freeDeviceDrag=null;motorDrag=null;inboxDrag=null;pushStationDrag=null;
  meterDrag=null;meterProbeDrag=null;meterProbeHover=null;wireGrab=null;
  if(panelDragFrame)cancelAnimationFrame(panelDragFrame);
  panelDragFrame=0;panelDrag=null;panelDragPointer=null;
  if(clampDragFrame)cancelAnimationFrame(clampDragFrame);
  clampDragFrame=0;clampDragPointer=null;if(clampState)clampState.drag=false;
  replayTouch('pointercancel',session,session);
  if(session.restore)session.restore();
  renderAll();
}
function touchPair(){
  const points=Array.from(touchPointers.values());
  return {x:(points[0].clientX+points[1].clientX)/2,y:(points[0].clientY+points[1].clientY)/2,
    distance:Math.max(1,Math.hypot(points[0].clientX-points[1].clientX,points[0].clientY-points[1].clientY))};
}
function moveTouchView(){
  if(!touchGesture)return;
  const g=touchGesture;
  const pair=g.pinch?touchPair():Array.from(touchPointers.values())[0];
  const cx=g.pinch?pair.x:pair.clientX,cy=g.pinch?pair.y:pair.clientY;
  const width=Math.max(Z_MIN,Math.min(Z_MAX,g.width*(g.pinch?g.distance/pair.distance:1)));
  const rect=scene.getBoundingClientRect(),scale=rect.width/width;
  view.w=width;view.h=width*viewAspect();
  view.x=g.anchor.x-(cx-rect.left)/scale;view.y=g.anchor.y-(cy-rect.top)/scale;
  clampView();applyView();
}
function startTouchView(pinch,session){
  const pair=pinch?touchPair():{x:session.sx,y:session.sy};
  touchGesture={pinch:pinch,width:view.w,distance:pair.distance,anchor:screenToScene(pair.x,pair.y)};
  touchPointers.forEach(function(s){cancelTouchAction(s);s.mode='gesture';clearTimeout(s.timer);});
  hideWireMenu();hideObjectMenu();
}
function stopTouchEvent(evt){evt.preventDefault();evt.stopImmediatePropagation();}
function onTouchStart(evt){
  if(evt.pointerType!=='touch'||evt.touchReplay)return;
  const target=evt.target;
  if(!target.closest)return;
  const tray=target.closest('.tray-item');
  // Текст карточки прокручивает лоток; за превью деталь можно перетащить.
  if(tray&&!target.closest('.mini'))return;
  if(!tray&&!target.closest('#scene'))return;
  if(target.closest('input,select,textarea,button,.motor-load-control'))return;
  touchUI();stopTouchEvent(evt);
  const s={id:evt.pointerId,target:target,tray:!!tray,sx:evt.clientX,sy:evt.clientY,
    clientX:evt.clientX,clientY:evt.clientY,mode:'waiting',timer:null};
  if(!tray&&!target.closest('.mm-probe,[data-pb],[data-zone],[data-vfd-control],[data-tp-control],[data-timer-control],.mm-mode,[data-switch-key],[data-two-way-switch],[data-appliance-toggle]')){
    const term=nearestTouchTerminal(evt);if(term)s.target=term;
  }
  touchPointers.set(s.id,s);
  if(typeof scene.setPointerCapture==='function')try{scene.setPointerCapture(s.id);}catch(e){}
  if(touchPointers.size===2){startTouchView(true,s);return;}
  if(touchPointers.size>2){s.mode='gesture';return;}
  if(!tray&&touchPanMode&&!touchPlacement){startTouchView(false,s);return;}
  if(touchPlacement)return;
  const hold=s.target.closest('[data-pb],[data-zone="manual-contactor"],[data-vfd-control],[data-tp-control]');
  if(hold){startTouchAction(s,evt);return;}
  if(!tray&&!pending&&!s.target.closest('.term')&&(touchObjectTarget(s.target)||s.target.closest('[data-wid]'))){
    s.timer=setTimeout(function(){
      if(s.mode!=='waiting'||touchPointers.size!==1)return;
      s.mode='menu';
      const wire=s.target.closest('[data-wid]');
      if(wire){hideObjectMenu();showWireMenu(+wire.dataset.wid,s.clientX,s.clientY,svgPoint(s));}
      else showObjectMenu({clientX:s.clientX,clientY:s.clientY,preventDefault:function(){},stopPropagation:function(){}},touchObjectTarget(s.target));
    },600);
  }
}
function onTouchMove(evt){
  if(evt.pointerType!=='touch'||evt.touchReplay)return;
  const s=touchPointers.get(evt.pointerId);if(!s)return;
  stopTouchEvent(evt);s.clientX=evt.clientX;s.clientY=evt.clientY;
  if(touchGesture){if(touchPointers.size>=2||!touchGesture.pinch)moveTouchView();return;}
  if(s.mode==='gesture'||s.mode==='menu'||touchPlacement)return;
  if(s.mode==='waiting'&&Math.hypot(s.clientX-s.sx,s.clientY-s.sy)>8){
    clearTimeout(s.timer);
    if(!s.tray&&!pending&&!s.target.closest('.term')&&!touchObjectTarget(s.target)&&!s.target.closest('[data-wid]')){startTouchView(false,s);moveTouchView();return;}
    if(pending&&!s.target.closest('.term'))s.mode='route';
    else startTouchAction(s,evt);
  }
  if(s.mode==='action'||s.mode==='route'){
    touchMoveEvent={session:s,point:{clientX:s.clientX,clientY:s.clientY}};
    if(!touchMoveFrame)touchMoveFrame=requestAnimationFrame(function(){touchMoveFrame=0;flushTouchMove();});
  }
}
function placeTouchItem(point){
  const spec=touchPlacement;touchPlacement=null;if(!spec)return;
  const evt={clientX:point.clientX,clientY:point.clientY,pointerId:point.id,preventDefault:function(){}};
  if(spec.special){startSpecialTrayDrag(evt,spec.special);specialTrayDrag.moved=true;finishSpecialTrayDrag(evt);}
  else{startDrag(evt,{type:spec.type});drag.moved=true;drag.candidate=computeCandidate(evt);onPointerUp(evt);}
  touchStatus('');
}
function onTouchEnd(evt){
  if(evt.pointerType!=='touch'||evt.touchReplay)return;
  const s=touchPointers.get(evt.pointerId);if(!s)return;
  stopTouchEvent(evt);clearTimeout(s.timer);
  s.clientX=evt.clientX;s.clientY=evt.clientY;
  if(evt.type==='pointercancel')cancelTouchAction(s);
  else if(!touchGesture&&s.mode!=='menu'&&s.mode!=='gesture'){
    flushTouchMove();
    if(touchPlacement&&!s.tray)placeTouchItem(s);
    else if(s.mode==='waiting'){
      if(s.tray){const item=s.target.closest('.tray-item');chooseTouchPlacement(item);}
      else{startTouchAction(s,s);replayTouch('pointerup',s,s);}
    }else{
      if(s.mode==='route'&&!nearestTouchTerminal(s))replayTouch('pointerdown',s,s,scene);
      replayTouch('pointerup',s,s);
    }
  }
  touchPointers.delete(s.id);
  if(typeof scene.releasePointerCapture==='function')try{scene.releasePointerCapture(s.id);}catch(e){}
  // Оставшийся палец после pinch не становится кликом или переносом.
  if(touchPointers.size<2&&touchGesture&&touchGesture.pinch)touchGesture=null;
  if(!touchPointers.size)touchGesture=null;
  touchStatus(touchPlacement?'Коснитесь места установки.':(pending?'Коснитесь клеммы или добавьте точку маршрута.':''));
}
function chooseTouchPlacement(item){
  touchPlacement=item.dataset.special?{special:item.dataset.special}:{type:item.dataset.type};
  cancelWire();sideMenuItems.forEach(function(menu){menu.open=false;});
  touchStatus('Коснитесь места установки.');
}
function initTouchControls(){
  // Мобильная компоновка включается только когда основное устройство ввода —
  // палец. Наличие дополнительного сенсорного экрана у ПК не меняет desktop UI.
  if(mobileTouchLayout())touchUI();
  document.addEventListener('pointerdown',onTouchStart,{capture:true,passive:false});
  document.addEventListener('pointermove',onTouchMove,{capture:true,passive:false});
  document.addEventListener('pointerup',onTouchEnd,{capture:true,passive:false});
  document.addEventListener('pointercancel',onTouchEnd,{capture:true,passive:false});
  scene.addEventListener('contextmenu',function(e){if(e.pointerType==='touch'||touchPointers.size){e.preventDefault();e.stopImmediatePropagation();}},true);
  const panButton=document.getElementById('touchPanToggle');
  if(panButton)panButton.addEventListener('click',function(){touchPanMode=!touchPanMode;panButton.setAttribute('aria-pressed',String(touchPanMode));panButton.classList.toggle('on',touchPanMode);});
  const cancel=document.getElementById('touchCancel');
  if(cancel)cancel.addEventListener('click',function(){touchPlacement=null;cancelWire();hideWireMenu();hideObjectMenu();touchStatus('');});
  document.getElementById('tray').addEventListener('click',function(e){const button=e.target.closest('.tray-add');if(button)chooseTouchPlacement(button.closest('.tray-item'));});
  if(typeof window.addEventListener==='function')window.addEventListener('blur',function(){touchPointers.forEach(cancelTouchAction);touchPointers.clear();touchGesture=null;});
}
initTouchControls();

/* координаты считаем в системе группы world (в ней лежат все слои) —
   иначе после сдвига сцены курсор «промахивается» мимо аппаратов и клемм */
const worldGroup = document.getElementById('world');
function ctmNode(){
  return (worldGroup && typeof worldGroup.getScreenCTM === 'function') ? worldGroup : scene;
}
function svgPoint(evt){
  const m = ctmNode().getScreenCTM();
  if (!m) return { x:NaN, y:NaN };
  return new DOMPoint(evt.clientX, evt.clientY).matrixTransform(m.inverse());
}
function sceneScale(){
  return ctmNode().getScreenCTM().a;
}
function buildGhost(type){
  const t = TYPES[type], w = t.modules*MODULE, h = t.h, k = sceneScale();
  const over = t.over || 0, overR = t.overR || 0;
  const vw = w + overR, vh = h + over;
  const div = document.createElement('div');
  div.className = 'ghost';
  div.innerHTML = '<svg width="'+(vw*k)+'" height="'+(vh*k)+'" viewBox="0 '+(-over)+' '+vw+' '+vh+'">'
                + deviceInner(type, {}) + '</svg>';
  return div;
}
function placeGhost(evt){
  const k = sceneScale();
  drag.ghost.style.left = (evt.clientX - drag.offX*k) + 'px';
  drag.ghost.style.top  = (evt.clientY - drag.offY*k) + 'px';
}
function computeCandidate(evt){
  const p = svgPoint(evt), t = TYPES[drag.type];
  if (!isFinite(p.x) || !isFinite(p.y)) return null;
  const left = p.x - drag.offX, top = p.y - drag.offY;

  // Светильники и другие монтажные объекты размещаются свободно на поле.
  if(t.freeOnly)return {free:true,x:left,y:top,ok:true};

  // тепловое реле ставится не на рейку, а на нижние зажимы пускателя
  if (t.kind === 'relay'){
    const centerX = left + t.modules*MODULE/2;
    let best = null, bestD = Infinity;
    state.devices.forEach(function(d){
      if (d.type !== 'km1') return;
      const ko=originOf(d),kmX=ko.x;
      const kmCX = kmX + TYPES.km1.modules*MODULE/2;
      const attachY = ko.y + TYPES.km1.h - RELAY_DROP;
      const dx = Math.abs(centerX - kmCX), dy = Math.abs(top - attachY);
      const dist = dx*0.7 + dy;
      if (dx < 95 && dy < 130 && dist < bestD){ bestD = dist; best = d; }
    });
    if (!best) return null;
    return { relay:true, kmId:best.id, rail:best.rail, slot:best.slot,
             ok: !relayFor(best.id) || (drag.relayId && relayFor(best.id) && relayFor(best.id).id === drag.relayId) };
  }

  const centerY = top + t.h/2;
  return railPlacement(left,centerY,t.modules,drag.id);
}

function startDrag(evt, spec){
  evt.preventDefault();
  cancelWire();
  const t = TYPES[spec.type];
  let offX = spec.offX, offY = spec.offY;
  if (offX === undefined){                 // из лотка берём аппарат «за середину»
    offX = t.modules*MODULE/2;
    offY = t.h*0.5;
  }
  drag = {
    id: spec.id || null, relayId: spec.relayId || null, relaySet: spec.relaySet,
    type: spec.type, offX: offX, offY: offY,
    sx: evt.clientX, sy: evt.clientY, moved:false, live:true,
    ghost: buildGhost(spec.type), candidate:null, prev: spec.prev || null, attachedRelay:null
  };
  document.body.appendChild(drag.ghost);
  placeGhost(evt);
}

function onPointerMove(evt){
  if (!drag) return;
  if (!drag.moved && Math.hypot(evt.clientX-drag.sx, evt.clientY-drag.sy) > 4){
    drag.moved = true;
    if ((drag.id || drag.relayId) && drag.live){
      if (drag.relayId){                       // снимаем реле с пускателя
        state.relays = state.relays.filter(function(r){ return r.id !== drag.relayId; });
        removeWiresFor('kk'+drag.relayId);
        drag.live = false;
      } else {
        const kind = TYPES[drag.type].kind;
        if (kind === 'contactor'){             // реле снимается вместе с пускателем
          const r = relayFor(drag.id);
          if (r){
            drag.attachedRelay = { tripped:r.tripped, set:r.set };
            state.relays = state.relays.filter(function(x){ return x.id !== r.id; });
            removeWiresFor('kk'+r.id);
          }
        }
        removeWiresFor(drag.id);
        state.devices = state.devices.filter(function(d){ return d.id !== drag.id; });
        drag.live = false;
      }
    }
  }
  drag.candidate = computeCandidate(evt);
  placeGhost(evt);
  renderDevices();
  renderRelays();
}
function onPointerUp(evt){
  if (!drag) return;
  const d = drag, cand = d.candidate;
  d.ghost.remove();
  drag = null;

  if (!d.moved){                           // короткий клик
    if (d.id && d.relayId){
      const r = anyRelayById(d.relayId);
      if (r) log('Тепловое реле '+tagOf('kk'+r.id)+': уставка '+r.set+' А, контакт 95-96 '+(r.tripped?'разомкнут (сработало)':'замкнут')+'.', 'info');
    } else if (d.id){
      const dev = devById(d.id);
      if (dev) toggleDevice(dev);
    }
    return;
  }

  const underLoad = !!(d.prev && d.prev.live);

  if (cand && cand.ok){
    if (cand.relay){
      const r = { id: d.relayId || state.nextId++, kmId: cand.kmId, tripped:false, set:(d.relaySet || 25), tested:false,
                  tag:d.tag || nextTag('KK') };
      state.relays.push(r);
      log('Тепловое реле '+tagOf('kk'+r.id)+' посажено щупами на зажимы 2 T1 / 4 T2 / 6 T3 пускателя '+tagOf(cand.kmId)+'. Своя DIN-рейка не нужна.', 'ok');
    } else {
      const dev = { id: d.id || state.nextId++, type:d.type, rail:cand.rail, slot:cand.slot,
                    on:false, tripped:false, coil:false, tag:d.tag || nextDeviceTag(d.type) };
      if(cand.free){dev.x=cand.x;dev.y=cand.y;delete dev.rail;delete dev.slot;}
      if (d.type === 'lamp'){
        dev.indicator = d.indicator || nextLampIndicator();
      }
      if (d.type === 'timer'){
        dev.timerRange=10;dev.timerLevel=0.5;dev.timerMode='on';
        dev.timerActive=false;dev.timerSupply=false;dev.timerSince=null;dev.timerLastSignal=false;
      }
      if (d.type === 'meter'){
        dev.energyKwh=0;dev.meterPowerW=0;dev.meterPulse=false;
      }
      if (d.type === 'sensor'){
        dev.sensorVoltage=0;dev.sensorCurrentA=0;
      }
      if (d.type === 'wallSwitch'){
        dev.gangs=1;dev.switchOn1=false;dev.switchOn2=false;
        dev.ratedVoltage=220;dev.ratedCurrent=10;
      }
      if (d.type === 'twoWaySwitch'){
        dev.switchPosition=1;dev.ratedVoltage=220;dev.ratedCurrent=10;
      }
      if (d.type === 'mcb1'||d.type === 'mcb3'){
        dev.breakerType=d.type==='mcb3'?'C25':'C10';
      }
      if (TYPES[d.type].kind === 'appliance'){
        dev.applianceOn=false;dev.applianceBurned=false;
        dev.ratedVoltage=220;dev.ratedPower=TYPES[d.type].defaultPower;
        syncApplianceRatings(dev);
      }
      if (d.type === 'vfd'){
        dev.ratedVoltage=380;dev.ratedCurrent=10;dev.baseFrequency=50;dev.maxFrequency=100;
        dev.setFrequency=50;dev.running=false;dev.reverse=false;dev.fault=false;
        dev.vfdInputReady=false;dev.vfdOutputActive=false;
      }
      state.devices.push(dev);
      const placement = TYPES[d.type].title
          + (cand.free ? ' — свободное размещение на рабочем поле.'
                       : ' — рейка ' + mountingRailTitle(cand.rail) + ', позиция ' + (cand.slot+1));
      if (d.id) trace('Аппарат перемещён: ' + placement);   // перенос по полю — рутина
      else log('Установлен: ' + placement, 'ok');
      if (d.attachedRelay){                    // реле едет вместе с пускателем
        state.relays.push({ id: state.nextId++, kmId: dev.id, tripped:d.attachedRelay.tripped,
                            set:d.attachedRelay.set, tested:true, tag:d.attachedRelay.tag || nextTag('KK') });
      }
    }
    if (underLoad) warn('Аппарат снят с рейки под нагрузкой. В реальности это недопустимо: сначала отключите его.');
  } else if (cand && !cand.ok){
    if (d.relayId) log('Тепловое реле снято с пускателя и возвращено в лоток.', 'info');
    else if (d.id) log('Не удалось установить: место занято. ' + TYPES[d.type].title + ' возвращён в лоток.', 'warn');
  } else if (d.id){
    if (d.relayId) log('Тепловое реле KK1 снято с пускателя и возвращено в лоток.', 'info');
    else log('Аппарат снят с DIN-рейки: ' + TYPES[d.type].title
        + (d.attachedRelay ? ' вместе с тепловым реле' : '')
        + (underLoad ? ' (под нагрузкой — недопустимо!)' : ''), underLoad ? 'err' : 'info');
  }
  renderAll();
}

document.addEventListener('pointermove', onPointerMove);
document.addEventListener('pointerup', onPointerUp);

/* Перетаскивание крупных объектов из лотка на свободное место рабочего поля. */
let specialTrayDrag=null;
function specialGhostSize(key){
  if(key==='panel')return {w:PANEL.width,h:panelHeight({railCount:2})};
  if(key==='clamp')return {w:172,h:72};
  if(key==='motor'||key==='dcmotor')return {w:MOTOR.w*MOTOR.scale,h:MOTOR.h*MOTOR.scale};
  if(key==='pushbutton')return {w:PB.w+48,h:PB.h};
  if(key==='multimeter')return {w:METER.w,h:METER.h+28};
  if(key==='inbox')return {w:inboxWidth(),h:INBOX.h};
  return {w:180,h:120};
}
function placeSpecialGhost(evt,d){
  d.ghost.style.left=(evt.clientX-d.screenW/2)+'px';
  d.ghost.style.top=(evt.clientY-d.screenH/2)+'px';
}
function startSpecialTrayDrag(evt,key){
  evt.preventDefault();cancelWire();
  const ghost=document.createElement('div');
  ghost.className='ghost special-ghost';ghost.innerHTML=specialTrayPreview(key);
  const size=specialGhostSize(key),k=sceneScale();
  const screenW=size.w*k,screenH=size.h*k;
  ghost.style.width=screenW+'px';ghost.style.height=screenH+'px';
  document.body.appendChild(ghost);
  specialTrayDrag={pointerId:evt.pointerId,key:key,sx:evt.clientX,sy:evt.clientY,moved:false,
                   ghost:ghost,screenW:screenW,screenH:screenH};
  placeSpecialGhost(evt,specialTrayDrag);
}
document.addEventListener('pointermove',function(evt){
  const d=specialTrayDrag;if(!d||evt.pointerId!==d.pointerId)return;
  if(Math.hypot(evt.clientX-d.sx,evt.clientY-d.sy)>4)d.moved=true;
  placeSpecialGhost(evt,d);
});
function finishSpecialTrayDrag(evt){
  const d=specialTrayDrag;if(!d||(evt.pointerId!==undefined&&evt.pointerId!==d.pointerId))return;
  specialTrayDrag=null;d.ghost.remove();
  const rect=scene.getBoundingClientRect();
  const overScene=evt.clientX>=rect.left&&evt.clientX<=rect.right&&evt.clientY>=rect.top&&evt.clientY<=rect.bottom;
  if(d.moved&&!overScene){renderTray();return;}
  if(d.key==='panel'){
    const p=d.moved?svgPoint(evt):svgPoint({clientX:rect.left+rect.width*.5,clientY:rect.top+rect.height*.5});
    const n=nextSpecialNumber(state.panels,'PN');
    const withInbox=!state.special.inbox;
    state.panels.push({id:'PN'+n,tag:'ЩР'+n,railCount:2,x:p.x-PANEL.width/2,y:p.y-panelHeight({railCount:2})/2,inbox:withInbox,inletVoltage:380});
    if(withInbox)state.special.inbox=true;
    renderAll();return;
  }
  if(d.key==='clamp'){
    const p=d.moved?svgPoint(evt):svgPoint({clientX:rect.left+rect.width*.35,clientY:rect.top+rect.height*.3});
    const clamp=createClamp(p.x-50,p.y);
    const hit=clampNearestWire(clamp);
    if(hit){clamp.wireId=hit.id;clamp.fraction=hit.fraction;clamp.x=hit.x;clamp.y=hit.y;}
    renderClamp();renderTray();return;
  }
  if(d.moved){
    const p=svgPoint(evt);
    if(d.key==='motor'){
      const n=nextSpecialNumber(state.motors,'M');
      state.motors.push({id:'M'+n,tag:'M'+n,x:p.x-MOTOR.w*MOTOR.scale/2,y:p.y-MOTOR.h*MOTOR.scale/2,
        w:MOTOR.w,h:MOTOR.h,scale:MOTOR.scale,load:0,rpmActual:0,angle:0,
        polePairs:2,ratedSlipPercent:10,ratedFrequency:50,ratedVoltage:380,ratedCurrent:9,ratedPower:4});
    }
    else if(d.key==='dcmotor'){
      const n=nextSpecialNumber(state.motors,'MD');
      state.motors.push(newDcMotor('MD'+n,p.x-MOTOR.w*MOTOR.scale/2,p.y-MOTOR.h*MOTOR.scale/2));
    }
    else if(d.key==='pushbutton'){
      const n=nextSpecialNumber(state.pushbuttons,'PB'),first=(n-1)*3+1;
      state.pushbuttons.push({id:'PB'+n,tag:'SB'+first+'–SB'+(first+2),x:p.x-PB.w/2,y:p.y-PB.h/2,w:PB.w,h:PB.h,buttons:{up:false,stop:false,down:false}});
    }
    else if(d.key==='inbox'){INBOX.x=p.x-inboxWidth()/2;INBOX.y=p.y-INBOX.h/2;}
    else if(d.key==='multimeter'){
      METER.x=p.x-METER.w/2;METER.y=p.y-(METER.h-28)/2;
      METER.redX=METER.x+158;METER.redY=METER.y-58;
      METER.blackX=METER.x+72;METER.blackY=METER.y-58;
    }
  }
  if(d.key!=='motor'&&d.key!=='dcmotor'&&d.key!=='pushbutton')state.special[d.key]=true;
  const what=d.key==='dcmotor'?'Машина постоянного тока':(d.key==='motor'?'Асинхронный двигатель':'Объект');
  log(what+' установлен из лотка на рабочее поле.','ok');
  renderAll();
}
document.addEventListener('pointerup',finishSpecialTrayDrag);
document.addEventListener('pointercancel',finishSpecialTrayDrag);

/* перетаскивание из лотка */
document.getElementById('tray').addEventListener('pointerdown', function(evt){
  const item = evt.target.closest('.tray-item');
  if (!item) return;
  if(evt.target.closest('.tray-add')||(evt.pointerType==='touch'&&!evt.touchReplay))return;
  if (evt.button !== 0) return;
  if(item.dataset.special){
    startSpecialTrayDrag(evt,item.dataset.special);
    return;
  }
  startDrag(evt, { type: item.dataset.type });
});

/* Свободное перемещение установленного аппарата. Его клеммы остаются теми же,
   поэтому все подключённые провода перестраиваются вслед за корпусом. */
let freeDeviceDrag = null;
function startFreeDeviceDrag(evt, dev, offX, offY){
  evt.preventDefault();
  cancelWire();
  const o = originOf(dev);
  freeDeviceDrag = { pointerId:evt.pointerId, devId:dev.id, type:dev.type, offX:offX, offY:offY,
                     sx:evt.clientX, sy:evt.clientY, moved:false, startX:o.x, startY:o.y };
}
function computeFreeRailCandidate(evt, fd){
  const p = svgPoint(evt), t = TYPES[fd.type];
  if (!isFinite(p.x) || !isFinite(p.y)) return null;
  if(t.freeOnly)return null;
  const left = p.x-fd.offX, top = p.y-fd.offY, centerY = top+t.h/2;
  return railPlacement(left,centerY,t.modules,fd.devId);
}
document.addEventListener('pointermove', function(evt){
  if (!freeDeviceDrag || evt.pointerId !== freeDeviceDrag.pointerId) return;
  const p = svgPoint(evt), d = devById(freeDeviceDrag.devId);
  if (!d) return;
  if (!freeDeviceDrag.moved && Math.hypot(evt.clientX-freeDeviceDrag.sx, evt.clientY-freeDeviceDrag.sy) <= 4) return;
  freeDeviceDrag.moved = true;
  d.x = p.x-freeDeviceDrag.offX;
  d.y = p.y-freeDeviceDrag.offY;
  freeDeviceDrag.candidate = computeFreeRailCandidate(evt, freeDeviceDrag);
  renderDevices();
  renderRelays();
  renderWires();
  renderTerminals();
});
function finishFreeDeviceDrag(evt){
  if (!freeDeviceDrag || (evt.pointerId !== undefined && evt.pointerId !== freeDeviceDrag.pointerId)) return;
  const d = devById(freeDeviceDrag.devId), moved = freeDeviceDrag.moved;
  const candidate = freeDeviceDrag.candidate;
  if (moved && d && candidate && candidate.ok){
    d.rail = candidate.rail;
    d.slot = candidate.slot;
    delete d.x;
    delete d.y;
    log('Аппарат установлен на DIN-рейку '+mountingRailTitle(candidate.rail)+', позиция '+(candidate.slot+1)+'.', 'ok');
  }
  freeDeviceDrag = null;
  if (!moved && d) toggleDevice(d);
  else {
    renderDevices();
    renderRelays();
    renderWires();
    renderTerminals();
  }
}
document.addEventListener('pointerup', finishFreeDeviceDrag);
document.addEventListener('pointercancel', finishFreeDeviceDrag);

/* Удержание ▲/▼: первый шаг выполняется сразу, непрерывное изменение начинается
   после короткой паузы и прекращается при отпускании кнопки в любом месте окна. */
let vfdFrequencyHold=null;
function releaseVfdFrequencyHold(evt){
  const hold=vfdFrequencyHold;
  if(!hold||(evt&&evt.pointerId!==undefined&&evt.pointerId!==hold.pointerId))return;
  vfdFrequencyHold=null;
  clearTimeout(hold.delayTimer);clearInterval(hold.repeatTimer);
  const dev=devById(hold.devId);
  if(dev&&dev.vfdPressToken===hold.pressToken)delete dev.vfdPressed;
  renderDevices();
}
function startVfdFrequencyHold(evt,dev,control,pressToken){
  if(vfdFrequencyHold)releaseVfdFrequencyHold();
  dev.vfdPressed=control;
  const hold={pointerId:evt.pointerId,devId:dev.id,control:control,pressToken:pressToken,delayTimer:null,repeatTimer:null};
  vfdFrequencyHold=hold;
  hold.delayTimer=setTimeout(function(){
    if(vfdFrequencyHold!==hold)return;
    hold.repeatTimer=setInterval(function(){
      if(vfdFrequencyHold!==hold)return;
      const current=devById(hold.devId);
      if(!current){releaseVfdFrequencyHold();return;}
      if(changeVfdFrequency(current,hold.control==='up'?1:-1))renderAll();
    },90);
  },360);
}
document.addEventListener('pointerup',releaseVfdFrequencyHold);
document.addEventListener('pointercancel',releaseVfdFrequencyHold);

/* То же удержание для уставки напряжения якоря тиристорного преобразователя. */
let tpVoltageHold=null;
function releaseTpVoltageHold(evt){
  const hold=tpVoltageHold;
  if(!hold||(evt&&evt.pointerId!==undefined&&evt.pointerId!==hold.pointerId))return;
  tpVoltageHold=null;
  clearTimeout(hold.delayTimer);clearInterval(hold.repeatTimer);
  const dev=devById(hold.devId);
  if(dev&&dev.tpPressToken===hold.pressToken)delete dev.tpPressed;
  renderDevices();
}
function startTpVoltageHold(evt,dev,control,pressToken){
  if(tpVoltageHold)releaseTpVoltageHold();
  dev.tpPressed=control;
  const hold={pointerId:evt.pointerId,devId:dev.id,control:control,pressToken:pressToken,delayTimer:null,repeatTimer:null};
  tpVoltageHold=hold;
  hold.delayTimer=setTimeout(function(){
    if(tpVoltageHold!==hold)return;
    hold.repeatTimer=setInterval(function(){
      if(tpVoltageHold!==hold)return;
      const current=devById(hold.devId);
      if(!current){releaseTpVoltageHold();return;}
      if(changeTpArmatureVoltage(current,hold.control==='up'?10:-10))renderAll();
    },90);
  },360);
}
document.addEventListener('pointerup',releaseTpVoltageHold);
document.addEventListener('pointercancel',releaseTpVoltageHold);

/* перетаскивание / клик по установленному аппарату */
deviceLayer.addEventListener('pointerdown', function(evt){
  const g = evt.target.closest('.dev');
  if (!g) return;
  if (evt.button !== 0) return;                 // средняя кнопка — панорамирование, ПКМ — снятие
  if(evt.target.closest('[data-zone="manual-contactor"]'))return;
  const id = +g.dataset.id;
  const dev = state.devices.filter(function(d){ return d.id === id; })[0];
  if (!dev) return;
  const applianceToggle=evt.target.closest('[data-appliance-toggle]');
  if(TYPES[dev.type].kind==='appliance'&&applianceToggle){
    evt.preventDefault();evt.stopPropagation();cancelWire();
    if(dev.applianceBurned){warn(tagOf(dev.id)+': прибор повреждён перенапряжением.');return;}
    dev.applianceOn=!dev.applianceOn;
    log(tagOf(dev.id)+': '+TYPES[dev.type].title+' '+(dev.applianceOn?'включён.':'отключён.'),'info');
    renderAll();
    return;
  }
  const twoWayKey=evt.target.closest('[data-two-way-switch]');
  if(dev.type==='twoWaySwitch'&&twoWayKey){
    evt.preventDefault();evt.stopPropagation();cancelWire();
    dev.switchPosition=Number(dev.switchPosition)===2?1:2;
    log(tagOf(dev.id)+': общий контакт L переключён на выход '+dev.switchPosition+'.','info');
    renderAll();
    return;
  }
  const switchKey=evt.target.closest('[data-switch-key]');
  if(dev.type==='wallSwitch'&&switchKey){
    evt.preventDefault();evt.stopPropagation();cancelWire();
    const key=Number(switchKey.getAttribute('data-switch-key'))===2?2:1;
    if(key===2&&Number(dev.gangs)!==2)return;
    if(key===1)dev.switchOn1=!dev.switchOn1;
    else dev.switchOn2=!dev.switchOn2;
    log(tagOf(dev.id)+': клавиша '+key+' '+((key===1?dev.switchOn1:dev.switchOn2)?'включена':'отключена')+'.','info');
    renderAll();
    return;
  }
  const vfdControl=evt.target.closest('[data-vfd-control]');
  if(dev.type==='vfd'&&vfdControl){
    evt.preventDefault();evt.stopPropagation();cancelWire();
    const control=vfdControl.getAttribute('data-vfd-control');
    const pressToken=(Number(dev.vfdPressToken)||0)+1;
    dev.vfdPressToken=pressToken;dev.vfdPressed=control;
    if(control==='stop'){
      dev.running=false;
      if(dev.fault){dev.fault=false;log(tagOf(dev.id)+': авария сброшена, преобразователь остановлен.','ok');}
      else log(tagOf(dev.id)+': команда STOP, выходное напряжение снято.','info');
    }else if(control==='run'){
      const input=vfdInputState(dev,potentialMap().pot);
      if(!input.ready){dev.running=false;warn('На входы R/L1, S/L2 и T/L3 нужно подать исправную трёхфазную сеть.');log(tagOf(dev.id)+': RUN отклонён — трёхфазный вход не готов.','warn');}
      else if(dev.fault){warn('Сначала сбросьте аварию кнопкой STOP.');}
      else{dev.running=true;log(tagOf(dev.id)+': RUN — сформирован трёхфазный выход '+vfdSetFrequency(dev).toFixed(1)+' Гц.','ok');}
    }else if(control==='reverse'){
      dev.reverse=!dev.reverse;
      log(tagOf(dev.id)+': направление выхода '+(dev.reverse?'обратное':'прямое')+'.','info');
    }else if(control==='up')changeVfdFrequency(dev,1);
    else if(control==='down')changeVfdFrequency(dev,-1);
    renderAll();
    if(control==='up'||control==='down')startVfdFrequencyHold(evt,dev,control,pressToken);
    else setTimeout(function(){
        const current=devById(dev.id);
        if(!current||current.vfdPressToken!==pressToken)return;
        delete current.vfdPressed;
        renderDevices();
      },140);
    return;
  }
  const tpControl=evt.target.closest('[data-tp-control]');
  if(dev.type==='tp'&&tpControl){
    evt.preventDefault();evt.stopPropagation();cancelWire();
    const control=tpControl.getAttribute('data-tp-control');
    const pressToken=(Number(dev.tpPressToken)||0)+1;
    dev.tpPressToken=pressToken;dev.tpPressed=control;
    const input=tpInputState(dev,potentialMap().pot);
    if(control==='mains'){
      dev.tpOn=!dev.tpOn;
      if(!input.ready)log(tagOf(dev.id)+': выход якоря '+(dev.tpOn?'включён':'отключён')+', но трёхфазный вход не готов — напряжения на якоре не будет.','warn');
      else log(tagOf(dev.id)+': выход якоря '+(dev.tpOn?'включён':'отключён')+', уставка '+tpSetArmatureVoltage(dev).toFixed(0)+' В. Возбуждение '+tpFieldVoltage(dev).toFixed(0)+' В.','ok');
    }else if(control==='up')changeTpArmatureVoltage(dev,10);
    else if(control==='down')changeTpArmatureVoltage(dev,-10);
    if(control==='up'||control==='down')log(tagOf(dev.id)+': уставка напряжения якоря '+tpSetArmatureVoltage(dev).toFixed(0)+' В.','info');
    renderAll();
    if(control==='up'||control==='down')startTpVoltageHold(evt,dev,control,pressToken);
    else setTimeout(function(){
        const current=devById(dev.id);
        if(!current||current.tpPressToken!==pressToken)return;
        delete current.tpPressed;
        renderDevices();
      },140);
    return;
  }
  const rcdTest = evt.target.closest('[data-rcd-test]');
  if (dev.type === 'rcd' && rcdTest){
    evt.preventDefault(); evt.stopPropagation(); cancelWire();
    if (!dev.on){
      log(tagOf(dev.id)+': TEST не сработал — сначала включите УЗО.', 'warn');
      warn('Сначала включите УЗО, затем нажмите TEST.');
      return;
    }
    const map = potentialMap();
    const va = map.pot[nodeKey({devId:dev.id,key:'tL'})];
    const vn = map.pot[nodeKey({devId:dev.id,key:'tN'})];
    const voltage = va && vn ? Math.hypot(va.r-vn.r,va.i-vn.i) : 0;
    const nominal= ratedVoltageOf(dev,220);
    if (!voltageIsOperating(voltage,dev,220)){
      log(tagOf(dev.id)+': TEST не сработал — входное напряжение не соответствует номиналу '+Math.round(nominal)+' В.', 'warn');
      warn('TEST УЗО требует напряжение около '+Math.round(nominal)+' В между входами 1 и N.');
      return;
    }
    dev.tripped = true;
    dev.on = false;
    dev.rcdLeakageMa = 30;
    playBreakerSound(false, true);           // УЗО сработало от контрольного тока кнопки TEST
    log(tagOf(dev.id)+': кнопка TEST создала контрольный ток утечки — УЗО сработало, полюса 1–2 и N–N разомкнуты.', 'ok');
    warn('УЗО сработало от кнопки TEST. Для взвода щёлкните по рукоятке.');
    renderAll();
    return;
  }
  const timerControl=evt.target.closest('[data-timer-control]');
  if (dev.type==='timer' && timerControl){
    evt.preventDefault();evt.stopPropagation();cancelWire();
    const control=timerControl.getAttribute('data-timer-control');
    if(control==='range')dev.timerRange=TIMER_RANGES[(TIMER_RANGES.indexOf(dev.timerRange)+1)%TIMER_RANGES.length];
    if(control==='level')dev.timerLevel=TIMER_LEVELS[(TIMER_LEVELS.indexOf(dev.timerLevel)+1)%TIMER_LEVELS.length];
    if(control==='mode')dev.timerMode=TIMER_MODES[(TIMER_MODES.indexOf(dev.timerMode)+1)%TIMER_MODES.length];
    dev.timerSince=null;dev.timerLastSignal=false;dev.timerActive=false;
    const modeName=dev.timerMode==='on'?'задержка включения':(dev.timerMode==='off'?'задержка отключения':'импульс');
    log(tagOf(dev.id)+': '+modeName+', выдержка '+(timerDelayMs(dev)/1000).toFixed(2)+' с.', 'info');
    renderAll();
    return;
  }
  const zone = evt.target.closest('[data-zone]');   // щелчок по выводам катушки A1–A2
  if (zone && zone.getAttribute('data-zone') === 'coil'){
    evt.preventDefault();
    const u = coilVoltage(dev);
    log(tagOf(dev.id)+': выводы катушки A1–A2, напряжение ' + (Math.round(u/10)*10) + ' В. '
      + 'Пускатель срабатывает, когда напряжение соответствует номиналу '+Math.round(ratedVoltageOf(dev,220))+' В.', 'info');
    return;
  }
  const p = svgPoint(evt), o = originOf(dev);
  startFreeDeviceDrag(evt, dev, p.x-o.x, p.y-o.y);
});

/* Ручное механическое нажатие на жёлтую траверсу пускателя.
   Контакты остаются переключёнными только пока удерживается левая кнопка мыши. */
let manualContactorPress=null;
deviceLayer.addEventListener('pointerdown',function(evt){
  const plate=evt.target.closest('[data-zone="manual-contactor"]');
  if(!plate||evt.button!==0)return;
  const g=plate.closest('.dev'),km=g&&devById(+g.dataset.id);
  if(!km||km.type!=='km1')return;
  evt.preventDefault();evt.stopPropagation();cancelWire();
  manualContactorPress={pointerId:evt.pointerId,devId:km.id};
  km.manualPressed=true;
  updateCoils();
  renderAll();
});
function releaseManualContactor(evt){
  if(!manualContactorPress||(evt&&evt.pointerId!==undefined&&evt.pointerId!==manualContactorPress.pointerId))return;
  const km=devById(manualContactorPress.devId);
  manualContactorPress=null;
  if(!km)return;
  km.manualPressed=false;
  updateCoils();
  renderAll();
}
document.addEventListener('pointerup',releaseManualContactor);
document.addEventListener('pointercancel',releaseManualContactor);

/* двигатель можно свободно перемещать за корпус; клеммы и провода следуют за ним */
let motorDrag = null;
motorLayer.addEventListener('pointerdown', function(evt){
  const body = evt.target.closest('.motor-draggable');
  if (!body || evt.button !== 0) return;
  evt.preventDefault();
  const p = svgPoint(evt);
  const motor=motorById(body.dataset.dev);if(!motor)return;
  motorDrag = { pointerId:evt.pointerId, id:motor.id, offX:p.x-motor.x, offY:p.y-motor.y };
  body.style.cursor = 'grabbing';
});
document.addEventListener('pointermove', function(evt){
  if (!motorDrag || evt.pointerId !== motorDrag.pointerId) return;
  const p = svgPoint(evt);
  const motor=motorById(motorDrag.id);if(!motor)return;
  motor.x = p.x-motorDrag.offX;
  motor.y = p.y-motorDrag.offY;
  renderMotor();
  renderWires();
  renderTerminals();
});
function finishMotorDrag(evt){
  if (!motorDrag || (evt.pointerId !== undefined && evt.pointerId !== motorDrag.pointerId)) return;
  motorDrag = null;
  renderMotor();
}
document.addEventListener('pointerup', finishMotorDrag);
document.addEventListener('pointercancel', finishMotorDrag);

function updateMotorReadout(){
  if(!state.motors.length){updateMotorSound(0);return;}
  let soundRpm=0,soundDir=0;
  state.motors.forEach(function(motor){
    const input=motorLayer.querySelector('.motor-load[data-mid="'+motor.id+'"]');
    const box=input&&input.closest('.motor-load-control');
    const visualDir=Math.abs(motor.rpmActual||0)>1?Math.sign(motor.rpmActual):0;
    if(motorIsDc(motor)){
      const operating=dcMotorOperatingPoint(motor);
      const rpm=Math.round(Math.abs(motor.rpmActual||0));
      if(box){
        const set=function(sel,text){const el=box.querySelector(sel);if(el)el.textContent=text;};
        set('.motor-load-value',operating.load.toFixed(0)+' %');
        set('.motor-rpm-value',rpm+' об/мин');
        set('.motor-armature-voltage',(operating.armaturePresent?operating.armatureVoltage.toFixed(0):'—')+' В');
        set('.motor-armature-current',(operating.armaturePresent?operating.armatureCurrent.toFixed(1):'—')+' А');
        set('.motor-emf-value',(operating.armaturePresent?operating.emf.toFixed(0):'—')+' В');
        set('.motor-field-current',operating.fieldCurrent.toFixed(2)+' А');
        set('.motor-torque-value',(operating.armaturePresent?operating.torque.toFixed(1):'—')+' Н·м');
      }
      if(rpm>soundRpm){soundRpm=rpm;soundDir=visualDir;}
      return;
    }
    const direction=motorPhaseDirection(motor),operating=motorVisualOperating(motor,direction);
    const relay=motorSupplyRelay(motor),heat=relay?Math.round((relay.heat||0)*100):0;
    if(box){const a=box.querySelector('.motor-load-value'),b=box.querySelector('.motor-rpm-value'),c=box.querySelector('.motor-current-value'),d=box.querySelector('.motor-heat-value'),e=box.querySelector('.motor-frequency-value');if(a)a.textContent=operating.load.toFixed(0)+' %';if(b)b.textContent=operating.rpm+' об/мин';if(c)c.textContent=operating.current.toFixed(1)+' А';if(d)d.textContent=heat+' %';if(e)e.textContent=operating.frequencyHz.toFixed(1)+' Гц';}
    if(operating.rpm>soundRpm){soundRpm=operating.rpm;soundDir=visualDir;}
  });
  updateMotorSound(soundDir,soundRpm);
}
motorLayer.addEventListener('pointerdown', function(evt){
  if (evt.target && evt.target.closest && evt.target.closest('.motor-load-control')) evt.stopPropagation();
});
motorLayer.addEventListener('input', function(evt){
  if (!evt.target || !evt.target.classList.contains('motor-load')) return;
  const motor=motorById(evt.target.dataset.mid);if(!motor)return;
  motor.load = Math.max(0, Math.min(100, Number(evt.target.value) || 0));
  updateMotorReadout();
});

/* Инерция ротора: разгон примерно 2,7 с, свободный выбег около 3,2 с. */
let motorInertiaLast=performance.now();
function motorInertiaTick(){
  const now=performance.now(),dt=Math.min(.15,Math.max(0,(now-motorInertiaLast)/1000));
  motorInertiaLast=now;
  if(!state.motors.length){updateMotorSound(0);return;}
  let rerender=false;
  state.motors.forEach(function(motor){
    if(motorIsDc(motor)){ dcMotorInertiaStep(motor,dt); return; }
    const electricalDirection=motorPhaseDirection(motor),targetPoint=motorOperatingPoint(motor,electricalDirection);
    let target=electricalDirection*targetPoint.rpm;
    const before=motor.rpmActual||0,oldSign=Math.abs(before)>1?Math.sign(before):0;
    if(before&&target&&Math.sign(before)!==Math.sign(target))target=0;
    const rate=Math.abs(target)>Math.abs(before)?500:420,step=rate*dt;
    let next=before;if(Math.abs(target-before)<=step)next=target;else next+=Math.sign(target-before)*step;
    if(Math.abs(next)<1&&target===0)next=0;motor.rpmActual=next;
    if(oldSign!==(Math.abs(next)>1?Math.sign(next):0))rerender=true;
  });
  if(rerender)renderMotor();else updateMotorReadout();
}
setInterval(motorInertiaTick,50);

/* Непрерывное покадровое вращение без перезапуска анимации при изменении оборотов. */
let motorFrameLast=performance.now();
function motorRotationFrame(now){
  const dt=Math.min(.08,Math.max(0,(now-motorFrameLast)/1000));
  motorFrameLast=now;
  state.motors.forEach(function(motor){if(Math.abs(motor.rpmActual||0)>.1){motor.angle=(motor.angle+(motor.rpmActual||0)*1.5*dt)%360;const body=motorLayer.querySelector('.motor-draggable[data-dev="'+motor.id+'"]');const rotor=body&&body.querySelector('.motor-rotor');if(rotor)rotor.setAttribute('transform','rotate('+motor.angle.toFixed(3)+' 116 99)');}});
  requestAnimationFrame(motorRotationFrame);
}
requestAnimationFrame(motorRotationFrame);

/* Ввод внутри щита переносит весь щит; ввод из старых схем движется отдельно. */
let inboxDrag = null;
boxLayer.addEventListener('pointerdown', function(evt){
  const body = evt.target.closest('.inbox-draggable');
  if (!body || evt.button !== 0) return;
  const panel=inboxPanel();
  if(panel){startPanelDrag(evt,panel);return;}
  evt.preventDefault();
  cancelWire();
  const p = svgPoint(evt);
  inboxDrag = { pointerId:evt.pointerId, offX:p.x-INBOX.x, offY:p.y-INBOX.y };
  body.style.cursor = 'grabbing';
});
document.addEventListener('pointermove', function(evt){
  if (!inboxDrag || evt.pointerId !== inboxDrag.pointerId) return;
  const p = svgPoint(evt);
  INBOX.x = p.x-inboxDrag.offX;
  INBOX.y = p.y-inboxDrag.offY;
  renderInbox();
  renderWires();
  renderTerminals();
});
function finishInboxDrag(evt){
  if (!inboxDrag || (evt.pointerId !== undefined && evt.pointerId !== inboxDrag.pointerId)) return;
  inboxDrag = null;
  renderInbox();
}
document.addEventListener('pointerup', finishInboxDrag);
document.addEventListener('pointercancel', finishInboxDrag);

/* кнопочный пост свободно перемещается за корпус, кроме областей самих кнопок */
let pushStationDrag = null;
deviceLayer.addEventListener('pointerdown', function(evt){
  const station = evt.target.closest('.push-station');
  if (!station || evt.button !== 0 || evt.target.closest('[data-pb]')) return;
  evt.preventDefault();
  const p = svgPoint(evt);
  const pb=pushbuttonById(station.dataset.dev);if(!pb)return;
  pushStationDrag = { pointerId:evt.pointerId, id:pb.id, offX:p.x-pb.x, offY:p.y-pb.y };
  station.style.cursor = 'grabbing';
});
document.addEventListener('pointermove', function(evt){
  if (!pushStationDrag || evt.pointerId !== pushStationDrag.pointerId) return;
  const p = svgPoint(evt);
  const pb=pushbuttonById(pushStationDrag.id);if(!pb)return;
  pb.x = p.x-pushStationDrag.offX;
  pb.y = p.y-pushStationDrag.offY;
  renderDevices();
  renderWires();
  renderTerminals();
});
function finishPushStationDrag(evt){
  if (!pushStationDrag || (evt.pointerId !== undefined && evt.pointerId !== pushStationDrag.pointerId)) return;
  pushStationDrag = null;
  renderDevices();
}
document.addEventListener('pointerup', finishPushStationDrag);
document.addEventListener('pointercancel', finishPushStationDrag);

/* кнопочный пост: контакт действует, пока пользователь удерживает кнопку мыши */
let activePushbutton = null;
deviceLayer.addEventListener('pointerdown', function(evt){
  const hit = evt.target.closest('[data-pb]');
  if (!hit || evt.button !== 0) return;
  evt.preventDefault();
  evt.stopPropagation();
  const key = hit.getAttribute('data-pb');
  const station=hit.closest('.push-station'),pb=station&&pushbuttonById(station.dataset.dev);
  if (!pb||!(key in pb.buttons)) return;
  activePushbutton = {id:pb.id,key:key};
  pb.buttons[key] = true;
  renderAll();
});
document.addEventListener('pointerup', function(){
  if (!activePushbutton) return;
  const pb=pushbuttonById(activePushbutton.id);if(pb)pb.buttons[activePushbutton.key]=false;
  activePushbutton = null;
  renderAll();
});
document.addEventListener('pointercancel', function(){
  if (!activePushbutton) return;
  const pb=pushbuttonById(activePushbutton.id);if(pb)pb.buttons[activePushbutton.key]=false;
  activePushbutton = null;
  renderAll();
});

/* тепловое реле: кнопки лимба/RESET/TEST и перетаскивание */
let relayButtonDown = null;
relayLayer.addEventListener('pointerdown', function(evt){
  const g = evt.target.closest('.relay');
  if (!g) return;
  if (evt.button !== 0) return;
  const rel = anyRelayById(+g.dataset.rid);
  if (!rel) return;

  const zone = evt.target.closest('[data-zone]');
  if (zone){
    evt.preventDefault();
    const z = zone.getAttribute('data-zone');
    if (z === 'dial') cycleSetpoint(rel);
    else if (z === 'test' || z === 'reset'){
      const button = g.querySelector(z === 'test' ? '.relay-test' : '.relay-reset');
      if (button) button.classList.add('is-down');
      relayButtonDown = { relayId:rel.id, action:z, button:button };
    }
    return;
  }
  const km = devById(rel.kmId);
  if (!km) return;
  const p = svgPoint(evt), ko = originOf(km);
  // Тепловое реле физически установлено на пускателе, поэтому за его корпус
  // перемещается вся сборка, а провода обоих аппаратов сохраняются.
  startFreeDeviceDrag(evt, km, p.x-ko.x, p.y-ko.y);
});

document.addEventListener('pointerup', function(){
  if (!relayButtonDown) return;
  const press = relayButtonDown;
  relayButtonDown = null;
  if (press.button) press.button.classList.remove('is-down');
  const rel = anyRelayById(press.relayId);
  if (!rel) return;
  if (press.action === 'test') testRelay(rel);
  else if (press.action === 'reset') resetRelay(rel);
});
document.addEventListener('pointercancel', function(){
  if (!relayButtonDown) return;
  if (relayButtonDown.button) relayButtonDown.button.classList.remove('is-down');
  relayButtonDown = null;
});

/* Единое контекстное меню объектов */
const objectMenuEl=document.getElementById('objectMenu');
let objectMenuTarget=null;
function hideObjectMenu(){
  if(objectMenuEl)objectMenuEl.style.display='none';
  objectMenuTarget=null;
}
function showObjectMenu(evt,target){
  evt.preventDefault();evt.stopPropagation();hideWireMenu();
  objectMenuTarget=target;
  objectMenuEl.style.display='block';
  objectMenuEl.style.left=Math.max(8,Math.min(evt.clientX,window.innerWidth-objectMenuEl.offsetWidth-8))+'px';
  objectMenuEl.style.top=Math.max(8,Math.min(evt.clientY,window.innerHeight-objectMenuEl.offsetHeight-8))+'px';
}

/* Редактор характеристик. Пока здесь собраны основные паспортные поля;
   перечень можно расширять отдельно для каждого типа аппарата. */
const propertiesModal=document.getElementById('propertiesModal');
const propertiesForm=document.getElementById('propertiesForm');
const propertiesFields=document.getElementById('propertiesFields');
const propertiesTitle=document.getElementById('propertiesTitle');
const propertiesSubtitle=document.getElementById('propertiesSubtitle');
let propertiesTarget=null;
function propertyField(key,label,type,def,unit,min,max,step,wide,options){
  return {key:key,label:label,type:type||'text',def:def,unit:unit||'',min:min,max:max,step:step,wide:!!wide,options:options||[]};
}
function characteristicsFor(target){
  let obj=null,title='',type='';
  if(!target)return null;
  if(target.kind==='device'){
    obj=devById(target.id);if(!obj)return null;
    if(TYPES[obj.type].kind==='appliance')syncApplianceRatings(obj);
    title=tagOf(obj.id);
    if(obj.type==='mcb1'||obj.type==='mcb3'){
      const fallback=obj.type==='mcb3'?'C25':'C10';
      type='Автомат '+(obj.type==='mcb3'?'3P, ':'1P, ')+(obj.breakerType||fallback);
    }else type=obj.customName||TYPES[obj.type].title;
  }else if(target.kind==='relay'){
    obj=anyRelayById(target.id);if(!obj)return null;
    title=tagOf('kk'+obj.id);type='Тепловое реле';
  }else if(target.kind==='special'&&target.key==='motor'){
    obj=motorById(target.id);if(!obj)return null;
    title=obj.tag||obj.id;type='Трёхфазный асинхронный двигатель';
  }else if(target.kind==='special'&&target.key==='dcmotor'){
    obj=motorById(target.id);if(!obj||!motorIsDc(obj))return null;
    title=obj.tag||obj.id;type='Двигатель постоянного тока независимого возбуждения';
  }else if(target.kind==='special'&&target.key==='pushbutton'){
    obj=pushbuttonById(target.id);if(!obj)return null;
    title=obj.tag||'SB';type='Кнопочный пост';
  }else if(target.kind==='special'&&target.key==='inbox'){
    obj=state.specialProps.inbox;title=obj.tag||'XT1';type='Вводная клеммная коробка';
  }else if(target.kind==='special'&&target.key==='multimeter'){
    obj=state.specialProps.multimeter;title=obj.tag||'PV1';type='Цифровой мультиметр';
  }else if(target.kind==='special'&&target.key==='clamp'){
    obj=state.clamps.find(function(c){return c.id===target.id;});if(!obj)return null;
    title=obj.tag||obj.id;type='Токовые клещи';
  }else if(target.kind==='special'&&target.key==='panel'){
    obj=panelById(target.id);if(!obj)return null;
    title=obj.tag||obj.id;type='Монтажный щит';
  }
  if(!obj)return null;
  let fields=[];
  if(target.kind==='device'&&(obj.type==='mcb1'||obj.type==='mcb3')){
    const defaultBreakerType=obj.type==='mcb3'?'C25':'C10';
    fields.push(propertyField('breakerType','Тип автомата','select',obj.breakerType||defaultBreakerType,'',undefined,undefined,undefined,false,[
      {value:'C2',label:'C2 — 2 А'},
      {value:'C4',label:'C4 — 4 А'},
      {value:'C6',label:'C6 — 6 А'},
      {value:'C10',label:'C10 — 10 А'},
      {value:'C13',label:'C13 — 13 А'},
      {value:'C16',label:'C16 — 16 А'},
      {value:'C20',label:'C20 — 20 А'},
      {value:'C25',label:'C25 — 25 А'},
      {value:'C32',label:'C32 — 32 А'},
      {value:'C40',label:'C40 — 40 А'},
      {value:'C50',label:'C50 — 50 А'},
      {value:'C63',label:'C63 — 63 А'}
    ]));
  }
  fields.push(propertyField('tag','Позиционное обозначение','text',title));
  if(target.kind==='special'&&target.key==='panel'&&obj.inbox){
    fields.push(propertyField('inletVoltage','Ввод','select',String(panelInletVoltage(obj)),'',undefined,undefined,undefined,false,[
      {value:'380',label:'380 В — трёхфазный'},
      {value:'220',label:'220 В — однофазный'}
    ]));
  }
  fields.push(propertyField('customName','Наименование','text',type,'',undefined,undefined,undefined,true));
  if(target.kind==='relay'){
    fields.push(propertyField('set','Уставка тока','number',25,'А',1,100,1));
  }else if(target.kind==='special'&&target.key==='motor'){
    fields.push(propertyField('ratedVoltage','Номинальное напряжение','number',380,'В',1,1000,1));
    fields.push(propertyField('ratedCurrent','Номинальный ток','number',9,'А',0.1,1000,0.1));
    fields.push(propertyField('ratedPower','Номинальная мощность','number',4,'кВт',0.1,1000,0.1));
    fields.push(propertyField('ratedFrequency','Номинальная частота','number',50,'Гц',1,400,1));
    fields.push(propertyField('polePairs','Количество пар полюсов','number',2,'',1,20,1));
    fields.push(propertyField('ratedSlipPercent','Номинальное скольжение','number',10,'%',0,95,0.1));
  }else if(target.kind==='special'&&target.key==='dcmotor'){
    fields.push(propertyField('ratedArmatureVoltage','Номинальное напряжение якоря','number',DCM.ratedArmatureVoltage,'В',1,1000,1));
    fields.push(propertyField('ratedArmatureCurrent','Номинальный ток якоря','number',DCM.ratedArmatureCurrent,'А',0.1,1000,0.1));
    fields.push(propertyField('ratedFieldVoltage','Номинальное напряжение возбуждения','number',DCM.ratedFieldVoltage,'В',1,1000,1));
    fields.push(propertyField('ratedSpeed','Номинальная частота вращения','number',DCM.ratedSpeed,'об/мин',1,6000,10));
    fields.push(propertyField('armatureResistance','Сопротивление якоря','number',DCM.armatureResistance,'Ом',0.01,200,0.01));
    fields.push(propertyField('fieldResistance','Сопротивление обмотки возбуждения','number',DCM.fieldResistance,'Ом',1,5000,1));
    fields.push(propertyField('ratedPower','Номинальная мощность','number',DCM.ratedPower,'кВт',0.1,1000,0.1));
    fields.push(propertyField('inertiaFactor','Время разгона до номинала','number',DCM.inertiaFactor,'с',0.05,20,0.05));
  }else if(target.kind==='special'&&target.key==='pushbutton'){
    fields.push(propertyField('ratedVoltage','Номинальное напряжение','number',220,'В',1,1000,1));
    fields.push(propertyField('ratedCurrent','Номинальный ток контактов','number',10,'А',0.1,100,0.1));
  }else if(target.kind==='special'&&target.key==='inbox'){
    fields.push(propertyField('ratedVoltage','Линейное напряжение','number',380,'В',1,1000,1));
    fields.push(propertyField('frequency','Частота сети','number',50,'Гц',1,400,1));
  }else if(target.kind==='special'&&target.key==='multimeter'){
    fields.push(propertyField('measurementCategory','Категория измерений','text','CAT III 600 V','',undefined,undefined,undefined,true));
  }else if(target.kind==='special'&&target.key==='panel'){
    fields.push(propertyField('railCount','Количество DIN-реек','select',String(panelRailCount(obj)),'',undefined,undefined,undefined,false,[
      {value:'1',label:'1 рейка'},{value:'2',label:'2 рейки'},{value:'3',label:'3 рейки'},
      {value:'4',label:'4 рейки'},{value:'5',label:'5 реек'}
    ]));
  }else if(target.kind==='device'){
    const defaults={
      mcb3:[380,25],mcb1:[220,10],rcd:[220,25],meter:[220,60],sensor:[220,80],
      lamp:[220,1],bulb:[220,0.45],outlet:[220,16],wallSwitch:[220,10],twoWaySwitch:[220,10],
      fridge:[220,1.4],washer:[220,10],boiler:[220,9.1],stove:[220,31.8],
      vfd:[380,10],tp:[380,40],km1:[220,25],timer:[220,5]
    }[obj.type];
    if(defaults){
      fields.push(propertyField('ratedVoltage','Номинальное напряжение','number',defaults[0],'В',1,1000,1));
      const appliance=TYPES[obj.type].kind==='appliance';
      const currentDefault=appliance?applianceRatings(obj).ratedCurrent:(obj.type==='mcb1'||obj.type==='mcb3')
        ? Math.max(2,Number(String(obj.breakerType||(obj.type==='mcb3'?'C25':'C10')).replace(/^C/,''))||10)
        : defaults[1];
      const nominalVoltage=ratedVoltageOf(obj,defaults[0]);
      fields.push(propertyField('ratedCurrent','Номинальный ток','number',currentDefault,'А',appliance?1/nominalVoltage:0.01,appliance?30000/nominalVoltage:1000,appliance?'any':0.01));
    }
    if(obj.type==='rcd')fields.push(propertyField('ratedLeakageMa','Дифференциальный ток','number',30,'мА',1,1000,1));
    if(obj.type==='lamp')fields.push(propertyField('indicator','Цвет индикатора','select',obj.indicator||'green','',undefined,undefined,undefined,false,[
      {value:'green',label:'Зелёный'},
      {value:'red',label:'Красный'},
      {value:'yellow',label:'Жёлтый'}
    ]));
    if(obj.type==='lamp'||obj.type==='bulb')fields.push(propertyField('ratedPower','Мощность','number',obj.type==='bulb'?100:1,'Вт',0.1,5000,0.1));
    if(TYPES[obj.type].kind==='appliance')fields.push(propertyField('ratedPower','Мощность','number',TYPES[obj.type].defaultPower,'Вт',1,30000,'any'));
    if(obj.type==='wallSwitch')fields.push(propertyField('gangs','Количество клавиш','select',Number(obj.gangs)===2?'2':'1','',undefined,undefined,undefined,false,[
      {value:'1',label:'Одна клавиша'},
      {value:'2',label:'Две клавиши'}
    ]));
    if(obj.type==='vfd'){
      fields.push(propertyField('baseFrequency','Базовая частота двигателя','number',50,'Гц',1,400,1));
      fields.push(propertyField('maxFrequency','Максимальная частота','number',100,'Гц',1,400,1));
      fields.push(propertyField('setFrequency','Заданная частота','number',50,'Гц',0,400,0.1));
    }
    if(obj.type==='timer')fields.push(propertyField('delaySeconds','Выдержка времени','number',5,'с',0.1,86400,0.1));
    if(obj.type==='tp'){
      fields.push(propertyField('maxArmatureVoltage','Максимальное напряжение якоря','number',220,'В',1,1000,1));
      fields.push(propertyField('setArmatureVoltage','Уставка напряжения якоря','number',0,'В',0,1000,1));
      fields.push(propertyField('fieldVoltage','Напряжение возбуждения','number',220,'В',1,1000,1));
    }
  }
  fields.push(propertyField('note','Примечание','textarea','', '',undefined,undefined,undefined,true));
  return {object:obj,title:title,type:type,fields:fields,target:target};
}
function closeProperties(){
  if(!propertiesModal)return;
  propertiesModal.classList.remove('open');propertiesModal.setAttribute('aria-hidden','true');
  propertiesTarget=null;
}
function openProperties(target){
  const data=characteristicsFor(target);if(!data)return;
  propertiesTarget=data;
  propertiesTitle.textContent='Характеристики '+data.title;
  propertiesSubtitle.textContent=data.type;
  propertiesFields.innerHTML=data.fields.map(function(f){
    const raw=data.object[f.key]!==undefined&&data.object[f.key]!==null?data.object[f.key]:f.def;
    const attrs=f.type==='number'?' type="number"'+(f.min!==undefined?' min="'+f.min+'"':'')+(f.max!==undefined?' max="'+f.max+'"':'')+(f.step!==undefined?' step="'+f.step+'"':''):' type="text"';
    const label='<span>'+escapeHtml(f.label)+(f.unit?' <em>('+escapeHtml(f.unit)+')</em>':'')+'</span>';
    const control=f.type==='textarea'
      ?'<textarea data-property-key="'+f.key+'">'+escapeHtml(raw)+'</textarea>'
      :f.type==='select'
        ?'<select data-property-key="'+f.key+'">'+f.options.map(function(option){return '<option value="'+escapeHtml(option.value)+'"'+(String(option.value)===String(raw)?' selected':'')+'>'+escapeHtml(option.label)+'</option>';}).join('')+'</select>'
        :'<input data-property-key="'+f.key+'"'+attrs+' value="'+escapeHtml(raw)+'">';
    return '<label class="property-field'+(f.wide?' wide':'')+'">'+label+control+'</label>';
  }).join('');
  propertiesModal.classList.add('open');propertiesModal.setAttribute('aria-hidden','false');
  const first=propertiesFields.querySelector('input,select,textarea');if(first)first.focus();
}
propertiesFields.addEventListener('change',function(evt){
  if(!propertiesTarget||!(propertiesTarget.object.type==='mcb1'||propertiesTarget.object.type==='mcb3')||evt.target.getAttribute('data-property-key')!=='breakerType')return;
  const selected=evt.target.value||'C10';
  const amperage=Math.max(2,Number(String(selected).replace(/^C/,''))||10);
  const nameInput=propertiesFields.querySelector('[data-property-key="customName"]');
  const currentInput=propertiesFields.querySelector('[data-property-key="ratedCurrent"]');
  if(nameInput)nameInput.value=(propertiesTarget.object.type==='mcb3'?'Автомат 3P, ':'Автомат 1P, ')+selected;
  if(currentInput)currentInput.value=String(amperage);
});
function syncAppliancePropertyInputs(changedKey){
  if(!propertiesTarget||!TYPES[propertiesTarget.object.type]||TYPES[propertiesTarget.object.type].kind!=='appliance')return;
  if(!['ratedPower','ratedCurrent','ratedVoltage'].includes(changedKey))return;
  const controls={};
  ['ratedVoltage','ratedPower','ratedCurrent'].forEach(function(key){controls[key]=propertiesFields.querySelector('[data-property-key="'+key+'"]');});
  if(Object.values(controls).some(function(input){return !input||!isFinite(Number(input.value))||Number(input.value)<=0;}))return;
  const ratings=applianceRatings({type:propertiesTarget.object.type,ratedVoltage:controls.ratedVoltage.value,ratedPower:controls.ratedPower.value,ratedCurrent:controls.ratedCurrent.value},changedKey);
  // Изменённое поле оставляем под курсором; обновляем зависимое значение.
  if(changedKey==='ratedCurrent')controls.ratedPower.value=String(ratings.ratedPower);
  else controls.ratedCurrent.value=String(ratings.ratedCurrent);
  controls.ratedCurrent.min=String(1/ratings.ratedVoltage);
  controls.ratedCurrent.max=String(30000/ratings.ratedVoltage);
}
function handleAppliancePropertyInput(evt){syncAppliancePropertyInputs(evt.target.getAttribute('data-property-key'));}
propertiesFields.addEventListener('input',handleAppliancePropertyInput);
propertiesFields.addEventListener('change',handleAppliancePropertyInput);
function saveProperties(){
  if(!propertiesTarget)return;
  const obj=propertiesTarget.object;
  const previousRatedVoltage=ratedVoltageOf(obj,220);
  const previousSwitchGangs=obj.type==='wallSwitch'?(Number(obj.gangs)===2?2:1):0;
  propertiesTarget.fields.forEach(function(f){
    const input=propertiesFields.querySelector('[data-property-key="'+f.key+'"]');if(!input)return;
    let value=input.value;
    if(f.type==='number'){
      value=Number(value);if(!isFinite(value))value=Number(f.def)||0;
      const applianceCurrent=f.key==='ratedCurrent'&&TYPES[obj.type]&&TYPES[obj.type].kind==='appliance';
      const min=applianceCurrent?1/ratedVoltageOf(obj,220):f.min,max=applianceCurrent?30000/ratedVoltageOf(obj,220):f.max;
      if(min!==undefined)value=Math.max(min,value);if(max!==undefined)value=Math.min(max,value);
    }else value=String(value).trim();
    if(f.key==='tag'&&!value)value=String(f.def||'');
    if(f.key==='inletVoltage'){setPanelInlet(obj,value);return;}
    obj[f.key]=value;
  });
  if(TYPES[obj.type]&&TYPES[obj.type].kind==='appliance')syncApplianceRatings(obj);
  if(obj.type==='mcb1'||obj.type==='mcb3'){
    const allowed=['C2','C4','C6','C10','C13','C16','C20','C25','C32','C40','C50','C63'];
    if(allowed.indexOf(obj.breakerType)<0)obj.breakerType=obj.type==='mcb3'?'C25':'C10';
    const selectedCurrent=Math.max(2,Number(String(obj.breakerType).replace(/^C/,''))||10);
    obj.ratedCurrent=selectedCurrent;
    obj.customName=(obj.type==='mcb3'?'Автомат 3P, ':'Автомат 1P, ')+obj.breakerType;
  }
  if(propertiesTarget.target.kind==='special'&&propertiesTarget.target.key==='panel'){
    obj.railCount=panelRailCount(obj);detachPanelDevices(obj,obj.railCount);
  }
  // Изменение номинала означает выбор другой модификации аппарата.
  // Поэтому старое повреждение от перенапряжения к новой модификации не переносим.
  if(Math.abs(ratedVoltageOf(obj,220)-previousRatedVoltage)>.01){
    if('burned' in obj)obj.burned=false;
    if('coilBurned' in obj)obj.coilBurned=false;
    if('timerBurned' in obj)obj.timerBurned=false;
    if('applianceBurned' in obj)obj.applianceBurned=false;
  }
  if(propertiesTarget.target.kind==='device'&&obj.type==='tp'){
    obj.maxArmatureVoltage=Math.max(1,Number(obj.maxArmatureVoltage)||220);
    obj.fieldVoltage=Math.max(1,Number(obj.fieldVoltage)||220);
    setTpArmatureVoltage(obj, Number(obj.setArmatureVoltage)||0);
  }
  if(propertiesTarget.target.kind==='special'&&propertiesTarget.target.key==='motor'){
    obj.polePairs=Math.max(1,Math.round(Number(obj.polePairs)||2));
    const slip=Number(obj.ratedSlipPercent);
    obj.ratedSlipPercent=Math.max(0,Math.min(95,isFinite(slip)?slip:10));
  }
  if(propertiesTarget.target.kind==='special'&&propertiesTarget.target.key==='dcmotor'){
    obj.kind='dc';
    obj.ratedArmatureVoltage=Math.max(1,Number(obj.ratedArmatureVoltage)||DCM.ratedArmatureVoltage);
    obj.ratedArmatureCurrent=Math.max(.1,Number(obj.ratedArmatureCurrent)||DCM.ratedArmatureCurrent);
    obj.ratedFieldVoltage=Math.max(1,Number(obj.ratedFieldVoltage)||DCM.ratedFieldVoltage);
    obj.ratedSpeed=Math.max(1,Number(obj.ratedSpeed)||DCM.ratedSpeed);
    obj.armatureResistance=Math.max(.01,Number(obj.armatureResistance)||DCM.armatureResistance);
    obj.fieldResistance=Math.max(1,Number(obj.fieldResistance)||DCM.fieldResistance);
    obj.inertiaFactor=Math.max(.05,Number(obj.inertiaFactor)||DCM.inertiaFactor);
  }
  if(obj.type==='wallSwitch'){
    obj.gangs=Number(obj.gangs)===2?2:1;
    obj.switchOn1=!!obj.switchOn1;
    obj.switchOn2=obj.gangs===2&&!!obj.switchOn2;
    if(previousSwitchGangs===2&&obj.gangs===1){
      state.wires=state.wires.filter(function(w){return !sameTerm(w.a,obj.id,'O2')&&!sameTerm(w.b,obj.id,'O2');});
      ['a','b'].forEach(function(key){if(state.mm[key]&&sameTerm(state.mm[key],obj.id,'O2'))state.mm[key]=null;});
      if(pending&&sameTerm(pending.from,obj.id,'O2'))cancelWire();
    }
  }
  if(obj.type==='vfd')obj.setFrequency=Math.max(0,Math.min(Number(obj.maxFrequency)||100,Number(obj.setFrequency)||0));
  const label=obj.tag||propertiesTarget.title;
  closeProperties();renderAll();log('Характеристики '+label+' сохранены.','ok');
}
document.getElementById('propertiesClose').addEventListener('click',closeProperties);
document.getElementById('propertiesCancel').addEventListener('click',closeProperties);
propertiesModal.addEventListener('pointerdown',function(evt){if(evt.target===propertiesModal)closeProperties();});
propertiesForm.addEventListener('submit',function(evt){evt.preventDefault();saveProperties();});
document.addEventListener('keydown',function(evt){if(evt.key==='Escape'&&propertiesModal.classList.contains('open')){evt.preventDefault();closeProperties();}});
function detachMeterFromObject(devId){
  ['a','b'].forEach(function(key){
    const sel=state.mm[key];
    if(!sel||String(sel.devId)!==String(devId))return;
    const p=terminal(sel.devId,sel.key);
    if(p){if(key==='a'){METER.redX=p.x;METER.redY=p.y;}else{METER.blackX=p.x;METER.blackY=p.y;}}
    state.mm[key]=null;
  });
}
function removeObjectFromScene(target){
  if(!target)return;
  if(target.kind==='special'&&target.key==='inbox'){
    const panel=inboxPanel();if(panel)target={kind:'special',key:'panel',id:panel.id};
  }
  if(target.kind==='relay'){
    const rel=anyRelayById(target.id);if(!rel)return;
    if(relayLive(rel)){warn('Пускатель под напряжением — сначала обесточьте катушку.');return;}
    detachMeterFromObject('kk'+rel.id);
    state.relays=state.relays.filter(function(r){return r.id!==rel.id;});
    removeWiresFor('kk'+rel.id);
    log('Тепловое реле возвращено в лоток.','info');
  }else if(target.kind==='device'){
    const dev=devById(target.id);if(!dev)return;
    if(isLive(dev)){
      warn(TYPES[dev.type].kind==='contactor'?'Пускатель под напряжением — сначала обесточьте катушку.':'Сначала отключите аппарат или снимите с него напряжение.');return;
    }
    const attached=state.relays.filter(function(r){return r.kmId===dev.id;});
    detachMeterFromObject(dev.id);
    attached.forEach(function(r){detachMeterFromObject('kk'+r.id);removeWiresFor('kk'+r.id);});
    state.relays=state.relays.filter(function(r){return r.kmId!==dev.id;});
    removeWiresFor(dev.id);state.devices=state.devices.filter(function(d){return d.id!==dev.id;});
    log(TYPES[dev.type].title+' возвращён в лоток'+(attached.length?' вместе с тепловым реле.':'.'),'info');
  }else if(target.kind==='special'){
    const key=target.key;
    if(key==='panel'){
      const panel=panelById(target.id);if(!panel)return;
      if(panel.inbox){detachMeterFromObject('IN');removeWiresFor('IN');state.special.inbox=false;}
      detachPanelDevices(panel,0);state.panels=state.panels.filter(function(p){return p.id!==panel.id;});
      renderAll();return;
    }
    if(key==='clamp'){
      state.clamps=state.clamps.filter(function(c){return c.id!==target.id;});
      if(clampState&&clampState.id===target.id)clampState=null;
      renderClamp();renderTray();return;
    }
    if(key==='inbox'){detachMeterFromObject('IN');removeWiresFor('IN');}
    else if(key==='pushbutton'){
      const pb=pushbuttonById(target.id);if(pb){detachMeterFromObject(pb.id);removeWiresFor(pb.id);state.pushbuttons=state.pushbuttons.filter(function(x){return x.id!==pb.id;});}
    }
    else if(key==='motor'||key==='dcmotor'){
      const motor=motorById(target.id);if(motor){detachMeterFromObject(motor.id);removeWiresFor(motor.id);state.motors=state.motors.filter(function(x){return x.id!==motor.id;});updateMotorSound(0);}
    }
    else if(key==='multimeter'){state.mm.a=null;state.mm.b=null;meterProbeHover=null;}
    if(key!=='motor'&&key!=='dcmotor'&&key!=='pushbutton')state.special[key]=false;
    log('Объект удалён с рабочего поля и возвращён в лоток.','info');
  }
  renderAll();
}
objectMenuEl.addEventListener('click',function(evt){
  const action=evt.target.closest('[data-object-act]');if(!action)return;
  const target=objectMenuTarget,kind=action.getAttribute('data-object-act');
  hideObjectMenu();
  if(kind==='properties')openProperties(target);
  else if(kind==='remove')removeObjectFromScene(target);
});
document.addEventListener('pointerdown',function(evt){if(!evt.target.closest('#objectMenu'))hideObjectMenu();});

/* ПКМ по реле */
relayLayer.addEventListener('contextmenu', function(evt){
  const g = evt.target.closest('.relay');
  if (!g) return;
  showObjectMenu(evt,{kind:'relay',id:+g.dataset.rid});
});

/* ПКМ по аппарату или кнопочному посту */
deviceLayer.addEventListener('contextmenu', function(evt){
  const station=evt.target.closest('.push-station');
  if(station){showObjectMenu(evt,{kind:'special',key:'pushbutton',id:station.dataset.dev});return;}
  const g = evt.target.closest('.dev');
  if (!g) return;
  showObjectMenu(evt,{kind:'device',id:+g.dataset.id});
});
boxLayer.addEventListener('contextmenu',function(evt){
  if(!evt.target.closest('.inbox-draggable'))return;
  const panel=inboxPanel();
  showObjectMenu(evt,panel?{kind:'special',key:'panel',id:panel.id}:{kind:'special',key:'inbox'});
});
motorLayer.addEventListener('contextmenu',function(evt){const body=evt.target.closest('.motor-draggable');const control=evt.target.closest('.motor-load-control');const id=body?body.dataset.dev:(control&&control.querySelector('.motor-load')&&control.querySelector('.motor-load').dataset.mid);if(id){const motor=motorById(id);showObjectMenu(evt,{kind:'special',key:motorIsDc(motor)?'dcmotor':'motor',id:id});}});
mmLayer.addEventListener('contextmenu',function(evt){if(evt.target.closest('.multimeter-body,.mm-probe'))showObjectMenu(evt,{kind:'special',key:'multimeter'});});

/* ============================================================
   7. КОММУТАЦИЯ
   ============================================================ */
/* мгновенное обновление лицевой панели аппарата (с анимацией рукоятки/якоря) */
function applyDeviceVisual(dev){
  const g = deviceLayer.querySelector('.dev[data-id="'+dev.id+'"]');
  if (!g) return;

  if (TYPES[dev.type].kind === 'contactor'){       // втягивание якоря пускателя
    Array.prototype.forEach.call(g.querySelectorAll('.plg-depth'), function(plg){
      const aux = plg.classList.contains('aux-actuator');
      const base = aux ? 'aux-actuator plg-depth ' : 'plg-depth ';
      plg.setAttribute('class', base + (dev.coil ? ('pressed ' + (aux ? 'aux-pressing' : 'pressing')) : 'released'));
    });
    const stc = g.querySelector('.stateTxt');
    if (stc){
      stc.textContent = dev.coil ? 'ВКЛ' : 'ОТКЛ';
      stc.setAttribute('fill', dev.coil ? '#1e7a3c' : '#4b5563');
    }
    return;
  }

  const hy = handleY(dev.tripped, dev.on);
  Array.prototype.forEach.call(g.querySelectorAll('.hdl'), function(h){
    h.setAttribute('transform', 'translate(0,'+hy+')');
  });
  const col = dev.tripped ? '#ff8a00' : (dev.on ? '#e01b1b' : '#1e6b3a');
  Array.prototype.forEach.call(g.querySelectorAll('.win'), function(r){ r.setAttribute('fill', col); });
  const st = g.querySelector('.stateTxt');
  if (st){
    st.textContent = dev.tripped ? 'СРАБОТАЛ' : (dev.on ? 'ВКЛ' : 'ОТКЛ');
    st.setAttribute('fill', dev.tripped ? '#ff8a00' : (dev.on ? '#c62828' : '#4b5563'));
  }
}

function toggleDevice(dev){
  const t = TYPES[dev.type];
  if(t.kind==='vfd'){
    const input=vfdInputState(dev,potentialMap().pot);
    log(tagOf(dev.id)+': вход '+(input.ready?Math.round(input.lineVoltageRms)+' В, '+input.frequencyHz.toFixed(1)+' Гц':'не готов')
      +'; задание '+vfdSetFrequency(dev).toFixed(1)+' Гц. Управление кнопками RUN, STOP, REV, ▲ и ▼.','info');
    return;
  }
  if (t.kind === 'timer'){
    log(tagOf(dev.id)+': A1–A2 — '+Math.round(ratedVoltageOf(dev,220))+' В. Без провода S отсчёт начинается при подаче питания; провод S позволяет запускать его отдельно. Красные регуляторы задают диапазон, уставку и режим.', 'info');
    return;
  }
  if(t.kind==='converter'){
    const input=tpInputState(dev,potentialMap().pot);
    log(tagOf(dev.id)+': вход '+(input.ready?Math.round(input.lineVoltageRms)+' В, '+input.frequencyHz.toFixed(1)+' Гц':'не готов')
      +'; выход якоря '+(dev.tpOn?'включён':'отключён')+', уставка '+tpSetArmatureVoltage(dev).toFixed(0)+' В, возбуждение '+tpFieldVoltage(dev).toFixed(0)+' В. Управление кнопками «СЕТЬ», ▲ и ▼.','info');
    renderSide();
    return;
  }
  if (t.kind === 'contactor'){
    log('Пускатель включается катушкой A1–A2. Для ручной проверки удерживайте жёлтые пластины левой кнопкой мыши.', 'info');
    renderSide();
    return;
  }
  if (t.kind === 'meter'){
    log(tagOf(dev.id)+': однофазный счётчик. Клеммы 1–2 — фаза, 3–4 — нейтраль. Показание '+(Number(dev.energyKwh)||0).toFixed(6)+' кВт·ч.', 'info');
    renderSide();
    return;
  }
  if (t.kind === 'sensor'){
    log(tagOf(dev.id)+': '+Math.round(meterVoltage(dev))+' В, '+(Number(dev.sensorCurrentA)||0).toFixed(1)+' А. Измеряется нагрузка после выходов L/N.', 'info');
    renderSide();
    return;
  }
  if (t.kind === 'bulb'){
    const u=bulbVoltage(dev);
    log(tagOf(dev.id)+': лампа накаливания 100 Вт, напряжение '+Math.round(u)+' В'+(dev.burned?' — нить перегорела.':'.'),dev.burned?'warn':'info');
    renderSide();
    return;
  }
  if (t.kind === 'outlet'){
    log(tagOf(dev.id)+': двойная розетка, напряжение между L и N '+Math.round(outletVoltage(dev))+' В. Обе розетки соединены параллельно.', 'info');
    renderSide();
    return;
  }
  if (t.kind !== 'mcb' && t.kind !== 'rcd'){
    log('Клеммная колодка — механическое соединение, коммутации нет.', 'info');
    renderSide();
    return;
  }
  if (dev.tripped){
    dev.tripped = false; dev.on = false; dev.rcdLeakageMa = 0;
    playBreakerSound(false);                 // взведение рукоятки после срабатывания
    log(t.title + ': взведён после срабатывания, рукоятка в «0».', 'ok');
  } else if (!dev.on){
    dev.on = true;
    playBreakerSound(true);
    log(t.title + ': ВКЛЮЧЕН (рукоятка «I»).', 'ok');
  } else {
    dev.on = false;
    playBreakerSound(false);
    log(t.title + ': отключён (рукоятка «0»).', 'info');
  }
  /* Изменение автомата влияет не только на катушки, но и на лампы.
     Полностью обновляем электрические состояния и лицевые панели всех аппаратов. */
  renderAll();
}

function inputBreaker(){
  return state.devices.filter(function(d){ return d.type === 'mcb3'; })[0] || null;
}
/* напряжение управления: питание стенда + включённый вводной автомат */
function controlReady(){
  const q = inputBreaker();
  return !!(state.power && q && q.on && !q.tripped);
}

/* ---------- катушка пускателя: A1 и A2 — концы катушки, она питается 220 В ----------
   Катушка — это нагрузка, а не провод: в potentialMap она не замыкает A1 с A2.
   Как только между A1 и A2 появляется напряжение сети (≈220 В), якорь втягивается
   и замыкаются силовые контакты 1-2, 3-4, 5-6 (это уже учтено в internalLinks). */
function coilVoltage(km){
  const map = potentialMap();
  const va = map.pot[nodeKey({ devId:km.id, key:'A1' })];
  const vb = map.pot[nodeKey({ devId:km.id, key:'A2' })];
  if (!va || !vb) return 0;
  return Math.hypot(va.r - vb.r, va.i - vb.i);
}
function timerVoltage(d){
  const map=potentialMap();
  const a=map.pot[nodeKey({devId:d.id,key:'A1'})],b=map.pot[nodeKey({devId:d.id,key:'A2'})];
  return a&&b ? Math.hypot(a.r-b.r,a.i-b.i) : 0;
}
function updateTimeRelays(now){
  const timers=state.devices.filter(function(d){return d.type==='timer';});
  if(!timers.length)return false;
  const map=potentialMap();
  let changed=false;
  timers.forEach(function(d){
    const a=map.pot[nodeKey({devId:d.id,key:'A1'})];
    const b=map.pot[nodeKey({devId:d.id,key:'A2'})];
    const s=map.pot[nodeKey({devId:d.id,key:'S'})];
    const u=a&&b?Math.hypot(a.r-b.r,a.i-b.i):0;
    const supplied=!d.timerBurned&&!map.conflict&&voltageIsOperating(u,d,220);
    const externalS=state.wires.some(function(w){
      return sameTerm(w.a,d.id,'S')||sameTerm(w.b,d.id,'S');
    });
    const trigger=supplied&&(!externalS||(s&&b&&a&&
      voltageIsOperating(Math.hypot(s.r-b.r,s.i-b.i),d,220)&&
      Math.hypot(s.r-a.r,s.i-a.i)<20));
    const before=!!d.timerActive, previousSignal=!!d.timerLastSignal;
    const mode=TIMER_MODES.includes(d.timerMode)?d.timerMode:'on';
    const delay=timerDelayMs(d);
    d.timerSupply=!!supplied;
    if(!supplied){
      d.timerActive=false;d.timerSince=null;d.timerLastSignal=false;
    }else if(mode==='on'){
      if(trigger){
        if(!previousSignal||d.timerSince==null)d.timerSince=now;
        d.timerActive=now-d.timerSince>=delay;
      }else{d.timerSince=null;d.timerActive=false;}
      d.timerLastSignal=!!trigger;
    }else if(mode==='off'){
      if(trigger){d.timerActive=true;d.timerSince=null;}
      else if(previousSignal&&d.timerActive)d.timerSince=now;
      if(!trigger&&d.timerSince!=null&&now-d.timerSince>=delay){d.timerActive=false;d.timerSince=null;}
      d.timerLastSignal=!!trigger;
    }else{
      if(trigger&&!previousSignal){d.timerActive=true;d.timerSince=now;}
      if(d.timerActive&&d.timerSince!=null&&now-d.timerSince>=delay){d.timerActive=false;d.timerSince=null;}
      d.timerLastSignal=!!trigger;
    }
    if(before!==!!d.timerActive){
      changed=true;
      log(tagOf(d.id)+': контакт 15–'+(d.timerActive?'18 замкнут, 15–16 разомкнут.':'16 замкнут, 15–18 разомкнут.'),d.timerActive?'ok':'info');
    }
  });
  return changed;
}
function timeRelayTick(){
  const now=performance.now();
  if(updateTimeRelays(now))renderAll();
  else state.devices.filter(function(d){return d.type==='timer';}).forEach(function(d){
    const label=deviceLayer.querySelector('.dev[data-id="'+d.id+'"] .timer-state');
    if(label)label.textContent=timerStatus(d,now);
  });
}
setInterval(timeRelayTick,50);
function lampVoltage(lamp){
  if (!lamp || lamp.id === undefined) return 0;
  const map = potentialMap();
  if (map.conflict) return 0;
  const va = map.pot[nodeKey({ devId:lamp.id, key:'t0' })];
  const vb = map.pot[nodeKey({ devId:lamp.id, key:'b0' })];
  if (!va || !vb) return 0;
  return Math.hypot(va.r-vb.r, va.i-vb.i);
}
function bulbVoltage(bulb){
  if(!bulb||bulb.id===undefined)return 0;
  const map=potentialMap();
  if(map.conflict)return 0;
  const a=map.pot[nodeKey({devId:bulb.id,key:'L'})];
  const b=map.pot[nodeKey({devId:bulb.id,key:'N'})];
  return a&&b?Math.hypot(a.r-b.r,a.i-b.i):0;
}
function outletVoltage(outlet){
  if(!outlet||outlet.id===undefined)return 0;
  const map=potentialMap();
  if(map.conflict)return 0;
  const a=map.pot[nodeKey({devId:outlet.id,key:'L'})];
  const b=map.pot[nodeKey({devId:outlet.id,key:'N'})];
  return a&&b?Math.hypot(a.r-b.r,a.i-b.i):0;
}
function applianceVoltage(appliance){
  if(!appliance||appliance.id===undefined)return 0;
  const map=potentialMap();
  if(map.conflict)return 0;
  const a=map.pot[nodeKey({devId:appliance.id,key:'L'})];
  const b=map.pot[nodeKey({devId:appliance.id,key:'N'})];
  return a&&b?Math.hypot(a.r-b.r,a.i-b.i):0;
}

function meterVoltage(meter){
  if(!meter||meter.id===undefined)return 0;
  const map=potentialMap();
  if(map.conflict)return 0;
  const a=map.pot[nodeKey({devId:meter.id,key:'L_in'})];
  const b=map.pot[nodeKey({devId:meter.id,key:'N_in'})];
  return a&&b?Math.hypot(a.r-b.r,a.i-b.i):0;
}

/* Определяем нагрузки именно после выбранного счётчика. Собственные перемычки
   1–2 и 3–4 временно исключаются, чтобы входная сеть не попала в защищённую зону. */
function meterPowerW(meter){
  const map=potentialMap();
  if(map.conflict||!voltageIsOperating(meterVoltage(meter),meter,220))return 0;
  const adj={};
  function add(a,b){
    const ka=nodeKey(a),kb=nodeKey(b);
    (adj[ka]=adj[ka]||[]).push(kb);
    (adj[kb]=adj[kb]||[]).push(ka);
  }
  function ownLink(pair){
    const a=pair[0],b=pair[1];
    if(String(a.devId)!==String(meter.id)||String(b.devId)!==String(meter.id))return false;
    const keys=[a.key,b.key].sort().join('|');
    return keys==='L_in|L_out'||keys==='N_in|N_out';
  }
  internalLinks().forEach(function(pair){if(!ownLink(pair))add(pair[0],pair[1]);});
  state.wires.forEach(function(w){add(w.a,w.b);});
  function component(start){
    const seen={},queue=[nodeKey(start)];
    while(queue.length){const k=queue.shift();if(seen[k])continue;seen[k]=true;(adj[k]||[]).forEach(function(n){if(!seen[n])queue.push(n);});}
    return seen;
  }
  const phase=component({devId:meter.id,key:'L_out'});
  const neutral=component({devId:meter.id,key:'N_out'});
  function across(devId,a,b){
    const ka=nodeKey({devId:devId,key:a}),kb=nodeKey({devId:devId,key:b});
    const routed=(phase[ka]&&neutral[kb])||(phase[kb]&&neutral[ka]);
    if(!routed)return null;
    const va=map.pot[ka],vb=map.pot[kb];
    const u=va&&vb?Math.hypot(va.r-vb.r,va.i-vb.i):0;
    return u;
  }
  let watts=0;
  state.devices.forEach(function(d){
    let u=null,basePower=0,available=true;
    if(d.type==='lamp'){u=across(d.id,'t0','b0');basePower=Number(d.ratedPower)||1;available=!d.burned;}
    if(d.type==='bulb'){u=across(d.id,'L','N');basePower=Number(d.ratedPower)||100;available=!d.burned;}
    if(TYPES[d.type].kind==='appliance'){u=across(d.id,'L','N');basePower=Number(d.ratedPower)||TYPES[d.type].defaultPower;available=!!d.applianceOn&&!d.applianceBurned;}
    if(d.type==='km1'){u=across(d.id,'A1','A2');basePower=Number(d.ratedPower)||8;available=!d.coilBurned;}
    if(d.type==='timer'){u=across(d.id,'A1','A2');basePower=Number(d.ratedPower)||4;available=!d.timerBurned;}
    if(u!==null&&available&&voltageIsOperating(u,d,220)){
      const ratio=u/ratedVoltageOf(d,220);
      watts+=basePower*ratio*ratio;
    }
  });
  return watts;
}

let energyMeterLast=performance.now();
function energyMeterTick(){
  const now=performance.now(),dt=Math.min(2,Math.max(0,(now-energyMeterLast)/1000));
  energyMeterLast=now;
  state.devices.filter(function(d){return d.type==='meter';}).forEach(function(d){
    const power=meterPowerW(d);
    d.meterPowerW=power;
    d.energyKwh=Math.max(0,Number(d.energyKwh)||0)+power*dt/3600000;
    // Импульс ускорен визуально, само накопление энергии идёт в реальном времени.
    d.meterPulse=power>0&&Math.floor(now/350)%2===0;
    const g=deviceLayer.querySelector('.dev[data-id="'+d.id+'"]');
    if(!g)return;
    const energyEl=g.querySelector('.meter-energy');
    const powerEl=g.querySelector('.meter-power');
    const pulseEl=g.querySelector('.meter-pulse');
    if(energyEl)energyEl.textContent=d.energyKwh.toFixed(6).padStart(10,'0');
    if(powerEl)powerEl.textContent=Math.round(power)+' W';
    if(pulseEl)pulseEl.setAttribute('fill',d.meterPulse?'#ff3b30':'#657079');
  });
  state.devices.filter(function(d){return d.type==='sensor';}).forEach(function(d){
    const voltage=meterVoltage(d),power=meterPowerW(d);
    const current=voltageIsOperating(voltage,d,220)&&voltage>0?power/voltage:0;
    d.sensorVoltage=voltage;
    d.sensorCurrentA=current;
    const g=deviceLayer.querySelector('.dev[data-id="'+d.id+'"]');
    if(!g)return;
    const voltageEl=g.querySelector('.sensor-v'),currentEl=g.querySelector('.sensor-a');
    if(voltageEl)voltageEl.textContent=Math.round(voltage);
    if(currentEl)currentEl.textContent=current.toFixed(1);
  });
}
setInterval(energyMeterTick,250);

/* Короткий механический щелчок контактора без внешних звуковых файлов. */
let contactorAudio = null;
let motorSound = null;
function playContactorSound(pulledIn){
  try{
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!contactorAudio) contactorAudio = new AudioCtor();
    if (contactorAudio.state === 'suspended') contactorAudio.resume().catch(function(){});
    const ctx = contactorAudio, now = ctx.currentTime;
    const bursts = pulledIn ? [0, .052] : [0];
    bursts.forEach(function(delay, index){
      const duration = pulledIn ? .055 : .075;
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate*duration), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * Math.pow(1-i/data.length, 2.5);
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.value = pulledIn ? (index ? 1550 : 950) : 650;
      filter.Q.value = .8;
      const t = now + delay;
      gain.gain.setValueAtTime(.0001, t);
  gain.gain.exponentialRampToValueAtTime(pulledIn ? .36 : .21, t+.004);
      gain.gain.exponentialRampToValueAtTime(.0001, t+duration);
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start(t); src.stop(t+duration);
    });
    const thump = ctx.createOscillator(), thumpGain = ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(pulledIn ? 105 : 78, now);
    thump.frequency.exponentialRampToValueAtTime(48, now+.075);
  thumpGain.gain.setValueAtTime(pulledIn ? .195 : .12, now);
    thumpGain.gain.exponentialRampToValueAtTime(.0001, now+.09);
    thump.connect(thumpGain); thumpGain.connect(ctx.destination);
    thump.start(now); thump.stop(now+.095);
  } catch (e){ /* звук не должен мешать работе электрической модели */ }
}
/* Щелчок рукоятки автоматического выключателя: сухой и короткий, без
   тяжёлого удара контактора. Слышны близкие щелчки — механизм рукоятки
   и защёлка контакта; включение чуть звонче выключения, а срабатывание
   защиты резче и громче: механизм срывается сам, и рукоятка падает
   в среднее положение. */
function playBreakerSound(switchedOn, tripped){
  try{
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!contactorAudio) contactorAudio = new AudioCtor();
    if (contactorAudio.state === 'suspended') contactorAudio.resume().catch(function(){});
    const ctx = contactorAudio, now = ctx.currentTime;
    const p = {
      on:   { hz:3200, burst:.26,  knock:.075, knockHz:150, knockMs:.05, delays:[0,.012],      duration:.042, decay:5 },
      off:  { hz:2600, burst:.21,  knock:.06,  knockHz:118, knockMs:.05, delays:[0,.012],      duration:.036, decay:5 },
      trip: { hz:3600, burst:.34,  knock:.115, knockHz:132, knockMs:.07, delays:[0,.009,.024], duration:.05,  decay:4 }
    }[tripped ? 'trip' : (switchedOn ? 'on' : 'off')];
    p.delays.forEach(function(delay, index){
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate*p.duration), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * Math.pow(1-i/data.length, p.decay);
      const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      src.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.value = p.hz * (index ? 1.35 : 1);
      filter.Q.value = 1.2;
      const t = now + delay;
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(index ? p.burst*.45 : p.burst, t+.002);
      gain.gain.exponentialRampToValueAtTime(.0001, t+p.duration);
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start(t); src.stop(t+p.duration);
    });
    const knock = ctx.createOscillator(), knockGain = ctx.createGain();
    knock.type = 'triangle';
    knock.frequency.setValueAtTime(p.knockHz, now);
    knock.frequency.exponentialRampToValueAtTime(64, now+p.knockMs);
    knockGain.gain.setValueAtTime(p.knock, now);
    knockGain.gain.exponentialRampToValueAtTime(.0001, now+p.knockMs+.01);
    knock.connect(knockGain); knockGain.connect(ctx.destination);
    knock.start(now); knock.stop(now+p.knockMs+.015);
  } catch (e){ /* звук не должен мешать работе электрической модели */ }
}
/* Щелчок теплового реле: биметаллический механизм срабатывает легко и сухо,
   заметно тише рукоятки автомата. Нужен потому, что отпадание пускателя
   слышно только при собранной цепи катушки, а само реле щёлкает всегда. */
function playRelaySound(){
  try{
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!contactorAudio) contactorAudio = new AudioCtor();
    if (contactorAudio.state === 'suspended') contactorAudio.resume().catch(function(){});
    const ctx = contactorAudio, now = ctx.currentTime;
    const duration = .028;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate*duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<data.length;i++) data[i] = (Math.random()*2-1) * Math.pow(1-i/data.length, 6);
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 4200;
    filter.Q.value = 1.4;
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.14, now+.0015);
    gain.gain.exponentialRampToValueAtTime(.0001, now+duration);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(now); src.stop(now+duration);
    const tick = ctx.createOscillator(), tickGain = ctx.createGain();
    tick.type = 'triangle';
    tick.frequency.setValueAtTime(230, now);
    tick.frequency.exponentialRampToValueAtTime(150, now+.025);
    tickGain.gain.setValueAtTime(.032, now);
    tickGain.gain.exponentialRampToValueAtTime(.0001, now+.03);
    tick.connect(tickGain); tickGain.connect(ctx.destination);
    tick.start(now); tick.stop(now+.035);
  } catch (e){ /* звук не должен мешать работе электрической модели */ }
}
function updateMotorSound(direction,rpm){
  try{
    if (!direction){
      if (!motorSound) return;
      const old = motorSound;
      motorSound = null;
      const t = old.ctx.currentTime;
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(Math.max(.0001, old.gain.gain.value), t);
      old.gain.gain.exponentialRampToValueAtTime(.0001, t+.22);
      setTimeout(function(){
        try{ old.nodes.forEach(function(n){ if (n.stop) n.stop(); }); old.gain.disconnect(); }catch(e){}
      }, 260);
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    if (!contactorAudio) contactorAudio = new AudioCtor();
    if (contactorAudio.state === 'suspended') contactorAudio.resume().catch(function(){});
    if (motorSound){
      motorSound.direction = direction;
      const t=motorSound.ctx.currentTime,ratio=Math.max(.04,Math.min(1,(rpm||0)/1350));
      if(motorSound.shaft)motorSound.shaft.frequency.setTargetAtTime(Math.max(2,(rpm||0)/60),t,.08);
      if(motorSound.rotationPulse)motorSound.rotationPulse.frequency.setTargetAtTime(Math.max(2,(rpm||0)/60),t,.08);
    motorSound.gain.gain.setTargetAtTime(.018+.0795*ratio,t,.12);
      return;
    }
    const ctx = contactorAudio, now = ctx.currentTime;
    const master = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass'; lowpass.frequency.value = 850; lowpass.Q.value = .7;
    master.gain.setValueAtTime(.0001, now);
    const speedRatio=Math.max(.04,Math.min(1,(rpm||0)/1350));
  master.gain.exponentialRampToValueAtTime(.018+.0795*speedRatio, now+.28);
    lowpass.connect(master); master.connect(ctx.destination);

    const hum50 = ctx.createOscillator(), hum100 = ctx.createOscillator(), shaft = ctx.createOscillator();
    const g50 = ctx.createGain(), g100 = ctx.createGain(), shaftGain = ctx.createGain();
    hum50.type = 'sine'; hum50.frequency.value = 50; g50.gain.value = .52;
    hum100.type = 'triangle'; hum100.frequency.value = 100; g100.gain.value = .12;
    shaft.type = 'sine'; shaft.frequency.value = Math.max(2,(rpm||0)/60); shaftGain.gain.value = .34;
    hum50.connect(g50); g50.connect(lowpass);
    hum100.connect(g100); g100.connect(lowpass);
    shaft.connect(shaftGain); shaftGain.connect(lowpass);

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i=0;i<noiseData.length;i++) noiseData[i] = (Math.random()*2-1)*.16;
    const noise = ctx.createBufferSource(), noiseFilter = ctx.createBiquadFilter(), noiseGain = ctx.createGain();
    noise.buffer = noiseBuffer; noise.loop = true;
    noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 1050; noiseFilter.Q.value = .72;
    noiseGain.gain.value = .19;
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(lowpass);

    /* Шорох подшипников: узкая высокая составляющая с медленным плаванием частоты
       и пульсацией общей шумовой дорожки на частоте вращения ротора. */
    const bearing = ctx.createOscillator(), bearingGain = ctx.createGain();
    const bearingFlutter = ctx.createOscillator(), flutterDepth = ctx.createGain();
    bearing.type = 'triangle'; bearing.frequency.value = 670; bearingGain.gain.value = .028;
    bearingFlutter.type = 'sine'; bearingFlutter.frequency.value = 4.7; flutterDepth.gain.value = 9;
    bearingFlutter.connect(flutterDepth); flutterDepth.connect(bearing.frequency);
    bearing.connect(bearingGain); bearingGain.connect(lowpass);
    const rotationPulse = ctx.createOscillator(), pulseDepth = ctx.createGain();
    rotationPulse.type = 'sine'; rotationPulse.frequency.value = Math.max(2,(rpm||0)/60); pulseDepth.gain.value = .045;
    rotationPulse.connect(pulseDepth); pulseDepth.connect(noiseGain.gain);

    hum50.start(now); hum100.start(now); shaft.start(now); noise.start(now);
    bearing.start(now); bearingFlutter.start(now); rotationPulse.start(now);
    motorSound = { ctx:ctx, gain:master,shaft:shaft,rotationPulse:rotationPulse,
      nodes:[hum50,hum100,shaft,noise,bearing,bearingFlutter,rotationPulse], direction:direction };
  } catch (e){ /* отсутствие аудио не влияет на работу двигателя */ }
}
function syncContactorCoils(){
  state.devices.forEach(function(km){
    if (km.type !== 'km1') return;
    const u = coilVoltage(km);
    const electrical = !km.coilBurned && voltageIsOperating(u,km,220); // катушка срабатывает в диапазоне своего паспортного напряжения
    const on = electrical || !!km.manualPressed;
    km.coilU = Math.round(u/10)*10;
    km.coilElectrical = electrical;
    if (on !== km.coil){
      km.coil = on;
      km.coilAnim = on;
      applyDeviceVisual(km);
      playContactorSound(on);
      if (on && electrical) log(tagOf(km.id)+': на катушке A1–A2 появилось ' + km.coilU + ' В — якорь втянут; силовые контакты и НО-контакты 13-14, 53-54 замкнуты, НЗ-контакт 61-62 разомкнут.', 'ok');
      else if(on) log(tagOf(km.id)+': жёлтые пластины нажаты вручную — силовые и НО-контакты принудительно замкнуты, НЗ-контакт 61-62 разомкнут.', 'warn');
      else    log(tagOf(km.id)+': катушка обесточена — якорь вернулся; силовые контакты и НО-контакты 13-14, 53-54 разомкнуты, НЗ-контакт 61-62 замкнут.', 'info');
    }
  });
}

function updateOvervoltageDamage(){
  const damaged=[];
  state.devices.forEach(function(d){
    if(d.type==='lamp'&&!d.burned){
      const u=lampVoltage(d);
      const nominal=ratedVoltageOf(d,220);
      if(voltageIsDestructive(u,d,220)){
        d.burned=true;damaged.push(tagOf(d.id)+' — лампа перегорела ('+Math.round(u)+' В)');
        log('АВАРИЯ: '+tagOf(d.id)+' получила '+Math.round(u)+' В при номинале '+Math.round(nominal)+' В — лампа перегорела.','err');
      }
    }
    if(d.type==='bulb'&&!d.burned){
      const u=bulbVoltage(d);
      const nominal=ratedVoltageOf(d,220);
      if(voltageIsDestructive(u,d,220)){
        d.burned=true;damaged.push(tagOf(d.id)+' — лампа накаливания перегорела ('+Math.round(u)+' В)');
        log('АВАРИЯ: на '+tagOf(d.id)+' подано '+Math.round(u)+' В при номинале '+Math.round(nominal)+' В — нить накала перегорела.','err');
      }
    }
    if(TYPES[d.type].kind==='appliance'&&d.applianceOn&&!d.applianceBurned){
      const u=applianceVoltage(d),nominal=ratedVoltageOf(d,220);
      if(voltageIsDestructive(u,d,220)){
        d.applianceBurned=true;d.applianceOn=false;
        damaged.push(tagOf(d.id)+' — повреждён прибор ('+Math.round(u)+' В)');
        log('АВАРИЯ: '+TYPES[d.type].title+' '+tagOf(d.id)+' получил '+Math.round(u)+' В при номинале '+Math.round(nominal)+' В — прибор повреждён.','err');
      }
    }
    if(d.type==='km1'&&!d.coilBurned){
      const u=coilVoltage(d);
      const nominal=ratedVoltageOf(d,220);
      if(voltageIsDestructive(u,d,220)){
        d.coilBurned=true;d.coil=false;damaged.push(tagOf(d.id)+' — сгорела катушка A1–A2 ('+Math.round(u)+' В)');
        log('АВАРИЯ: на катушку '+tagOf(d.id)+' A1–A2 подано '+Math.round(u)+' В при номинале '+Math.round(nominal)+' В — катушка сгорела.','err');
      }
    }
    if(d.type==='timer'&&!d.timerBurned){
      const u=timerVoltage(d);
      const nominal=ratedVoltageOf(d,220);
      if(voltageIsDestructive(u,d,220)){
        d.timerBurned=true;d.timerActive=false;damaged.push(tagOf(d.id)+' — сгорело реле времени ('+Math.round(u)+' В)');
        log('АВАРИЯ: на '+tagOf(d.id)+' A1–A2 подано '+Math.round(u)+' В при номинале '+Math.round(nominal)+' В — реле времени повреждено.','err');
      }
    }
  });
  if(damaged.length)showPhaseFault('АВАРИЯ: ПЕРЕНАПРЯЖЕНИЕ! '+damaged.join(' · '));
  return damaged.length>0;
}

function updateCoils(){
  updateOvervoltageDamage();
  updateTimeRelays(performance.now());
  // Ручное нажатие физически замыкает контакты сразу. Проверяем этот момент
  // до электрической блокировки, которая может успеть обесточить второй пускатель.
  // Так результат не зависит от порядка KM1/KM2 в массиве устройств.
  if(state.devices.some(function(d){return d.type==='km1'&&d.manualPressed;})){
    const overlapMap=potentialMap();
    if(overlapMap.conflict&&electricalShortFault(overlapMap)){
      syncContactorCoils();
      return;
    }
  }
  syncContactorCoils();
  if (updateRcdLeakage()){
    // УЗО уже разомкнуло защищённую ветвь: катушки должны отпасть
    // в этом же цикле, без дополнительного действия пользователя.
    syncContactorCoils();
  }
  const faultMap = potentialMap();
  if (faultMap.conflict && electricalShortFault(faultMap)){
    // Автомат уже отключён: сразу пересчитываем катушки в новом состоянии сети.
    // Это возвращает якорь и контакты до текущей отрисовки, без дополнительного клика.
    syncContactorCoils();
  } else if(!faultMap.conflict){
    activeShortFaultSignature=null;
  }
}

/* ---------- УЗО: ток, ушедший из защищённой цепи мимо нейтрали ----------
   Проводники в тренажёре идеальны, поэтому прямой контакт защищённой фазы с PE
   моделируется как утечка 230 мА. Это выше IΔn=30 мА и вызывает мгновенное
   двухполюсное отключение. Короткое замыкание между bL и bN за тем же УЗО
   возвращает ток через его нейтральный полюс и утечкой не считается. */
function updateRcdLeakage(){
  const rcds=state.devices.filter(function(d){return d.type==='rcd'&&d.on&&!d.tripped;});
  if(!rcds.length)return false;
  let changed=false;

  rcds.forEach(function(rcd){
    const adj={};
    function add(a,b){
      const ka=nodeKey(a),kb=nodeKey(b);
      (adj[ka]=adj[ka]||[]).push(kb);
      (adj[kb]=adj[kb]||[]).push(ka);
    }
    function ownPole(pair){
      const a=pair[0],b=pair[1];
      if(String(a.devId)!==String(rcd.id)||String(b.devId)!==String(rcd.id))return false;
      const keys=[a.key,b.key].sort().join('|');
      return keys==='bL|tL'||keys==='bN|tN';
    }
    // Для поиска утечки отделяем входы УЗО от его выходов и исследуем
    // проводники, подключённые к защищённой фазной клемме 2 (bL).
    internalLinks().forEach(function(pair){if(!ownPole(pair))add(pair[0],pair[1]);});
    state.wires.forEach(function(w){add(w.a,w.b);});

    const start=nodeKey({devId:rcd.id,key:'bL'}),seen={},queue=[start];
    while(queue.length){
      const key=queue.shift();
      if(seen[key])continue;
      seen[key]=true;
      (adj[key]||[]).forEach(function(next){if(!seen[next])queue.push(next);});
    }

    const leaksToPe=!!seen[nodeKey({devId:'IN',key:'PE'})];
    const bypassesNeutral=!!seen[nodeKey({devId:'IN',key:'N'})]&&
      !seen[nodeKey({devId:rcd.id,key:'bN'})];
    const leakageMa=(leaksToPe||bypassesNeutral)?230:0;
    rcd.rcdLeakageMa=leakageMa;
    if(leakageMa<30)return;

    rcd.tripped=true;
    rcd.on=false;
    changed=true;
    playBreakerSound(false, true);           // двухполюсное отключение от тока утечки
    const route=leaksToPe?'в PE':'в нейтраль в обход полюса N';
    log('АВАРИЯ: '+tagOf(rcd.id)+' обнаружило ток утечки '+leakageMa+' мА '+route+'. УЗО отключило фазу и нейтраль.','err');
    showPhaseFault('УТЕЧКА ТОКА! '+tagOf(rcd.id)+' · IΔ '+leakageMa+' мА · УЗО СРАБОТАЛО');
  });
  return changed;
}

let activeShortFaultSignature=null;
function electricalShortFault(map){
  if (!map.conflicts || !map.conflicts.length) return false;
  const fault = map.conflicts.slice().sort(function(a,b){ return b.voltage-a.voltage; })[0];
  const isPhaseToPhase = fault.voltage > 300;

  // Компонента аварийной цепи нужна, чтобы отключался именно тот автомат,
  // через выход которого реально проходит ток КЗ.
  const component = {}, queue = [fault.node];
  while (queue.length){
    const key = queue.shift();
    if (component[key]) continue;
    component[key] = true;
    (map.adj[key] || []).forEach(function(n){
      const nk = nodeKey(n);
      if (!component[nk]) queue.push(nk);
    });
  }
  const outputDrive=state.devices.filter(function(d){
    return d.type==='vfd'&&['U','V','W'].some(function(key){return !!component[nodeKey({devId:d.id,key:key})];});
  })[0]||null;
  if(outputDrive&&outputDrive.vfdOutputActive){
    outputDrive.fault=true;outputDrive.running=false;outputDrive.vfdOutputActive=false;
    const signature='VFD|'+outputDrive.id+'|'+fault.node;
    activeShortFaultSignature=signature;
    log('АВАРИЯ: короткое замыкание на выходе '+tagOf(outputDrive.id)+'. Электронная защита ПЧ сняла напряжение U/V/W.','err');
    showPhaseFault('АВАРИЯ ПЧ! '+tagOf(outputDrive.id)+' · КОРОТКОЕ ЗАМЫКАНИЕ НА ВЫХОДЕ · НАЖМИТЕ STOP ДЛЯ СБРОСА.');
    return true;
  }
  function protectsFault(d){
    if(!d||!d.on||d.tripped)return false;
    if(d.type==='mcb3')return ['b0','b1','b2'].some(function(k){return !!component[nodeKey({devId:d.id,key:k})];});
    if(d.type==='mcb1')return !!component[nodeKey({devId:d.id,key:'b0'})];
    if(d.type==='rcd')return !!component[nodeKey({devId:d.id,key:'bL'})];
    return false;
  }
  const candidates=state.devices.filter(protectsFault);
  candidates.sort(function(a,b){
    function priority(d){
      if(isPhaseToPhase)return d.type==='mcb3'?30:(d.type==='mcb1'?20:10);
      return d.type==='mcb1'?30:(d.type==='rcd'?20:10);
    }
    return priority(b)-priority(a);
  });
  const breaker=candidates[0]||null;
  const voltageText = isPhaseToPhase ? '380 В' : '220 В';
  const faultText = isPhaseToPhase ? 'МЕЖФАЗНОЕ КОРОТКОЕ ЗАМЫКАНИЕ' : 'КОРОТКОЕ ЗАМЫКАНИЕ ФАЗА–N/PE';
  const signature=faultText+'|'+fault.node+'|'+Math.round(fault.voltage);

  if(breaker){
    breaker.tripped = true;
    breaker.on = false;
    playBreakerSound(false, true);           // автоматическое отключение от короткого замыкания
    activeShortFaultSignature=signature;
    applyDeviceVisual(breaker);
    const breakerTag = tagOf(breaker.id);
    log('АВАРИЯ: '+faultText+' ('+voltageText+'). Сработал автомат '+breakerTag+'.', 'err');
    showPhaseFault('АВАРИЯ! '+faultText+' · '+voltageText+' — '+breakerTag+' ОТКЛЮЧЁН.');
    renderSide();
    return true;
  }

  // КЗ может быть выполнено прямо на вводных L1/L2/L3, до автоматов.
  // Раньше в этом случае функция молча завершалась, поэтому авария не показывалась.
  if(activeShortFaultSignature!==signature){
    activeShortFaultSignature=signature;
    log('АВАРИЯ: '+faultText+' ('+voltageText+'). Цепь КЗ не проходит через включённый защитный автомат.', 'err');
    showPhaseFault('АВАРИЯ! '+faultText+' · '+voltageText+' — НЕТ ВКЛЮЧЁННОЙ ЗАЩИТЫ В ЭТОЙ ЦЕПИ.');
  }
  return true;
}

function tripFault(){
  const q = inputBreaker();
  if (!q || !q.on) return;
  q.tripped = true; q.on = false;
  playBreakerSound(false, true);             // отключение вводного автомата
  log('КЗ в цепи: вводной автомат сработал (рукоятка в среднем положении). Устраните причину и взведите автомат.', 'err');
  warn('Сработала защита! Автомат в положении «отключено» — сначала взведите его в «0», затем включите.');
  applyDeviceVisual(q);
  renderSide();
}

/* ---------- независимые тепловые реле KK1 / KK2 ---------- */
function relayLive(rel){
  const km = devById(rel.kmId);
  return !!(km && km.coil);
}
function cycleSetpoint(rel){
  rel.set = (rel.set >= 25) ? 17 : rel.set + 1;
  log(tagOf('kk'+rel.id)+': уставка теплового реле — ' + rel.set + ' А (по номинальному току двигателя).', 'info');
  renderAll();
}
function testRelay(rel){
  rel.tested = true;
  rel.tripped = true;
  playRelaySound();                        // срабатывание реле от кнопки TEST
  log(tagOf('kk'+rel.id)+': нажата кнопка TEST — нормально закрытый контакт 95-96 разомкнут, нормально открытый контакт 97-98 замкнут.', 'err');
  warn('Тепловое реле '+tagOf('kk'+rel.id)+' сработало: 95-96 открыт, 97-98 закрыт. Для возврата нажмите RESET.');
  renderAll();
}
function stopRelay(rel){
  if (rel.tripped){ log(tagOf('kk'+rel.id)+': реле уже сработало — для возврата нажмите RESET.', 'info'); renderAll(); return; }
  rel.tripped = true;
  playRelaySound();                        // ручное размыкание контакта 95-96
  log(tagOf('kk'+rel.id)+': нажата красная кнопка STOP — контакт 95-96 разомкнут вручную.', 'warn');
  renderAll();
}
function resetRelay(rel){
  if (!rel.tripped){ log(tagOf('kk'+rel.id)+': реле не срабатывало, возврат не требуется.', 'info'); renderAll(); return; }
  rel.tripped = false;
  rel.tested = false;
  rel.heat = 0;
  playRelaySound();                        // возврат механизма кнопкой RESET
  log(tagOf('kk'+rel.id)+': возврат кнопкой RESET — нормально закрытый контакт 95-96 замкнут, нормально открытый контакт 97-98 разомкнут.', 'ok');
  renderAll();
}

/* ============================================================
   8. ПРОВОДА: клик по винту клеммы — тянем провод, второй клик — соединение
   ============================================================ */
const wireLayer = document.getElementById('wireLayer');
const termLayer = document.getElementById('termLayer');

/* зажимы аппарата в его локальных координатах */
function termDefs(type,obj){
  const t = TYPES[type], w = t.modules*MODULE, h = t.h, out = [];
  if(type==='junction')return junctionTerms();
  if (type === 'mcb3'){
    const cell = w/3;
    ['1','3','5'].forEach(function(l,i){ out.push({key:'t'+i, label:l, dx:(i+0.5)*cell, dy:18,    color:[WC.L1,WC.L2,WC.L3][i]}); });
    ['2','4','6'].forEach(function(l,i){ out.push({key:'b'+i, label:l, dx:(i+0.5)*cell, dy:h-18, color:[WC.L1,WC.L2,WC.L3][i]}); });
    return out;
  }
  if (type === 'mcb1'){
    out.push({key:'t0', label:'1', dx:w/2, dy:18,    color:WC.L1});
    out.push({key:'b0', label:'2', dx:w/2, dy:h-18, color:WC.L1});
    return out;
  }
  if (type === 'rcd'){
    out.push({key:'tL', label:'1', dx:w*0.25, dy:18, color:WC.L1});
    out.push({key:'tN', label:'N', dx:w*0.75, dy:18, color:WC.N});
    out.push({key:'bL', label:'2', dx:w*0.25, dy:h-18, color:WC.L1});
    out.push({key:'bN', label:'N', dx:w*0.75, dy:h-18, color:WC.N});
    return out;
  }
  if (type === 'meter'){
    const xs=[w*.125,w*.375,w*.625,w*.875];
    out.push({key:'L_in',  label:'1 · L вход',  dx:xs[0], dy:h-18, color:WC.L1});
    out.push({key:'L_out', label:'2 · L выход', dx:xs[1], dy:h-18, color:WC.L1});
    out.push({key:'N_in',  label:'3 · N вход',  dx:xs[2], dy:h-18, color:WC.N});
    out.push({key:'N_out', label:'4 · N выход', dx:xs[3], dy:h-18, color:WC.N});
    return out;
  }
  if (type === 'sensor'){
    out.push({key:'L_in',label:'L · вход',dx:w*.25,dy:19,color:WC.L1});
    out.push({key:'N_in',label:'N · вход',dx:w*.75,dy:19,color:WC.N});
    out.push({key:'L_out',label:'L · выход',dx:w*.25,dy:h-19,color:WC.L1});
    out.push({key:'N_out',label:'N · выход',dx:w*.75,dy:h-19,color:WC.N});
    return out;
  }
  if (type === 'lamp'){
    out.push({key:'t0', label:'L', dx:w/2, dy:18,   color:WC.L1});
    out.push({key:'b0', label:'N', dx:w/2, dy:h-18, color:WC.N});
    return out;
  }
  if (type === 'bulb'){
    out.push({key:'L',label:'L',dx:w*.28,dy:147,color:WC.L1});
    out.push({key:'N',label:'N',dx:w*.72,dy:147,color:WC.N});
    return out;
  }
  if (type === 'outlet'){
    const c1=w*.28,c2=w*.72;
    out.push({key:'L',label:'L · ввод',dx:w*.32,dy:21,color:WC.L1,hitR:8.5});
    out.push({key:'N',label:'N · ввод',dx:w*.50,dy:21,color:WC.N,hitR:8.5});
    out.push({key:'PE',label:'PE · ввод',dx:w*.68,dy:21,color:WC.PE,hitR:8.5});
    out.push({key:'s1L',label:'розетка 1 · L',dx:c1-14,dy:108,color:WC.L1,hitR:8});
    out.push({key:'s1N',label:'розетка 1 · N',dx:c1+14,dy:108,color:WC.N,hitR:8});
    out.push({key:'s1PEt',label:'розетка 1 · PE верх',dx:c1,dy:76,color:WC.PE,hitR:8});
    out.push({key:'s1PEb',label:'розетка 1 · PE низ',dx:c1,dy:140,color:WC.PE,hitR:8});
    out.push({key:'s2L',label:'розетка 2 · L',dx:c2-14,dy:108,color:WC.L1,hitR:8});
    out.push({key:'s2N',label:'розетка 2 · N',dx:c2+14,dy:108,color:WC.N,hitR:8});
    out.push({key:'s2PEt',label:'розетка 2 · PE верх',dx:c2,dy:76,color:WC.PE,hitR:8});
    out.push({key:'s2PEb',label:'розетка 2 · PE низ',dx:c2,dy:140,color:WC.PE,hitR:8});
    return out;
  }
  if (TYPES[type].kind === 'appliance'){
    out.push({key:'L',label:'L · питание',dx:w*.25,dy:23,color:WC.L1,hitR:9});
    out.push({key:'N',label:'N · нейтраль',dx:w*.50,dy:23,color:WC.N,hitR:9});
    out.push({key:'PE',label:'PE · корпус',dx:w*.75,dy:23,color:WC.PE,hitR:9});
    return out;
  }
  if (type === 'wallSwitch'){
    const gangs=Number(obj&&obj.gangs)===2?2:1;
    if(gangs===2){
      out.push({key:'L',label:'L · общий вход',dx:w*.22,dy:23,color:WC.L1,hitR:9});
      out.push({key:'O1',label:'1 · выход',dx:w*.50,dy:23,color:WC.C,hitR:9});
      out.push({key:'O2',label:'2 · выход',dx:w*.78,dy:23,color:WC.C2,hitR:9});
    }else{
      out.push({key:'L',label:'L · вход',dx:w*.32,dy:23,color:WC.L1,hitR:9});
      out.push({key:'O1',label:'1 · выход',dx:w*.68,dy:23,color:WC.C,hitR:9});
    }
    return out;
  }
  if (type === 'twoWaySwitch'){
    out.push({key:'L',label:'L · общий контакт',dx:w*.22,dy:23,color:WC.L1,hitR:9});
    out.push({key:'O1',label:'1 · перекидной выход',dx:w*.50,dy:23,color:WC.C,hitR:9});
    out.push({key:'O2',label:'2 · перекидной выход',dx:w*.78,dy:23,color:WC.C2,hitR:9});
    return out;
  }
  if (type === 'vfd'){
    out.push({key:'R',label:'R/L1 · вход',dx:w/6,dy:18,color:WC.L1,hitR:10});
    out.push({key:'S',label:'S/L2 · вход',dx:w/2,dy:18,color:WC.L2,hitR:10});
    out.push({key:'T',label:'T/L3 · вход',dx:w*5/6,dy:18,color:WC.L3,hitR:10});
    out.push({key:'U',label:'U · выход',dx:w*.125,dy:h-18,color:WC.L1,hitR:10});
    out.push({key:'V',label:'V · выход',dx:w*.375,dy:h-18,color:WC.L2,hitR:10});
    out.push({key:'W',label:'W · выход',dx:w*.625,dy:h-18,color:WC.L3,hitR:10});
    out.push({key:'PE',label:'PE · корпус',dx:w*.875,dy:h-18,color:WC.PE,hitR:10});
    return out;
  }
  if (type === 'tp'){
    out.push({key:'R',label:'R/L1 · вход',dx:w/6,dy:18,color:WC.L1,hitR:10});
    out.push({key:'S',label:'S/L2 · вход',dx:w/2,dy:18,color:WC.L2,hitR:10});
    out.push({key:'T',label:'T/L3 · вход',dx:w*5/6,dy:18,color:WC.L3,hitR:10});
    [['ya1','Я+ · якорь',WC.C],['ya2','Я− · якорь',WC.C2],
     ['sh1','Ш+ · возбуждение',WC.L1],['sh2','Ш− · возбуждение',WC.L3],
     ['PE','PE · корпус',WC.PE]].forEach(function(row,index){
      out.push({key:row[0],label:row[1],dx:w*(.1+.2*index),dy:h-18,color:row[2],hitR:10});
    });
    return out;
  }
  if (type === 'timer'){
    const xs=[10,w/2,w-10];
    ['A1','S','A2'].forEach(function(key,i){out.push({key:key,label:key,dx:xs[i],dy:22,color:key==='A2'?WC.N:WC.C,hitR:7.5});});
    ['15','16','18'].forEach(function(key,i){out.push({key:key,label:key,dx:xs[i],dy:h-22,color:WC.C,hitR:7.5});});
    return out;
  }
  if (type === 'klemma' || type === 'pebus'){
    // Все шесть зажимов соответствующей шины соединены внутри.
    const color = type === 'pebus' ? WC.PE : WC.N;
    for (let i=0;i<6;i++) out.push({key:'k'+i, label:String(i+1), dx:w/2, dy:(i+0.5)*h/6, color:color});
    return out;
  }
  if (type === 'km1'){
    const cell = w/4, ph = [WC.L1, WC.L2, WC.L3];
    ['1 L1','3 L2','5 L3','13 НО'].forEach(function(l,i){ out.push({key:'t'+i, label:l, dx:(i+0.5)*cell, dy:34,  color:i<3?ph[i]:WC.C}); });
    ['2 T1','4 T2','6 T3','14 НО'].forEach(function(l,i){ out.push({key:'b'+i, label:l, dx:(i+0.5)*cell, dy:h-34, color:i<3?ph[i]:WC.C}); });
    out.push({key:'a53', label:'53 НО', dx:59.75, dy:104, color:WC.C});
    out.push({key:'a61', label:'61 НЗ', dx:97.75, dy:104, color:WC.C2});
    out.push({key:'a54', label:'54 НО', dx:59.75, dy:144, color:WC.C});
    out.push({key:'a62', label:'62 НЗ', dx:97.75, dy:144, color:WC.C2});
    const coilPadTop=(h-150)/2;
    out.push({key:'A1', label:'A1', dx:w-1.5+PAD_W/2, dy:coilPadTop+18, color:WC.C});
    out.push({key:'A2', label:'A2', dx:w-1.5+PAD_W/2, dy:coilPadTop+132, color:WC.C2});
    return out;
  }
  if (type === 'kk1'){
    const cell = TYPES.km1.modules*MODULE/4;
    ['98','97','96','95'].forEach(function(l,i){ out.push({key:'r'+i, label:l, dx:(i+0.5)*cell, dy:140, color:i<2?WC.C:WC.C2}); });
    ['2 T1','4 T2','6 T3'].forEach(function(l,i){ out.push({key:'p'+i, label:l, dx:(i+0.5)*cell, dy:196, color:[WC.L1,WC.L2,WC.L3][i]}); });
    return out;
  }
  return out;
}
function originOf(dev){
  if (dev.type === 'kk1'){
    const km = devById(dev.kmId);
    if (!km) return null;
    const ko = originOf(km);
    return { x:ko.x, y:ko.y + TYPES.km1.h - RELAY_DROP };
  }
  if (isFinite(dev.x) && isFinite(dev.y)) return { x:dev.x, y:dev.y };
  const rail=mountingRail(dev.rail);
  return rail?{x:rail.x+dev.slot*MODULE,y:rail.y-TYPES[dev.type].h/2}:{x:0,y:0};
}
function terminal(devId, key){
  if (String(devId).indexOf('PB') === 0){
    const pb=pushbuttonById(devId);if(!pb)return null;
    const m = PB_TERMS.filter(function(t){ return t.key === key; })[0];
    if (!m) return null;
    return { devId:pb.id, key:key, label:m.label, color:m.color, x:pb.x+m.dx, y:pb.y+m.dy };
  }
  if (String(devId).match(/^(M|MD)\d+$/)){                // зажимы двигателя или машины постоянного тока
    const motor=motorById(devId);if(!motor)return null;
    const terms=motorIsDc(motor)?DC_MOTOR_TERMS:MOTOR_TERMS;
    const m = terms.filter(function(t){ return t.key === key; })[0];
    if (!m) return null;
    return { devId:motor.id, key:key, label:m.label, color:m.color,
             x:motor.x + m.dx*motor.scale, y:motor.y + m.dy*motor.scale };
  }
  if (String(devId) === 'IN'){                     // зажимы клеммной коробки ввода
    syncPanelInbox();
    const m = inboxTerms().filter(function(t){ return t.key === key; })[0];
    if (!m) return null;
    return { devId:'IN', key:key, label:m.label, color:m.color, x:INBOX.x + m.dx, y:INBOX.y + m.dy };
  }
  const relay = (typeof devId === 'string' && devId.indexOf('kk') === 0);
  let dev;
  if (relay){
    const r = anyRelayById(+devId.slice(2));
    if (!r) return null;
    dev = { id:devId, type:'kk1', kmId:r.kmId };
  } else {
    dev = devById(+devId);
  }
  if (!dev) return null;
  const o = originOf(dev); if (!o) return null;
  const d = termDefs(dev.type,dev).filter(function(t){ return t.key === key; })[0];
  if (!d) return null;
  return { devId: dev.id, key: key, label: d.label, color: d.color, x: o.x + d.dx, y: o.y + d.dy };
}
function tagOf(devId){
  if (String(devId).indexOf('PB')===0){const pb=pushbuttonById(devId);return pb?pb.tag:'SB';}
  if (String(devId).match(/^(M|MD)\d+$/)){const motor=motorById(devId);return motor?(motor.tag||motor.id):String(devId);}
  if (String(devId) === 'IN') return (state.specialProps&&state.specialProps.inbox&&state.specialProps.inbox.tag)||TAGS.IN;
  if (typeof devId === 'string' && devId.indexOf('kk') === 0){
    const rel = anyRelayById(+devId.slice(2));
    if (!rel) return 'KK';
    return rel.tag || 'KK';
  }
  const dev = devById(+devId);
  if (!dev) return '—';
  return dev.tag || TAGS[dev.type];
}
/* идентификатор из data-атрибута: число для аппарата на рейке, строка для реле и двигателя */
function toDevId(v){
  return isFinite(+v) && String(+v) === String(v) ? +v : v;
}

/* --- отрисовка проводов, клемм и списка --- */
function wireD(ax, ay, bx, by){
  const my = (ay + by)/2;
  return 'M '+ax+','+ay+' C '+ax+','+my+' '+bx+','+my+' '+bx+','+by;
}
/* середина провода: по ней провод можно «взять» и изменить его форму */
function wirePointList(a, b, wr){
  const pts = (wr && wr.pts) ? wr.pts : [];
  const shape = (wr && (wr.previewShape || wr.shape)) || 'smooth';
  if (shape === 'arc') return [arcShapeGeometry(a,b,wr).handle];
  if (shape === 's') return [sShapeGeometry(a,b,wr).handle];
  if (shape === 'orthogonal'){
    const g=roundedOrthogonalGeometry(orthogonalRoute(wireNodes(a,b,wr)),12);
    if(pts.length)return pts.map(function(p){return nearestOnPolyline(p,g.samples);});
    return [pointHalfwayOnPolyline(g.samples)];
  }
  if (pts.length) return pts;
  return [{ x:(a.x+b.x)/2, y:(a.y+b.y)/2 }];       // пока изгибов нет — одна точка посередине
}
function wireNodes(a, b, wr){
  const pts = (wr && wr.pts) ? wr.pts : [];
  return [{ x:a.x, y:a.y }].concat(pts.map(function(p){ return { x:p.x, y:p.y }; }), [{ x:b.x, y:b.y }]);
}

/* Строим горизонтально-вертикальную трассу, а затем заменяем каждую острую
   вершину короткой квадратичной дугой. Прямые участки остаются строго
   горизонтальными или вертикальными. */
function orthogonalRoute(nodes){
  if(!nodes.length)return [];
  const out=[{x:nodes[0].x,y:nodes[0].y}];
  function push(p){
    const last=out[out.length-1];
    if(!last||Math.abs(last.x-p.x)>.001||Math.abs(last.y-p.y)>.001)out.push({x:p.x,y:p.y});
  }
  for(let i=1;i<nodes.length;i++){
    const p=nodes[i-1],q=nodes[i];
    if(Math.abs(q.x-p.x)>=Math.abs(q.y-p.y))push({x:q.x,y:p.y});
    else push({x:p.x,y:q.y});
    push(q);
  }
  return out;
}
function roundedOrthogonalGeometry(points,radius){
  if(!points.length)return {d:'',samples:[]};
  let d='M '+points[0].x+','+points[0].y;
  const samples=[{x:points[0].x,y:points[0].y}];
  for(let i=1;i<points.length-1;i++){
    const a=points[i-1],c=points[i],b=points[i+1];
    const ax=c.x-a.x,ay=c.y-a.y,bx=b.x-c.x,by=b.y-c.y;
    const la=Math.hypot(ax,ay),lb=Math.hypot(bx,by);
    const cross=ax*by-ay*bx;
    if(!la||!lb||Math.abs(cross)<.001){d+=' L '+c.x+','+c.y;samples.push({x:c.x,y:c.y});continue;}
    const r=Math.min(radius,la*.45,lb*.45);
    const before={x:c.x-ax/la*r,y:c.y-ay/la*r};
    const after={x:c.x+bx/lb*r,y:c.y+by/lb*r};
    d+=' L '+before.x+','+before.y+' Q '+c.x+','+c.y+' '+after.x+','+after.y;
    samples.push(before);
    for(let step=1;step<=4;step++){
      const t=step/4,u=1-t;
      samples.push({x:u*u*before.x+2*u*t*c.x+t*t*after.x,
                    y:u*u*before.y+2*u*t*c.y+t*t*after.y});
    }
  }
  const last=points[points.length-1];
  d+=' L '+last.x+','+last.y;samples.push({x:last.x,y:last.y});
  return {d:d,samples:samples};
}
function nearestOnPolyline(p,points){
  let best={x:p.x,y:p.y},dist=Infinity;
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;
    const t=len2?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len2)):0;
    const q={x:a.x+dx*t,y:a.y+dy*t},d=Math.hypot(p.x-q.x,p.y-q.y);
    if(d<dist){dist=d;best=q;}
  }
  return best;
}
function pointHalfwayOnPolyline(points){
  if(!points.length)return {x:0,y:0};
  let total=0,lengths=[];
  for(let i=0;i<points.length-1;i++){const l=Math.hypot(points[i+1].x-points[i].x,points[i+1].y-points[i].y);lengths.push(l);total+=l;}
  let target=total/2;
  for(let i=0;i<lengths.length;i++){
    if(target<=lengths[i]){const t=lengths[i]?target/lengths[i]:0;return {x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t};}
    target-=lengths[i];
  }
  return points[points.length-1];
}
/* гладкая кривая через все узлы (Catmull-Rom → кубические Безье) */
function catmullPath(nodes){
  if (!nodes.length) return '';
  let s = 'M '+nodes[0].x+','+nodes[0].y;
  for (let i=0;i<nodes.length-1;i++){
    const p0 = nodes[Math.max(0,i-1)], p1 = nodes[i], p2 = nodes[i+1], p3 = nodes[Math.min(nodes.length-1,i+2)];
    const c1x = p1.x + (p2.x-p0.x)/6, c1y = p1.y + (p2.y-p0.y)/6;
    const c2x = p2.x - (p3.x-p1.x)/6, c2y = p2.y - (p3.y-p1.y)/6;
    s += ' C '+c1x+','+c1y+' '+c2x+','+c2y+' '+p2.x+','+p2.y;
  }
  return s;
}
function arcShapeGeometry(a,b,wr){
  const dx=b.x-a.x,dy=b.y-a.y,h=Math.min(260,Math.max(55,Math.hypot(dx,dy)*0.50));
  let control;
  if(Math.abs(dx)>=Math.abs(dy)) control={x:(a.x+b.x)/2,y:Math.min(a.y,b.y)-h};
  else control={x:Math.max(a.x,b.x)+h,y:(a.y+b.y)/2};
  let handle={x:(a.x+2*control.x+b.x)/4,y:(a.y+2*control.y+b.y)/4};
  const pts=(wr&&wr.pts)||[];
  const useStored=pts.length && !wr.previewShape && wr.shape==='arc';
  if(useStored){
    handle={x:pts[0].x,y:pts[0].y};
    control={x:2*handle.x-(a.x+b.x)/2,y:2*handle.y-(a.y+b.y)/2};
  }
  return {control:control,handle:handle};
}
function sShapeGeometry(a,b,wr){
  let c1,c2;
  if(Math.abs(b.x-a.x)>=Math.abs(b.y-a.y)){
    const dx=b.x-a.x,amp=Math.min(100,Math.max(28,Math.abs(dx)*0.22));
    c1={x:a.x+dx*.33,y:a.y-amp}; c2={x:a.x+dx*.67,y:b.y+amp};
  } else {
    const dy=b.y-a.y,amp=Math.min(100,Math.max(28,Math.abs(dy)*0.22));
    c1={x:a.x+amp,y:a.y+dy*.33}; c2={x:b.x-amp,y:a.y+dy*.67};
  }
  let handle={x:(a.x+3*c1.x+3*c2.x+b.x)/8,y:(a.y+3*c1.y+3*c2.y+b.y)/8};
  const pts=(wr&&wr.pts)||[];
  const useStored=pts.length && !wr.previewShape && wr.shape==='s';
  if(useStored){
    const dx=(pts[0].x-handle.x)/0.75,dy=(pts[0].y-handle.y)/0.75;
    c1={x:c1.x+dx,y:c1.y+dy}; c2={x:c2.x+dx,y:c2.y+dy};
    handle={x:pts[0].x,y:pts[0].y};
  }
  return {c1:c1,c2:c2,handle:handle};
}
function wirePathD(a, b, wr){
  const pts = (wr && wr.pts) ? wr.pts : [];
  const shape = (wr && (wr.previewShape || wr.shape)) || 'smooth';
  const nodes = wireNodes(a, b, wr);
  if (shape === 'straight'){
    return nodes.map(function(p,i){ return (i?' L ':'M ')+p.x+','+p.y; }).join('');
  }
  if (shape === 'orthogonal'){
    return roundedOrthogonalGeometry(orthogonalRoute(nodes),12).d;
  }
  if (shape === 'arc'){
    const g=arcShapeGeometry(a,b,wr);
    return 'M '+a.x+','+a.y+' Q '+g.control.x+','+g.control.y+' '+b.x+','+b.y;
  }
  if (shape === 's'){
    const g=sShapeGeometry(a,b,wr);
    return 'M '+a.x+','+a.y+' C '+g.c1.x+','+g.c1.y+' '+g.c2.x+','+g.c2.y+' '+b.x+','+b.y;
  }
  if (!pts.length) return wireD(a.x, a.y, b.x, b.y);
  return catmullPath(nodes);
}
/* расстояние от точки до отрезка — для вставки новой точки в нужное место провода */
function distToSeg(p, a, b){
  const dx = b.x-a.x, dy = b.y-a.y;
  const len2 = dx*dx + dy*dy;
  let t = len2 ? ((p.x-a.x)*dx + (p.y-a.y)*dy)/len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x+dx*t), p.y - (a.y+dy*t));
}
function renderWires(){
  let s = '';
  state.wires.forEach(function(wr){
    const a = terminal(wr.a.devId, wr.a.key), b = terminal(wr.b.devId, wr.b.key);
    if (!a || !b) return;
    const wireColor = wr.color || a.color;
    const d = wirePathD(a, b, wr);
    const grabbing = (wireGrab && wireGrab.id === wr.id) ? ' grabbing' : '';
    let dots = '';
    wirePointList(a, b, wr).forEach(function(p){
      dots += '<circle class="wire-dot" cx="'+p.x+'" cy="'+p.y+'" r="4.5" fill="'+wireColor+'" stroke="#ffffff" stroke-width="1.2" pointer-events="none"/>';
    });
    s += '<g class="wireG'+grabbing+'" data-wid="'+wr.id+'">'
       +   '<path class="wire" d="'+d+'" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="6.5" stroke-linecap="round"/>'
       +   wireStrokeGeom(d, wireColor, 'wire')
       +   dots
       +   '<path class="wire-hit" d="'+d+'" fill="none" stroke="transparent" stroke-width="16" stroke-linecap="round" pointer-events="stroke"/>'
       + '</g>';
  });
  if (pending && pending.pt){
    const a = terminal(pending.from.devId, pending.from.key);
    if (a){
      const d = wirePathD(a, { x:pending.pt.x, y:pending.pt.y }, { pts:pending.pts || [], shape:pending.shape || wireDefaults.shape });
      const pendingColor = pending.color || wireDefaults.color;
      s += '<path d="'+d+'" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="6.5" stroke-linecap="round"/>';
      s += wireStrokeGeom(d, pendingColor, null, true);
      (pending.pts || []).forEach(function(p){
        s += '<circle cx="'+p.x+'" cy="'+p.y+'" r="4.5" fill="'+pendingColor+'" stroke="#fff" stroke-width="1.2" pointer-events="none"/>';
      });
    }
  }
  wireLayer.innerHTML = s;
}
function renderTerminals(){
  let s = '';
  function one(devId, type, obj){
    termDefs(type,obj).forEach(function(td){
      const p = terminal(devId, td.key);
      if (!p) return;
      s += '<circle class="term" data-dev="'+devId+'" data-key="'+td.key+'" cx="'+p.x+'" cy="'+p.y+'" r="'+(td.hitR||11)+'" fill="transparent" pointer-events="all">'
         + '<title>'+tagOf(devId)+' · зажим '+td.label+' — щёлкните, чтобы тянуть провод</title></circle>';
    });
  }
  state.devices.forEach(function(d){ one(d.id, d.type, d); });
  state.relays.forEach(function(r){ one('kk'+r.id, 'kk1'); });
  state.motors.forEach(function(motor){
    const terms=motorIsDc(motor)?DC_MOTOR_TERMS:MOTOR_TERMS;
    terms.forEach(function(td){
      const p = terminal(motor.id, td.key);
      if (!p) return;
      s += '<circle class="term" data-dev="'+motor.id+'" data-key="'+td.key+'" cx="'+p.x+'" cy="'+p.y+'" r="9" fill="transparent" pointer-events="all">'
         + '<title>'+escapeHtml(motor.id)+' · зажим '+escapeHtml(td.label)+' — щёлкните, чтобы тянуть провод</title></circle>';
    });
  });
  if(state.special.inbox) inboxTerms().forEach(function(td){
    const p = terminal('IN', td.key);
    if (!p) return;
    s += '<circle class="term" data-dev="IN" data-key="'+td.key+'" cx="'+p.x+'" cy="'+p.y+'" r="11" fill="transparent" pointer-events="all">'
       + '<title>XT1 · зажим '+td.label+' — щёлкните, чтобы тянуть провод</title></circle>';
  });
  state.pushbuttons.forEach(function(pb){
    PB_TERMS.forEach(function(td){
      const p = terminal(pb.id, td.key);
      if (!p) return;
      s += '<circle class="term" data-dev="'+pb.id+'" data-key="'+td.key+'" cx="'+p.x+'" cy="'+p.y+'" r="11" fill="transparent" pointer-events="all">'
         + '<title>'+pb.tag+' · зажим '+td.label+' — щёлкните, чтобы тянуть провод</title></circle>';
    });
  });
  // щупы мультиметра
  const probes = [[state.mm.a, '#e01b1b'], [state.mm.b, '#111111']];
  probes.forEach(function(pr){
    if (!pr[0]) return;
    const p = terminal(pr[0].devId, pr[0].key);
    if (!p) return;
    s += '<circle cx="'+p.x+'" cy="'+p.y+'" r="15" fill="none" stroke="'+pr[1]+'" stroke-width="3.2" pointer-events="none"/>';
  });
  if(meterProbeHover){
    s += '<circle cx="'+meterProbeHover.x+'" cy="'+meterProbeHover.y+'" r="11" fill="rgba(245,166,35,.35)" stroke="#f5a623" stroke-width="2" pointer-events="none"/>';
  }
  termLayer.innerHTML = s;
  // Если щуп защёлкнут на клемме, его корпус и кабель следуют за аппаратом.
  renderMM();
}

/* Координаты всех доступных клемм для магнитных направляющих. */
function terminalGuidePoints(){
  const points=[],seen={};
  function add(devId,type,obj){
    termDefs(type,obj).forEach(function(td){
      const p=terminal(devId,td.key); if(!p)return;
      const key=Math.round(p.x*10)+'/'+Math.round(p.y*10);
      if(!seen[key]){seen[key]=true;points.push(p);}
    });
  }
  state.devices.forEach(function(d){add(d.id,d.type,d);});
  state.relays.forEach(function(r){add('kk'+r.id,'kk1');});
  state.motors.forEach(function(motor){(motorIsDc(motor)?DC_MOTOR_TERMS:MOTOR_TERMS).forEach(function(td){const p=terminal(motor.id,td.key);if(p){const k=Math.round(p.x*10)+'/'+Math.round(p.y*10);if(!seen[k]){seen[k]=true;points.push(p);}}});});
  if(state.special.inbox)inboxTerms().forEach(function(td){const p=terminal('IN',td.key);if(p){const k=Math.round(p.x*10)+'/'+Math.round(p.y*10);if(!seen[k]){seen[k]=true;points.push(p);}}});
  state.pushbuttons.forEach(function(pb){PB_TERMS.forEach(function(td){const p=terminal(pb.id,td.key);if(p){const k=Math.round(p.x*10)+'/'+Math.round(p.y*10);if(!seen[k]){seen[k]=true;points.push(p);}}});});
  return points;
}
function snapPendingPoint(raw){
  const p={x:raw.x,y:raw.y};
  if(!terminalGuidesEnabled||!pending)return p;
  const points=terminalGuidePoints(),showDistance=28,snapDistance=13;
  let nx=null,ny=null,dx=Infinity,dy=Infinity;
  points.forEach(function(t){
    const tx=Math.abs(t.x-p.x),ty=Math.abs(t.y-p.y);
    if(tx<dx){dx=tx;nx=t.x;}
    if(ty<dy){dy=ty;ny=t.y;}
  });
  pending.guideX=dx<=showDistance?nx:null;
  pending.guideY=dy<=showDistance?ny:null;
  if(dx<=snapDistance)p.x=nx;
  if(dy<=snapDistance)p.y=ny;
  return p;
}
/* Направляющие видны только при прокладке и только рядом с курсором. */
function renderTerminalGuides(){
  if(!guideLayer)return;
  if(!terminalGuidesEnabled||!pending){guideLayer.innerHTML='';return;}
  let s='';
  if(pending.guideX!==null&&pending.guideX!==undefined)s+='<line x1="'+pending.guideX+'" y1="-260" x2="'+pending.guideX+'" y2="'+(VH+260)+'" stroke="#e887aa" stroke-width="0.7" opacity=".7" pointer-events="none"/>';
  if(pending.guideY!==null&&pending.guideY!==undefined)s+='<line x1="-260" y1="'+pending.guideY+'" x2="'+(VW+260)+'" y2="'+pending.guideY+'" stroke="#e887aa" stroke-width="0.7" opacity=".7" pointer-events="none"/>';
  guideLayer.innerHTML=s;
}

/* --- взаимодействие --- */
let pending = null;
let wireGrab = null;
let wireMenu = { wid:null, x:0, y:0 };
let wireShapePreviewId = null;
let wireSeq = 1;
function sameTerm(a, devId, key){ return String(a.devId) === String(devId) && a.key === key; }
function wireExists(d1, k1, d2, k2){
  return state.wires.some(function(w){
    return (sameTerm(w.a,d1,k1) && sameTerm(w.b,d2,k2)) || (sameTerm(w.a,d2,k2) && sameTerm(w.b,d1,k1));
  });
}
function removeWiresFor(devId){
  const before = state.wires.length;
  state.wires = state.wires.filter(function(w){
    return String(w.a.devId) !== String(devId) && String(w.b.devId) !== String(devId);
  });
  return before - state.wires.length;
}
function cancelWire(){
  if (!pending) return;
  pending = null;
  renderTerminalGuides();
  renderWires();
}
function connectTerminals(devId, key){
  if (!pending) return;
  const a = terminal(pending.from.devId, pending.from.key), b = terminal(devId, key);
  if (!a || !b || (String(a.devId) === String(b.devId) && a.key === b.key)){
    pending = null; renderTerminalGuides(); renderWires(); return;
  }
  if (wireExists(a.devId, a.key, b.devId, b.key)){
    warn('Эти зажимы уже соединены проводом.');
    pending = null; renderTerminalGuides(); renderWires(); renderTerminals(); return;
  }
  state.wires.push({ id: wireSeq++, a:{ devId:a.devId, key:a.key }, b:{ devId:b.devId, key:b.key },
                     color:pending.color || wireDefaults.color, shape:pending.shape || wireDefaults.shape,
                     pts:(pending.pts || []).map(function(p){ return {x:p.x,y:p.y}; }) });
  log('Провод проложен: ' + tagOf(a.devId)+' : '+a.label + ' — ' + tagOf(b.devId)+' : '+b.label + '.', 'ok');
  pending = null;
  renderAll();
}

termLayer.addEventListener('pointerdown', function(evt){
  const hit = evt.target.closest('.term');
  if (!hit || evt.button !== 0) return;
  evt.preventDefault();
  const devId = hit.dataset.dev, key = hit.dataset.key;
  const id = toDevId(devId);
  if (state.mm.mode){ mmPick(id, key); return; }     // в режиме мультиметра ставим щуп
  if (pending){ connectTerminals(id, key); return; }
  const t = terminal(id, key);
  if (!t) return;
  pending = { from:{ devId:id, key:key }, pt:{ x:t.x, y:t.y }, pts:[], color:wireDefaults.color, shape:wireDefaults.shape, guideX:null, guideY:null };
  log('Провод: начало на зажиме ' + tagOf(id)+' : '+t.label + ' — ЛКМ на поле добавляет точку маршрута; клик по второй клемме завершает провод.', 'info');
  renderTerminalGuides();
  renderWires();
});
document.addEventListener('pointermove', function(evt){
  if (wireGrab){                                   // тянем точку изгиба — форма меняется
    const wr = state.wires.filter(function(x){ return x.id === wireGrab.id; })[0];
    if (wr){
      const p = svgPoint(evt);
      if (isFinite(p.x) && isFinite(p.y)){
        if (!wr.pts) wr.pts = [];
        wr.pts[wireGrab.idx] = { x:p.x, y:p.y };
        renderWires();
      }
    }
    return;
  }
  if (!pending) return;
  const raw = svgPoint(evt);
  if (!isFinite(raw.x) || !isFinite(raw.y)) return;
  pending.pt = snapPendingPoint(raw);
  renderTerminalGuides();
  renderWires();
});
document.addEventListener('pointerup', function(evt){
  if (wireGrab){
    const wr = state.wires.filter(function(x){ return x.id === wireGrab.id; })[0];
    if (wr) trace('Форма провода изменена перетаскиванием (контакты на клеммах не тронуты).');
    wireGrab = null;
    renderAll();
    return;
  }
  if (!pending || evt.button !== 0) return;
  const el2 = document.elementFromPoint ? document.elementFromPoint(evt.clientX, evt.clientY) : null;
  const hit = (el2 && el2.closest && el2.closest('.term')) || (evt.pointerType==='touch'&&nearestTouchTerminal(evt));
  if (!hit) return;                                   // провод остаётся за курсором: ждём второй клик
  const devId = hit.dataset.dev, key = hit.dataset.key;
  const id = toDevId(devId);
  if (sameTerm(pending.from, id, key)) return;
  connectTerminals(id, key);
});
scene.addEventListener('pointerdown', function(evt){
  if (!pending || evt.target.closest('.term')) return;
  // Средняя кнопка предназначена для панорамирования и не отменяет провод.
  if (evt.button === 1) return;
  if (evt.button === 0){
    evt.preventDefault();
    evt.stopPropagation();
    const raw = svgPoint(evt);
    if (!isFinite(raw.x) || !isFinite(raw.y)) return;
    const p = snapPendingPoint(raw);
    pending.pts = pending.pts || [];
    pending.pts.push({ x:p.x, y:p.y });
    pending.pt = { x:p.x, y:p.y };
    log('Добавлена точка маршрута провода №'+pending.pts.length+'. Продолжайте прокладку.', 'info');
    renderTerminalGuides();
    renderWires();
    return;
  }
  if(evt.button===2)cancelWire();
}, true);
document.addEventListener('keydown', function(evt){ if (evt.key === 'Escape'){ cancelWire(); hideWireMenu(); } });

/* ЛКМ по проводу — взяли за ближайшую точку и меняем форму, не отрывая контакты */
wireLayer.addEventListener('pointerdown', function(evt){
  const g = evt.target.closest ? evt.target.closest('[data-wid]') : null;
  if (!g || evt.button !== 0) return;
  evt.preventDefault();
  cancelWire();
  hideWireMenu();
  const id = +g.dataset.wid;
  const wr = state.wires.filter(function(x){ return x.id === id; })[0];
  if (!wr) return;
  const a = terminal(wr.a.devId, wr.a.key), b = terminal(wr.b.devId, wr.b.key);
  if (!a || !b) return;
  if (!wr.pts) wr.pts = [];
  if (!wr.pts.length){
    const handles = wirePointList(a,b,wr);
    wr.pts.push({ x:handles[0].x, y:handles[0].y });
  }
  const p = svgPoint(evt);
  if (!isFinite(p.x) || !isFinite(p.y)) return;
  let idx = 0, best = Infinity;
  wr.pts.forEach(function(q,i){ const d = Math.hypot(q.x-p.x, q.y-p.y); if (d < best){ best = d; idx = i; } });
  wr.pts[idx] = { x:p.x, y:p.y };
  wireGrab = { id:id, idx:idx };
  renderWires();
});

/* ПКМ по проводу — меню: добавить/удалить точку изгиба или удалить провод */
function showWireMenu(wid, clientX, clientY, sp){
  wireMenu = { wid:wid, x:sp.x, y:sp.y };
  const m = document.getElementById('wireMenu');
  if (!m) return;
  m.style.display = 'block';
  m.classList.toggle('flip-sub', clientX + 380 > window.innerWidth);
  m.classList.toggle('raise-sub', clientY + 430 > window.innerHeight);
  const box = m.getBoundingClientRect();
  m.style.left = Math.max(6, Math.min(clientX, window.innerWidth-box.width-6)) + 'px';
  m.style.top  = Math.max(6, Math.min(clientY, window.innerHeight-box.height-6)) + 'px';
}
function hideWireMenu(){
  const m = document.getElementById('wireMenu');
  if (m) m.style.display = 'none';
  if(m)m.querySelectorAll('.menu-sub.open').forEach(function(sub){sub.classList.remove('open');const b=sub.querySelector('.submenu-trigger');if(b)b.setAttribute('aria-expanded','false');});
  clearWireShapePreview();
  wireMenu = { wid:null, x:0, y:0 };
}
function currentMenuWire(){
  return state.wires.filter(function(x){ return x.id === wireMenu.wid; })[0] || null;
}
function previewWireShape(shape){
  const wr = currentMenuWire();
  if (!wr) return;
  if (wireShapePreviewId !== null && wireShapePreviewId !== wr.id){
    const old = state.wires.filter(function(x){ return x.id === wireShapePreviewId; })[0];
    if (old) delete old.previewShape;
  }
  wr.previewShape = shape;
  wireShapePreviewId = wr.id;
  renderWires();
}
function clearWireShapePreview(){
  if (wireShapePreviewId === null) return;
  const wr = state.wires.filter(function(x){ return x.id === wireShapePreviewId; })[0];
  if (wr) delete wr.previewShape;
  wireShapePreviewId = null;
  renderWires();
}
function addWirePoint(){
  const wr = currentMenuWire();
  const p = { x:wireMenu.x, y:wireMenu.y };
  hideWireMenu();
  if (!wr) return;
  const a = terminal(wr.a.devId, wr.a.key), b = terminal(wr.b.devId, wr.b.key);
  if (!a || !b) return;
  if (!wr.pts) wr.pts = [];
  const nodes = wireNodes(a, b, wr);
  let seg = 0, best = Infinity;
  for (let i=0;i<nodes.length-1;i++){
    const d = distToSeg(p, nodes[i], nodes[i+1]);
    if (d < best){ best = d; seg = i; }
  }
  wr.pts.splice(seg, 0, p);
  trace('На проводе добавлена точка изгиба (всего точек: '+wr.pts.length+').');
  renderAll();
}
function delWirePoint(){
  const wr = currentMenuWire();
  const p = { x:wireMenu.x, y:wireMenu.y };
  hideWireMenu();
  if (!wr) return;
  if (!wr.pts || !wr.pts.length){ warn('У этого провода нет точек изгиба.'); return; }
  let idx = 0, best = Infinity;
  wr.pts.forEach(function(q,i){ const d = Math.hypot(q.x-p.x, q.y-p.y); if (d < best){ best = d; idx = i; } });
  wr.pts.splice(idx, 1);
  trace('Точка изгиба удалена (осталось точек: '+wr.pts.length+').');
  renderAll();
}
function removeMenuWire(){
  const wr = currentMenuWire();
  hideWireMenu();
  if (!wr) return;
  state.wires = state.wires.filter(function(x){ return x.id !== wr.id; });
  log('Провод №'+wr.id+' удалён.', 'ok');
  renderAll();
}
function changeWireColor(color){
  const wr = currentMenuWire();
  hideWireMenu();
  if (!wr) return;
  wr.color = color;
  trace('Цвет провода изменён.');
  renderAll();
}
function changeWireShape(shape){
  const wr = currentMenuWire();
  hideWireMenu();
  if (!wr) return;
  const names={smooth:'плавная кривая',straight:'прямые отрезки',orthogonal:'прямые углы',arc:'дуга-перемычка',s:'S-образный изгиб'};
  wr.shape = shape || 'smooth';
  if (wr.shape === 'arc' || wr.shape === 's') wr.pts = [];
  trace('Форма провода изменена: '+(names[wr.shape]||wr.shape)+'.');
  renderAll();
}
wireLayer.addEventListener('contextmenu', function(evt){
  const w = evt.target.closest ? evt.target.closest('[data-wid]') : null;
  if (!w) return;
  evt.preventDefault();
  const p = svgPoint(evt);
  showWireMenu(+w.dataset.wid, evt.clientX, evt.clientY, p);
});
(function(){
  const m = document.getElementById('wireMenu');
  if (!m || !m.addEventListener) return;
  m.addEventListener('mouseover', function(evt){
    const shapeButton = evt.target.closest ? evt.target.closest('[data-wire-shape]') : null;
    if (shapeButton) previewWireShape(shapeButton.getAttribute('data-wire-shape'));
  });
  const shapeMenu = m.querySelector('.wire-shapes');
  if (shapeMenu) shapeMenu.addEventListener('mouseleave', clearWireShapePreview);
  m.addEventListener('click', function(evt){
    const trigger=evt.target.closest?evt.target.closest('.submenu-trigger'):null;
    if(trigger){const sub=trigger.closest('.menu-sub'),open=!sub.classList.contains('open');m.querySelectorAll('.menu-sub').forEach(function(other){other.classList.remove('open');const b=other.querySelector('.submenu-trigger');if(b)b.setAttribute('aria-expanded','false');});sub.classList.toggle('open',open);trigger.setAttribute('aria-expanded',String(open));return;}
    const shapeButton = evt.target.closest ? evt.target.closest('[data-wire-shape]') : null;
    if (shapeButton){ changeWireShape(shapeButton.getAttribute('data-wire-shape')); return; }
    const colorButton = evt.target.closest ? evt.target.closest('[data-wire-color]') : null;
    if (colorButton){ changeWireColor(colorButton.getAttribute('data-wire-color')); return; }
    const b = evt.target.closest ? evt.target.closest('[data-act]') : null;
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'add') addWirePoint();
    else if (act === 'del') delWirePoint();
    else if (act === 'remove') removeMenuWire();
  });
})();
document.addEventListener('pointerdown', function(evt){
  const m = document.getElementById('wireMenu');
  if (!m || m.style.display !== 'block') return;
  if (evt.target && evt.target.closest && evt.target.closest('#wireMenu')) return;
  hideWireMenu();
}, true);

/* ============================================================
   8в. ТРЁХФАЗНАЯ СЕТЬ ПЕРЕМЕННОГО ТОКА И МУЛЬТИМЕТР
   Симметричная трёхфазная синусоидальная система: L1, L2 и L3 сдвинуты
   друг относительно друга на 120°, частота по умолчанию 50 Гц.
   Основной расчёт аппаратов ведётся по действующим комплексным значениям,
   а временная модель ниже позволяет получить мгновенные напряжения и токи.
   N–PE = 0 В: ноль и защитный проводник соединены в одной точке.
   ============================================================ */
const AC_NETWORK = Object.freeze({
  kind:'three-phase-four-wire-sine',
  nominalLineVoltageRms:380,
  nominalFrequencyHz:50,
  phaseSequence:Object.freeze(['L1','L2','L3']),
  phaseAnglesDeg:Object.freeze({L1:0,L2:120,L3:240})
});
const V_ZERO = {r:0,i:0,frequencyHz:0,source:'reference'};
function networkLineVoltageRms(){
  const panel=inboxPanel();if(panel)return panelInletVoltage(panel);
  const props=state&&state.specialProps&&state.specialProps.inbox;
  const value=Number(props&&props.ratedVoltage);
  return isFinite(value)&&value>0?value:AC_NETWORK.nominalLineVoltageRms;
}
function networkPhaseVoltageRms(){ return networkLineVoltageRms()/(inboxSinglePhase()?1:Math.sqrt(3)); }
function networkPhaseSequence(){return inboxSinglePhase()?['L1']:AC_NETWORK.phaseSequence.slice();}
function networkKind(){return inboxSinglePhase()?'single-phase-three-wire-sine':AC_NETWORK.kind;}
function networkFrequencyHz(){
  const props=state&&state.specialProps&&state.specialProps.inbox;
  const value=Number(props&&props.frequency);
  return isFinite(value)&&value>0?value:AC_NETWORK.nominalFrequencyHz;
}
function vecPhase(deg,rms){
  const magnitude=isFinite(Number(rms))?Number(rms):networkPhaseVoltageRms();
  const a=deg*Math.PI/180;
  return {r:magnitude*Math.cos(a),i:magnitude*Math.sin(a),frequencyHz:networkFrequencyHz()};
}
function sourcePhasePhasor(phase){
  if(inboxSinglePhase()&&phase!=='L1')return V_ZERO;
  const angle=AC_NETWORK.phaseAnglesDeg[phase];
  if(angle===undefined)return V_ZERO;
  const value=vecPhase(angle,networkPhaseVoltageRms());
  value.source='grid';value.phase=phase;
  return value;
}
/* Постоянное напряжение в той же фазорной модели: мнимая часть равна нулю,
   частота — нулю, а признак dc отличает его от опорного нуля N/PE. */
function dcPhasor(volts,source){
  const value=Number(volts)||0;
  return {r:value,i:0,frequencyHz:0,dc:true,source:source||'dc'};
}
const V_DC_ZERO = Object.freeze({r:0,i:0,frequencyHz:0,dc:true,source:'dc-reference'});
function phasorDifference(a,b){
  a=a||V_ZERO;b=b||V_ZERO;
  const fa=Number(a.frequencyHz)||0,fb=Number(b.frequencyHz)||0;
  // Разность двух постоянных напряжений остаётся постоянной: подставлять
  // частоту сети здесь нельзя, иначе мультиметр покажет на якоре «50 Гц».
  const hasAc=(!a.dc&&fa>0)||(!b.dc&&fb>0);
  const frequencyHz=((a.dc||b.dc)&&!hasAc)?0:(fa||fb||networkFrequencyHz());
  return {r:a.r-b.r,i:a.i-b.i,frequencyHz:frequencyHz,dc:!!((a.dc||b.dc)&&!hasAc)};
}
function acNowSeconds(){
  return typeof performance!=='undefined'&&performance.now?performance.now()/1000:Date.now()/1000;
}
function acPhasorSample(phasor,timeSeconds){
  phasor=phasor||V_ZERO;
  const time=isFinite(Number(timeSeconds))?Number(timeSeconds):acNowSeconds();
  const dc=!!phasor.dc||!(Number(phasor.frequencyHz)>0);
  const rms=Math.hypot(phasor.r,phasor.i);
  if(dc){
    // Постоянное напряжение не имеет действующего значения синусоиды:
    // мгновенное значение равно самому напряжению и не меняется во времени.
    return {
      rms:rms,peak:rms,phaseDeg:phasor.r<0?180:0,
      instantaneous:phasor.r,frequencyHz:0,periodSeconds:Infinity,
      dc:true,timeSeconds:time,phasor:{r:phasor.r,i:phasor.i}
    };
  }
  const frequency=Math.max(.001,Number(phasor.frequencyHz)||networkFrequencyHz());
  const omega=2*Math.PI*frequency;
  return {
    rms:rms,
    peak:rms*Math.SQRT2,
    phaseDeg:rms?Math.atan2(phasor.i,phasor.r)*180/Math.PI:0,
    instantaneous:Math.SQRT2*(phasor.r*Math.cos(omega*time)-phasor.i*Math.sin(omega*time)),
    frequencyHz:frequency,
    periodSeconds:1/frequency,
    dc:false,
    timeSeconds:time,
    phasor:{r:phasor.r,i:phasor.i}
  };
}
function acTerminalSample(term,timeSeconds,map){
  map=map||potentialMap();
  return acPhasorSample(map.pot[nodeKey(term)]||V_ZERO,timeSeconds);
}
function acBetweenSample(a,b,timeSeconds,map){
  map=map||potentialMap();
  return acPhasorSample(phasorDifference(map.pot[nodeKey(a)],map.pot[nodeKey(b)]),timeSeconds);
}
/* Ток через будущее активное/индуктивное/ёмкостное звено. impedance задаётся
   как {r: активное сопротивление, x: реактивное сопротивление} в омах. */
function acCurrentThroughImpedance(a,b,impedance,timeSeconds,map){
  map=map||potentialMap();
  const voltage=phasorDifference(map.pot[nodeKey(a)],map.pot[nodeKey(b)]);
  const z=typeof impedance==='number'?{r:impedance,x:0}:(impedance||{});
  const zr=Number(z.r)||0,zx=Number(z.x)||0,denominator=zr*zr+zx*zx;
  if(denominator<=1e-12)return Object.assign(acPhasorSample(V_ZERO,timeSeconds),{openCircuit:true});
  const current={
    r:(voltage.r*zr+voltage.i*zx)/denominator,
    i:(voltage.i*zr-voltage.r*zx)/denominator
  };
  return Object.assign(acPhasorSample(current,timeSeconds),{openCircuit:false,impedanceOhm:{r:zr,x:zx}});
}
function acSourceSnapshot(timeSeconds){
  const time=isFinite(Number(timeSeconds))?Number(timeSeconds):acNowSeconds();
  const energized=!!(state.power&&state.special.inbox),phasors={},sequence=networkPhaseSequence();
  sequence.forEach(function(phase){phasors[phase]=energized?sourcePhasePhasor(phase):V_ZERO;});
  const phaseSamples={},lineSamples={};
  sequence.forEach(function(phase){phaseSamples[phase]=acPhasorSample(phasors[phase],time);});
  [['L1','L2'],['L2','L3'],['L3','L1']].forEach(function(pair){
    if(!phasors[pair[0]]||!phasors[pair[1]])return;
    lineSamples[pair[0]+'-'+pair[1]]=acPhasorSample(phasorDifference(phasors[pair[0]],phasors[pair[1]]),time);
  });
  return {
    kind:networkKind(),
    energized:energized,
    frequencyHz:networkFrequencyHz(),
    periodSeconds:1/networkFrequencyHz(),
    phaseSequence:sequence,
    lineVoltageRms:networkLineVoltageRms(),
    phaseVoltageRms:networkPhaseVoltageRms(),
    timeSeconds:time,
    phases:phaseSamples,
    lines:lineSamples
  };
}
const TRAINING_AC_API=Object.freeze({
  config:AC_NETWORK,
  snapshot:acSourceSnapshot,
  sampleTerminal:acTerminalSample,
  sampleBetween:acBetweenSample,
  currentThroughImpedance:acCurrentThroughImpedance
});
if(typeof window!=='undefined')window.TrainingAC=TRAINING_AC_API;
function nodeKey(t){ return String(t.devId)+'/'+t.key; }
function contactorClosed(d){ return !!(d && (d.coil || d.manualPressed)); }

/* внутренние связи аппаратов: замкнутые контакты, перемычки, силовой тракт реле */
function internalLinks(){
  const L = [];
  function link(d1,k1,d2,k2){ L.push([{ devId:d1, key:k1 }, { devId:d2, key:k2 }]); }
  state.devices.forEach(function(d){
    if (d.type === 'mcb3' && d.on && !d.tripped){ for (let i=0;i<3;i++) link(d.id,'t'+i,d.id,'b'+i); }
    if (d.type === 'mcb1' && d.on && !d.tripped){ link(d.id,'t0',d.id,'b0'); }
    if (d.type === 'rcd' && d.on && !d.tripped){
      link(d.id,'tL',d.id,'bL');
      link(d.id,'tN',d.id,'bN');
    }
    if (d.type === 'meter'){
      link(d.id,'L_in',d.id,'L_out');
      link(d.id,'N_in',d.id,'N_out');
    }
    if (d.type === 'sensor'){
      link(d.id,'L_in',d.id,'L_out');
      link(d.id,'N_in',d.id,'N_out');
    }
    if (d.type === 'outlet'){
      link(d.id,'L',d.id,'s1L');link(d.id,'L',d.id,'s2L');
      link(d.id,'N',d.id,'s1N');link(d.id,'N',d.id,'s2N');
      link(d.id,'PE',d.id,'s1PEt');link(d.id,'PE',d.id,'s1PEb');
      link(d.id,'PE',d.id,'s2PEt');link(d.id,'PE',d.id,'s2PEb');
    }
    if (d.type === 'wallSwitch'){
      if(d.switchOn1)link(d.id,'L',d.id,'O1');
      if(Number(d.gangs)===2&&d.switchOn2)link(d.id,'L',d.id,'O2');
    }
    if (d.type === 'twoWaySwitch'){
      link(d.id,'L',d.id,Number(d.switchPosition)===2?'O2':'O1');
    }
    if(d.type==='junction'){
      ['top','right','bottom','left'].forEach(function(side){
        link(d.id,side+'0',d.id,side+'1');link(d.id,side+'1',d.id,side+'2');
      });
    }
    if (d.type === 'km1' && contactorClosed(d)){
      for (let i=0;i<3;i++) link(d.id,'t'+i,d.id,'b'+i);
      link(d.id,'t3',d.id,'b3');                  // нормально открытый 13-14 замыкается только при втянутой катушке
      link(d.id,'a53',d.id,'a54');                // ПКИ-11: нормально открытый 53-54
    }
    if (d.type === 'km1' && !contactorClosed(d)){ link(d.id,'a61',d.id,'a62'); } // ПКИ-11: нормально закрытый 61-62
    if (d.type === 'timer'){
      if (d.timerActive) link(d.id,'15',d.id,'18');
      else link(d.id,'15',d.id,'16');
    }
    if (d.type === 'klemma' || d.type === 'pebus'){ // шина N или PE: все зажимы — один узел
      for (let i=0;i<5;i++) link(d.id,'k'+i,d.id,'k'+(i+1));
    }
  });
  state.relays.forEach(function(r){
    for (let i=0;i<3;i++) link(r.kmId,'b'+i,'kk'+r.id,'p'+i);   // силовой тракт «пускатель → реле»
    if (r.tripped) link('kk'+r.id,'r1','kk'+r.id,'r0');         // 97-98 (NO) замкнут
    else           link('kk'+r.id,'r2','kk'+r.id,'r3');         // 95-96 (NC) замкнут
  });
  state.pushbuttons.forEach(function(pb){
    const buttons=pb.buttons||{};
    if (buttons.up)    link(pb.id,'upL',pb.id,'upR');       // зелёная: НО
    if (!buttons.stop) link(pb.id,'stopL',pb.id,'stopR');   // красная: НЗ
    if (buttons.down)  link(pb.id,'downL',pb.id,'downR');   // зелёная: НО
  });
  // Постоянные перемычки соединяют концы обмоток каждого асинхронного двигателя.
  // У машины постоянного тока якорь и обмотка возбуждения замкнуты только внутри
  // самой машины, поэтому перемычек в схеме нет.
  state.motors.forEach(function(motor){
    if(motorIsDc(motor))return;
    link(motor.id,'W2',motor.id,'U2');
    link(motor.id,'U2',motor.id,'V2');
  });
  return L;
}
function vfdSetFrequency(d){
  return Math.max(0,Math.min(Math.max(1,Number(d&&d.maxFrequency)||100),Number(d&&d.setFrequency===undefined?50:d.setFrequency)||0));
}
function changeVfdFrequency(d,delta){
  if(!d)return false;
  const before=vfdSetFrequency(d),maximum=Math.max(1,Number(d.maxFrequency)||100);
  d.setFrequency=Math.max(0,Math.min(maximum,before+Number(delta||0)));
  return Math.abs(d.setFrequency-before)>.0001;
}
function vfdInputState(d,pot){
  pot=pot||{};
  const phases=['R','S','T'].map(function(key){return pot[nodeKey({devId:d.id,key:key})];});
  if(phases.some(function(v){return !v;}))return {ready:false,lineVoltageRms:0,frequencyHz:0,reason:'missing-phase'};
  const frequencies=phases.map(function(v){return Number(v.frequencyHz)||networkFrequencyHz();});
  if(Math.max.apply(null,frequencies)-Math.min.apply(null,frequencies)>.05)return {ready:false,lineVoltageRms:0,frequencyHz:0,reason:'frequency-mismatch'};
  const lines=[];
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)lines.push(Math.hypot(phases[i].r-phases[j].r,phases[i].i-phases[j].i));
  const average=lines.reduce(function(sum,v){return sum+v;},0)/lines.length;
  const nominal=ratedVoltageOf(d,380),balanced=lines.every(function(v){return v>=nominal*.8&&v<=nominal*1.18;});
  return {ready:balanced,lineVoltageRms:average,frequencyHz:frequencies[0],reason:balanced?'':'voltage'};
}
function vfdOutputPhasors(d,input){
  const frequency=vfdSetFrequency(d),base=Math.max(1,Number(d.baseFrequency)||50);
  const lineRms=ratedVoltageOf(d,380)*Math.min(1,frequency/base);
  const phaseRms=lineRms/Math.sqrt(3);
  const angles=d.reverse?[0,240,120]:[0,120,240];
  const result={};
  ['U','V','W'].forEach(function(key,index){
    const value=vecPhase(angles[index],phaseRms);
    value.frequencyHz=frequency;value.source='vfd:'+d.id;value.phase=key;
    result[key]=value;
  });
  result.frequencyHz=frequency;result.lineVoltageRms=lineRms;result.input=input;
  return result;
}
function tpMaxArmatureVoltage(d){
  return Math.max(1,Number(d&&d.maxArmatureVoltage)||ratedVoltageOf(d,220));
}
function tpSetArmatureVoltage(d){
  return Math.max(0,Math.min(tpMaxArmatureVoltage(d),Number(d&&d.setArmatureVoltage)||0));
}
function tpFieldVoltage(d){
  return Math.max(1,Number(d&&d.fieldVoltage)||220);
}
function changeTpArmatureVoltage(d,delta){
  if(!d)return false;
  const before=tpSetArmatureVoltage(d),maximum=tpMaxArmatureVoltage(d);
  d.setArmatureVoltage=Math.max(0,Math.min(maximum,before+Number(delta||0)));
  return Math.abs(d.setArmatureVoltage-before)>.0001;
}
/* Явная установка уставки: tpSetArmatureVoltage — это чтение уставки. */
function setTpArmatureVoltage(d,volts){
  if(!d)return false;
  const before=tpSetArmatureVoltage(d);
  d.setArmatureVoltage=Math.max(0,Math.min(tpMaxArmatureVoltage(d),Number(volts)||0));
  return Math.abs(d.setArmatureVoltage-before)>.0001;
}
/* Силовой вход преобразователя проверяется так же, как вход ПЧ. */
function tpInputState(d,pot){
  pot=pot||{};
  const phases=['R','S','T'].map(function(key){return pot[nodeKey({devId:d.id,key:key})];});
  if(phases.some(function(v){return !v;}))return {ready:false,lineVoltageRms:0,frequencyHz:0,reason:'missing-phase'};
  const frequencies=phases.map(function(v){return Number(v.frequencyHz)||networkFrequencyHz();});
  if(Math.max.apply(null,frequencies)-Math.min.apply(null,frequencies)>.05)return {ready:false,lineVoltageRms:0,frequencyHz:0,reason:'frequency-mismatch'};
  const lines=[];
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)lines.push(Math.hypot(phases[i].r-phases[j].r,phases[i].i-phases[j].i));
  const average=lines.reduce(function(sum,v){return sum+v;},0)/lines.length;
  const nominal=ratedVoltageOf(d,380),balanced=lines.every(function(v){return v>=nominal*.8&&v<=nominal*1.18;});
  return {ready:balanced,lineVoltageRms:average,frequencyHz:frequencies[0],reason:balanced?'':'voltage'};
}
function potentialMap(){
  const adj = {}, pot = {}, conflicts = [], seenConflicts = {};
  function add(a,b){
    const ka = nodeKey(a), kb = nodeKey(b);
    (adj[ka] = adj[ka] || []).push(b);
    (adj[kb] = adj[kb] || []).push(a);
  }
  internalLinks().forEach(function(p){ add(p[0], p[1]); });
  state.wires.forEach(function(w){ add(w.a, w.b); });

  const queue = [];
  let conflict = false;
  function recordConflict(k,a,b){
    const voltage=Math.hypot(a.r-b.r,a.i-b.i);
    const fa=Number(a.frequencyHz)||0,fb=Number(b.frequencyHz)||0;
    const frequencyMismatch=!!(fa&&fb&&Math.abs(fa-fb)>.05);
    if(voltage<=1&&!frequencyMismatch)return;
    conflict=true;
    const severity=voltage>1?voltage:Math.max(Math.hypot(a.r,a.i),Math.hypot(b.r,b.i));
    const signature=k+'|'+Math.round(severity/10)*10+'|'+Math.round(fa*10)+'|'+Math.round(fb*10);
    if(seenConflicts[signature])return;
    seenConflicts[signature]=true;
    conflicts.push({node:k,voltage:severity,a:a,b:b,frequencyMismatch:frequencyMismatch,frequencyA:fa,frequencyB:fb});
  }
  function src(devId, key, v){
    const k=nodeKey({devId:devId,key:key});
    if(k in pot)recordConflict(k,pot[k],v);
    else pot[k]=v;
    queue.push({ devId:devId, key:key, v:v });
  }
  function propagate(){
    while(queue.length){
      const cur=queue.shift();
      const list=adj[nodeKey(cur)]||[];
      for(let i=0;i<list.length;i++){
        const n=list[i],k=nodeKey(n);
        if(!(k in pot)){pot[k]=cur.v;queue.push({devId:n.devId,key:n.key,v:cur.v});}
        else recordConflict(k,pot[k],cur.v);
      }
    }
  }
  if (state.power&&state.special.inbox){
    networkPhaseSequence().forEach(function(phase){src('IN',phase,sourcePhasePhasor(phase));});
  }
  if(state.special.inbox){src('IN','N',V_ZERO);src('IN','PE',V_ZERO);}
  propagate();

  // Выход ПЧ является новым трёхфазным источником, гальванически отделённым
  // от входа. Сначала определяем качество сети R/S/T, затем распространяем U/V/W.
  state.devices.filter(function(d){return d.type==='vfd';}).forEach(function(d){
    const input=vfdInputState(d,pot);
    d.vfdInputReady=input.ready;d.vfdInputVoltage=input.lineVoltageRms;d.vfdInputFrequency=input.frequencyHz;
    d.vfdOutputActive=!!(input.ready&&d.running&&!d.fault&&vfdSetFrequency(d)>.05);
    if(!d.vfdOutputActive)return;
    const output=vfdOutputPhasors(d,input);
    src(d.id,'U',output.U);src(d.id,'V',output.V);src(d.id,'W',output.W);
    propagate();
  });

  // Тиристорный преобразователь. Обмотка возбуждения получает питание вместе
  // с сетью, якорь — только при включённом выходе. Минусовые зажимы обоих
  // выходов приведены к общей точке преобразователя, поэтому постоянное
  // напряжение отсчитывается от того же нуля, что N и PE: соединение Я− или Ш−
  // с нулём не является ошибкой монтажа, а заземление плюса — является.
  state.devices.filter(function(d){return d.type==='tp';}).forEach(function(d){
    const input=tpInputState(d,pot);
    d.tpInputReady=input.ready;d.tpInputVoltage=input.lineVoltageRms;d.tpInputFrequency=input.frequencyHz;
    if(!input.ready)return;
    const sourceTag='tp:'+d.id;
    src(d.id,'sh1',dcPhasor(tpFieldVoltage(d),sourceTag));src(d.id,'sh2',V_DC_ZERO);
    propagate();
    if(d.tpOn){
      const armature=tpSetArmatureVoltage(d);
      if(armature>.5){ src(d.id,'ya1',dcPhasor(armature,sourceTag));src(d.id,'ya2',V_DC_ZERO); }
      else { src(d.id,'ya1',V_DC_ZERO);src(d.id,'ya2',V_DC_ZERO); }
    } else { src(d.id,'ya1',V_DC_ZERO);src(d.id,'ya2',V_DC_ZERO); }
    propagate();
  });
  return {pot:pot,conflict:conflict,conflicts:conflicts,adj:adj,
    ac:{frequencyHz:networkFrequencyHz(),lineVoltageRms:networkLineVoltageRms(),phaseVoltageRms:networkPhaseVoltageRms(),kind:networkKind()}};
}

/* Находим тепловое реле, через силовой тракт которого фактически запитан М1. */
function motorSupplyRelay(motor){
  motor=motor||state.motors[0];
  if(!motor)return null;
  const map = potentialMap();
  if (map.conflict) return null;
  const motorKeys = ['U1','V1','W1'].map(function(k){ return nodeKey({devId:motor.id,key:k}); });
  for (let ri=0;ri<state.relays.length;ri++){
    const rel = state.relays[ri], km = devById(rel.kmId);
    if (!km || !km.coil) continue;
    const reached = {};
    for (let pi=0;pi<3;pi++){
      const start = nodeKey({devId:'kk'+rel.id,key:'p'+pi}), seen = {}, queue = [start];
      while (queue.length){
        const key = queue.shift();
        if (seen[key]) continue;
        seen[key] = true;
        if (motorKeys.indexOf(key) >= 0) reached[key] = true;
        (map.adj[key] || []).forEach(function(n){
          const nk = nodeKey(n);
          if (!seen[nk]) queue.push(nk);
        });
      }
    }
    if (Object.keys(reached).length === 3) return rel;
  }
  return null;
}

let thermalLastTick = Date.now();
function thermalTick(){
  const now = Date.now(), dt = Math.min(0.5, Math.max(0, (now-thermalLastTick)/1000));
  thermalLastTick = now;
  const activeLoads={};
  state.motors.forEach(function(motor){
    const direction=motorPhaseDirection(motor);
    if(!direction)return;
    const rel=motorSupplyRelay(motor);
    if(rel)activeLoads[rel.id]={motor:motor,operating:motorOperatingPoint(motor,direction)};
  });
  let changed = false, tripped = null, trippedLoad=null;
  state.relays.forEach(function(rel){
    const before = rel.heat || 0;
    const load=activeLoads[rel.id];
    if (load && !rel.tripped){
      const ratio = load.operating.current/Math.max(1, rel.set || 25);
      if (ratio > 1) rel.heat = Math.min(1, before + dt*(ratio*ratio-1)/18);
      else rel.heat = Math.max(0, before-dt/18);
      if (rel.heat >= 1){ rel.heat = 1; rel.tripped = true; rel.tested = false; tripped = rel; trippedLoad=load; playRelaySound(); }
    } else if (!rel.tripped){
      rel.heat = Math.max(0, before-dt/14);
    }
    if (Math.abs((rel.heat || 0)-before) > 0.0001) changed = true;
  });
  if (tripped){
    log(tagOf('kk'+tripped.id)+': тепловая перегрузка '+trippedLoad.motor.id+' — ток двигателя '+trippedLoad.operating.current.toFixed(1)+' А превысил уставку '+tripped.set+' А. Контакт 95-96 разомкнут.', 'err');
    warn('Сработало тепловое реле '+tagOf('kk'+tripped.id)+': перегрузка двигателя, 95-96 разомкнут.');
    renderAll();
  } else if (changed) updateMotorReadout();
}
setInterval(thermalTick, 250);

function termName(sel){
  if (!sel) return '—';
  const t = terminal(sel.devId, sel.key);
  return tagOf(sel.devId) + ' · ' + (t ? t.label : sel.key);
}
function nominalResistance(dev,defaultPower){
  const voltage=ratedVoltageOf(dev,220),power=Math.max(.01,Number(dev&&dev.ratedPower)||defaultPower);
  return voltage*voltage/power;
}
function resistanceBetween(a, b){
  const graph = {};
  function edge(x,y,r){
    const kx=nodeKey(x), ky=nodeKey(y);
    (graph[kx]=graph[kx]||[]).push({k:ky,r:r});
    (graph[ky]=graph[ky]||[]).push({k:kx,r:r});
  }
  state.wires.forEach(function(w){ edge(w.a,w.b,0.05); });
  internalLinks().forEach(function(p){ edge(p[0],p[1],0.03); });
  // Три обмотки каждого асинхронного двигателя в звезде, а у машины
  // постоянного тока — сопротивление якоря и обмотки возбуждения.
  state.motors.forEach(function(motor){
    if(motorIsDc(motor)){
      const d=dcMotorData(motor);
      edge({devId:motor.id,key:'ya1'},{devId:motor.id,key:'ya2'},d.Ra);
      edge({devId:motor.id,key:'sh1'},{devId:motor.id,key:'sh2'},d.Rf);
      return;
    }
    edge({devId:motor.id,key:'U1'},{devId:motor.id,key:'W2'},3.2);
    edge({devId:motor.id,key:'V1'},{devId:motor.id,key:'U2'},3.2);
    edge({devId:motor.id,key:'W1'},{devId:motor.id,key:'V2'},3.2);
  });
  // Исправная катушка пускателя: ориентировочное сопротивление постоянному току.
  state.devices.filter(function(d){ return d.type === 'km1' && !d.coilBurned; }).forEach(function(d){
    edge({devId:d.id,key:'A1'},{devId:d.id,key:'A2'},480);
  });
  // Электронная часть реле времени — нагрузка, а не перемычка между A1 и A2.
  state.devices.filter(function(d){return d.type==='timer'&&!d.timerBurned;}).forEach(function(d){
    edge({devId:d.id,key:'A1'},{devId:d.id,key:'A2'},12000);
    edge({devId:d.id,key:'S'},{devId:d.id,key:'A2'},50000);
  });
  // Лампа является нагрузкой, а не прямым замыканием между L и N.
  state.devices.filter(function(d){ return d.type === 'lamp' && !d.burned; }).forEach(function(d){
    edge({devId:d.id,key:'t0'},{devId:d.id,key:'b0'},nominalResistance(d,1));
  });
  state.devices.filter(function(d){return d.type==='bulb'&&!d.burned;}).forEach(function(d){
    edge({devId:d.id,key:'L'},{devId:d.id,key:'N'},nominalResistance(d,100));
  });
  state.devices.filter(function(d){return TYPES[d.type].kind==='appliance'&&d.applianceOn&&!d.applianceBurned;}).forEach(function(d){
    edge({devId:d.id,key:'L'},{devId:d.id,key:'N'},nominalResistance(d,TYPES[d.type].defaultPower));
  });
  const start=nodeKey(a), finish=nodeKey(b), dist={};
  dist[start]=0;
  const used={};
  while (true){
    let cur=null, best=Infinity;
    Object.keys(dist).forEach(function(k){ if(!used[k] && dist[k]<best){best=dist[k];cur=k;} });
    if (cur===null || cur===finish) break;
    used[cur]=true;
    (graph[cur]||[]).forEach(function(e){
      const nd=dist[cur]+e.r;
      if (!(e.k in dist) || nd<dist[e.k]) dist[e.k]=nd;
    });
  }
  return finish in dist ? dist[finish] : Infinity;
}
function contactCheck(a,b){
  const ka=nodeKey(a), kb=nodeKey(b);
  const directClosed=internalLinks().some(function(p){
    const p0=nodeKey(p[0]), p1=nodeKey(p[1]);
    return (p0===ka&&p1===kb)||(p0===kb&&p1===ka);
  });
  if (String(a.devId)!==String(b.devId)) return directClosed ? {name:'Силовой проход',closed:true} : null;
  const pair=[a.key,b.key].sort().join('|');
  let type=null, dev=null;
  if (typeof a.devId==='string' && a.devId.indexOf('kk')===0) type='kk1';
  else { dev=devById(+a.devId); type=dev&&dev.type; }
  const names={
    timer:{'15|16':'15–16 · НЗ','15|18':'15–18 · НО'},
    km1:{'b3|t3':'13–14 · НО','a53|a54':'53–54 · НО','a61|a62':'61–62 · НЗ',
         'b0|t0':'1L1–2T1 · силовой НО','b1|t1':'3L2–4T2 · силовой НО','b2|t2':'5L3–6T3 · силовой НО'},
    kk1:{'r0|r1':'98–97 · НО','r2|r3':'96–95 · НЗ'},
    mcb1:{'b0|t0':'Контакт автомата'},
    mcb3:{'b0|t0':'Полюс 1–2','b1|t1':'Полюс 3–4','b2|t2':'Полюс 5–6'},
    rcd:{'bL|tL':'Полюс 1–2','bN|tN':'Полюс N–N'},
    meter:{'L_in|L_out':'Фазная цепь 1–2','N_in|N_out':'Нейтральная цепь 3–4'},
    sensor:{'L_in|L_out':'Проход фазы','N_in|N_out':'Проход нейтрали'},
    wallSwitch:{'L|O1':'Клавиша 1','L|O2':'Клавиша 2'},
    twoWaySwitch:{'L|O1':'Перекидной контакт L–1','L|O2':'Перекидной контакт L–2'}
  };
  if (type && names[type] && names[type][pair]) return {name:names[type][pair],closed:directClosed};
  if (String(a.devId).indexOf('PB')===0){
    const pbNames={'upL|upR':'ВПЕРЁД · НО','stopL|stopR':'СТОП · НЗ','downL|downR':'НАЗАД · НО'};
    if (pbNames[pair]) return {name:pbNames[pair],closed:directClosed};
  }
  return null;
}
function measureNow(){
  const a=state.mm.a, b=state.mm.b, fn=state.mm.fn||'voltage';
  if (!a || !b) return null;
  if (fn==='voltage'||fn==='dcvoltage'){
    const map=potentialMap();
    const va=(nodeKey(a) in map.pot)?map.pot[nodeKey(a)]:null;
    const vb=(nodeKey(b) in map.pot)?map.pot[nodeKey(b)]:null;
    const ta=terminal(a.devId,a.key), tb=terminal(b.devId,b.key);
    const isDc=function(v){return !!v&&(v.dc||!Number(v.frequencyHz));};
    let u=null,note='';
    if (!va || !vb) note='Одна из клемм без потенциала — цепь разорвана или на вводе нет питания.';
    else if(fn==='dcvoltage'){
      if(!isDc(va)||!isDc(vb)) note='На клеммах переменное напряжение — переключите мультиметр в режим V~.';
      else{
        const raw=va.r-vb.r;
        u=Math.abs(raw)>50?Math.round(raw/10)*10:Math.round(raw);
        if(Math.abs(u)<1) note='Постоянного напряжения нет: точки соединены одним проводником либо цепь разомкнута.';
        else note='Постоянное напряжение'+(u<0?' обратной полярности (красный щуп на минусе)':'')+'.';
      }
      if(map.conflict) note='КЗ! Разные потенциалы соединены напрямую.';
      return {cap:'Напряжение DC',display:u===null?'— В':((u>0?'+':'')+u+' В'),note:note,ok:u!==null,danger:map.conflict};
    }
    if (!va || !vb) note='Одна из клемм без потенциала — цепь разорвана или на вводе нет питания.';
    else {
      const raw=Math.hypot(va.r-vb.r,va.i-vb.i);
      u=raw>50?Math.round(raw/10)*10:Math.round(raw);
      const peIn=(ta&&ta.color===WC.PE)||(tb&&tb.color===WC.PE);
      if(u<3){
        note='Напряжения нет: один и тот же проводник либо цепь разомкнута.';
        const nn=(ta&&ta.color===WC.N&&tb&&tb.color===WC.PE)||(tb&&tb.color===WC.N&&ta&&ta.color===WC.PE);
        if(nn) note='Ноль и PE соединены в одной точке — 0 В, это нормально.';
      } else if(isDc(va)&&isDc(vb)) note='Это постоянное напряжение '+u+' В — измеряйте его в режиме V⎓.';
      else if(u<260){ note='Фазное напряжение 220 В (фаза — ноль).'; if(peIn) note+=' ⚠ На PE относительно фазы присутствует 220 В.'; }
      else note='Линейное напряжение 380 В (между двумя фазами).';
    }
    if(map.conflict) note='КЗ! Разные потенциалы соединены напрямую.';
    return {cap:'Напряжение AC',display:u===null?'— В':u+' В',note:note,ok:u!==null,danger:map.conflict};
  }
  const liveBreakers=state.devices.filter(function(d){
    return (d.type==='mcb3'||d.type==='mcb1'||d.type==='rcd') && d.on && !d.tripped;
  });
  if (liveBreakers.length) return {cap:'Безопасность',display:'⚠',
    note:'Перед измерением сопротивления или прозвонкой отключите автоматы QF1 и QF2.',
    ok:false,danger:true};
  const r=resistanceBetween(a,b);
  if(fn==='continuity'){
    const closed=isFinite(r)&&r<5;
    return {cap:'Прозвонка',display:closed?'● ЗВУК':'OL',note:closed?'Непрерывная цепь, сопротивление '+r.toFixed(1)+' Ω.':'Цепь разомкнута либо сопротивление выше порога прозвонки.',ok:closed};
  }
  let resistanceDisplay;
  if(!isFinite(r)) resistanceDisplay='>1 MΩ';
  else if(r<=0.5) resistanceDisplay=Math.max(0,r).toFixed(1)+' Ω';
  else if(r>=1000) resistanceDisplay=(r/1000).toFixed(1)+' kΩ';
  else resistanceDisplay=(r<10?r.toFixed(1):Math.round(r))+' Ω';
  return {cap:'Сопротивление',display:resistanceDisplay,
    note:isFinite(r)?(r<=0.5?'Цепь замкнута: сопротивление провода или закрытого контакта.':'Расчётное сопротивление выбранного участка.'):'Цепь разомкнута: сопротивление больше 1 МОм.',
    ok:isFinite(r)};
}
function renderMM(){
  if(!mmLayer)return;
  if(!state.special.multimeter){mmLayer.innerHTML='';return;}
  // В старых сохранениях могли остаться отдельные режимы катушки и контактов.
  if(state.mm.fn==='coil'||state.mm.fn==='contacts')state.mm.fn='resistance';
  function probePoint(sel,x,y){
    if(sel){const t=terminal(sel.devId,sel.key);if(t)return {x:t.x,y:t.y};}
    return {x:x,y:y};
  }
  const red=probePoint(state.mm.a,METER.redX,METER.redY);
  const black=probePoint(state.mm.b,METER.blackX,METER.blackY);
  // Разъёмы проводов находятся сверху корпуса; свободные щупы стоят над ними иглами вверх.
  const redJack={x:METER.x+158,y:METER.y-3},blackJack={x:METER.x+72,y:METER.y-3};
  const res=measureNow(),display=res?res.display:'—',cap=res?res.cap:'Щупы не подключены';
  const note=res?res.note:'Перетащите красный и чёрный щупы к двум клеммам.';
  const modes=[['voltage','V~'],['dcvoltage','V⎓'],['resistance','Ω'],['continuity','ПРОЗВОНКА']];
  function cable(a,b,color){
    // Кабель выходит из корпуса вверх и подходит к нижней части рукоятки плавно,
    // с вертикальной касательной на обоих концах — без прямых углов.
    const bend=Math.max(42,Math.min(105,Math.abs(a.y-b.y)*0.34+38));
    const d='M '+a.x+','+a.y+' C '+a.x+','+(a.y-bend)+' '+b.x+','+(b.y+bend)+' '+b.x+','+b.y;
    return '<path d="'+d+'" fill="none" stroke="#20252a" stroke-width="8" stroke-linecap="round"/><path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="5" stroke-linecap="round"/>';
  }
  function probe(p,color,key,label){return '<g class="mm-probe" data-probe="'+key+'" transform="translate('+p.x+','+p.y+')" style="touch-action:none"><line x1="0" y1="0" x2="0" y2="16" stroke="#c3c8cc" stroke-width="3" pointer-events="none"/><path d="M 0,0 L -2,8 L 2,8 Z" fill="#e4e7e9" pointer-events="none"/><rect x="-8" y="14" width="16" height="35" rx="7" fill="'+color+'" stroke="#20252a" stroke-width="2" pointer-events="none"/><rect x="-4" y="19" width="8" height="17" rx="3" fill="#fff" opacity=".2" pointer-events="none"/><rect class="mm-probe-grip" x="-16" y="10" width="32" height="44" rx="12" fill="transparent" pointer-events="all" style="cursor:grab"><title>'+label+' щуп — возьмите за рукоятку и поднесите остриё к клемме</title></rect></g>';}
  let s='';
  s+='<g class="multimeter-body" transform="translate('+METER.x+','+METER.y+')" style="cursor:grab;touch-action:none">';
  s+='<rect x="0" y="0" width="230" height="330" rx="24" fill="#e8b817" stroke="#6f5a0c" stroke-width="4"/><rect x="8" y="8" width="214" height="314" rx="18" fill="#f2ca2e" stroke="#ffe77d"/>';
  s+='<rect x="63" y="-7" width="18" height="18" rx="5" fill="#17191c" stroke="#6d5b12" stroke-width="2"/><rect x="149" y="-7" width="18" height="18" rx="5" fill="#d62f35" stroke="#6d5b12" stroke-width="2"/>';
  s+='<text x="72" y="27" text-anchor="middle" font-size="9" font-weight="800" fill="#4b3f0b">COM</text><text x="158" y="27" text-anchor="middle" font-size="9" font-weight="800" fill="#4b3f0b">V Ω</text>';
  s+='<text x="115" y="42" text-anchor="middle" font-size="10" font-weight="800" fill="#51440d" font-family="Segoe UI,Arial">ЦИФРОВОЙ МУЛЬТИМЕТР</text>';
  s+='<rect x="20" y="48" width="190" height="61" rx="7" fill="#26322e" stroke="#111a17" stroke-width="3"/><rect x="27" y="55" width="176" height="47" rx="4" fill="'+(res&&res.danger?'#d8a27b':'#a8c5ad')+'"/>';
  s+='<text x="115" y="70" text-anchor="middle" font-size="9" font-weight="700" fill="#33463b" font-family="Segoe UI,Arial">'+escapeHtml(cap)+'</text>';
  s+='<text x="115" y="96" text-anchor="middle" font-size="'+(display.length>10?'18':'25')+'" font-weight="800" fill="#17241d" font-family="Consolas,monospace">'+escapeHtml(display)+'</text>';
  modes.forEach(function(m,i){
    const col=i%2,row=Math.floor(i/2),x=20+col*97,y=150+row*44,w=93,selected=m[0]===state.mm.fn;
    s+='<g class="mm-mode" data-mm-fn="'+m[0]+'" style="cursor:pointer"><rect x="'+x+'" y="'+(y-21)+'" width="'+w+'" height="30" rx="8" fill="'+(selected?'#26333c':'rgba(255,255,255,.32)')+'" stroke="'+(selected?'#10171c':'rgba(100,75,0,.30)')+'"/><text x="'+(x+w/2)+'" y="'+y+'" text-anchor="middle" font-size="'+(m[1].length>7?8.5:11)+'" font-weight="800" fill="'+(selected?'#ffe47a':'#54470e')+'" font-family="Segoe UI,Arial">'+m[1]+'</text></g>';
  });
  s+='<foreignObject x="16" y="270" width="198" height="45"><div xmlns="http://www.w3.org/1999/xhtml" class="mm-object-note '+(res&&res.danger?'danger':'')+'">'+escapeHtml(note)+'</div></foreignObject>';
  s+='</g>';
  // Провода рисуются поверх корпуса: видно, что они выходят именно из верхних вводов.
  s+=cable(blackJack,{x:black.x,y:black.y+49},'#17191c')+cable(redJack,{x:red.x,y:red.y+49},'#d62f35');
  s+=probe(black,'#17191c','b','Чёрный')+probe(red,'#d62f35','a','Красный');
  mmLayer.innerHTML=s;
}
function mmPick(devId, key){
  if (!state.mm.a || state.mm.b){ state.mm.a = { devId:devId, key:key }; state.mm.b = null; }
  else state.mm.b = { devId:devId, key:key };
  renderAll();
  const res = measureNow();
  if (res){
    log('Мультиметр ['+res.cap+']: ' + termName(state.mm.a) + ' — ' + termName(state.mm.b) + ' = ' + res.display + '. ' +
        res.note.replace(/<[^>]+>/g,''), res.danger?'err':'info');
  }
}

/* Отдельный мультиметр: корпус и оба щупа перемещаются независимо.
   При отпускании щуп защёлкивается на ближайшей клемме. */
let meterDrag = null, meterProbeDrag = null, meterProbeHover = null;
function meterProbePoint(key){
  const sel=state.mm[key];
  if(sel){const t=terminal(sel.devId,sel.key);if(t)return {x:t.x,y:t.y};}
  return key==='a'?{x:METER.redX,y:METER.redY}:{x:METER.blackX,y:METER.blackY};
}
function nearestTerminalForProbe(p){
  let best=null,dist=Infinity;
  Array.prototype.forEach.call(termLayer.querySelectorAll('.term'),function(el){
    const x=Number(el.getAttribute('cx')),y=Number(el.getAttribute('cy'));
    const d=Math.hypot(x-p.x,y-p.y);
    if(d<dist){dist=d;best={devId:toDevId(el.dataset.dev),key:el.dataset.key,x:x,y:y};}
  });
  return dist<=34?best:null;
}
mmLayer.addEventListener('pointerdown',function(evt){
  if(evt.button!==0)return;
  const mode=evt.target.closest('.mm-mode');
  if(mode){
    evt.preventDefault();evt.stopPropagation();
    state.mm.fn=mode.getAttribute('data-mm-fn')||'voltage';
    const names={voltage:'напряжение AC',dcvoltage:'напряжение DC',resistance:'сопротивление',continuity:'прозвонка'};
    trace('Мультиметр: выбран режим «'+(names[state.mm.fn]||state.mm.fn)+'».');
    renderMM();return;
  }
  const probe=evt.target.closest('.mm-probe');
  if(probe){
    evt.preventDefault();evt.stopPropagation();cancelWire();
    const key=probe.getAttribute('data-probe'),p=meterProbePoint(key),cursor=svgPoint(evt);
    state.mm[key]=null;
    if(key==='a'){METER.redX=p.x;METER.redY=p.y;}else{METER.blackX=p.x;METER.blackY=p.y;}
    meterProbeHover=null;
    meterProbeDrag={pointerId:evt.pointerId,key:key,offX:p.x-cursor.x,offY:p.y-cursor.y};
    renderTerminals();renderMM();return;
  }
  const body=evt.target.closest('.multimeter-body');
  if(body){
    evt.preventDefault();evt.stopPropagation();cancelWire();
    const p=svgPoint(evt);
    meterDrag={pointerId:evt.pointerId,offX:p.x-METER.x,offY:p.y-METER.y};
  }
});
document.addEventListener('pointermove',function(evt){
  if(meterDrag&&evt.pointerId===meterDrag.pointerId){
    const p=svgPoint(evt),nx=p.x-meterDrag.offX,ny=p.y-meterDrag.offY;
    const dx=nx-METER.x,dy=ny-METER.y;
    // Щуп, который ещё не установлен на клемму, переносится вместе с прибором.
    if(!state.mm.a){METER.redX+=dx;METER.redY+=dy;}
    if(!state.mm.b){METER.blackX+=dx;METER.blackY+=dy;}
    METER.x=nx;METER.y=ny;renderMM();
  }
  if(meterProbeDrag&&evt.pointerId===meterProbeDrag.pointerId){
    const p=svgPoint(evt);
    const tip={x:p.x+meterProbeDrag.offX,y:p.y+meterProbeDrag.offY};
    if(meterProbeDrag.key==='a'){METER.redX=tip.x;METER.redY=tip.y;}
    else{METER.blackX=tip.x;METER.blackY=tip.y;}
    meterProbeHover=nearestTerminalForProbe(tip);
    renderTerminals();
  }
});
function finishMeterPointer(evt){
  if(meterDrag&&(!evt||evt.pointerId===undefined||evt.pointerId===meterDrag.pointerId))meterDrag=null;
  if(!meterProbeDrag||evt&&evt.pointerId!==undefined&&evt.pointerId!==meterProbeDrag.pointerId)return;
  const key=meterProbeDrag.key,p=meterProbePoint(key),hit=meterProbeHover||nearestTerminalForProbe(p);
  meterProbeDrag=null;
  meterProbeHover=null;
  if(hit){
    state.mm[key]={devId:hit.devId,key:hit.key};
    if(key==='a'){METER.redX=hit.x;METER.redY=hit.y;}else{METER.blackX=hit.x;METER.blackY=hit.y;}
  }
  renderTerminals();renderMM();
  const res=measureNow();
  if(res)log('Мультиметр ['+res.cap+']: '+termName(state.mm.a)+' — '+termName(state.mm.b)+' = '+res.display+'. '+res.note,res.danger?'err':'info');
}
document.addEventListener('pointerup',finishMeterPointer);
document.addEventListener('pointercancel',finishMeterPointer);

/* ============================================================
   8b. МАСШТАБ И ПЕРЕМЕЩЕНИЕ РАБОЧЕГО ПОЛЯ
   колесо мыши — приблизить/отдалить, зажатое колесо — сдвинуть поле
   ============================================================ */
let view = { x:0, y:0, w:VW, h:VH };
let pan = null;
const Z_MIN = VW/8, Z_MAX = VW*1.4;

/* Геометрия viewBox одинакова на ПК и мобильных устройствах. Адаптация экрана
   выполняется интерфейсом, а не изменением координат сцены: так колесо мыши,
   кнопки масштаба и предельное отдаление остаются прежними. */
function viewAspect(){return VH/VW;}

function applyView(){
  scene.setAttribute('viewBox', view.x+' '+view.y+' '+view.w+' '+view.h);
  const z = document.getElementById('zval');
  if (z) z.textContent = Math.round(VW/view.w*100) + '%';
}
function clampView(){
  view.w = Math.max(Z_MIN, Math.min(Z_MAX, view.w));
  view.h = view.w * viewAspect();
  const mx = view.w*0.35, my = view.h*0.35;
  view.x = Math.max(-mx, Math.min(VW - view.w + mx, view.x));
  // При отдалении не открываем сотни пикселей пустого поля над вводом XT1.
  view.y = Math.max(-40, Math.min(VH - view.h + my, view.y));
}
function screenToScene(cx, cy){
  const m = scene.getScreenCTM();
  if (!m) return { x:cx, y:cy };
  return new DOMPoint(cx, cy).matrixTransform(m.inverse());
}
function zoomAt(factor, cx, cy){
  const p = (cx === undefined) ? { x:view.x + view.w/2, y:view.y + view.h/2 } : screenToScene(cx, cy);
  const nw = Math.max(Z_MIN, Math.min(Z_MAX, view.w * factor));
  const rf = nw / view.w;
  view.x = p.x - (p.x - view.x) * rf;
  view.y = p.y - (p.y - view.y) * rf;
  view.w = nw;
  view.h = nw * viewAspect();
  clampView();
  applyView();
}
function resetView(){view={x:0,y:0,w:VW,h:VH};applyView();}
if(typeof window.addEventListener==='function')window.addEventListener('resize',function(){clampView();applyView();hideWireMenu();hideObjectMenu();});

scene.addEventListener('wheel', function(evt){
  evt.preventDefault();
  zoomAt(evt.deltaY < 0 ? 0.88 : 1.14, evt.clientX, evt.clientY);
}, { passive:false });
scene.addEventListener('mousedown', function(evt){ if (evt.button === 1) evt.preventDefault(); });
scene.addEventListener('auxclick',  function(evt){ if (evt.button === 1) evt.preventDefault(); });
scene.addEventListener('pointerdown', function(evt){
  if (evt.button !== 1) return;                    // зажали колесо — двигаем поле
  evt.preventDefault();
  pan = { sx: evt.clientX, sy: evt.clientY, vx: view.x, vy: view.y };
  const st = document.querySelector('.stage');
  if (st && st.classList) st.classList.add('panning');
});
document.addEventListener('pointermove', function(evt){
  if (!pan) return;
  const m = scene.getScreenCTM();
  if (!m || !m.a) return;
  view.x = pan.vx - (evt.clientX - pan.sx) / m.a;
  view.y = pan.vy - (evt.clientY - pan.sy) / m.d;
  clampView();
  applyView();
  if (pending){
    const p = svgPoint(evt);
    if (isFinite(p.x) && isFinite(p.y)) pending.pt = p;
    renderWires();
  }
});
document.addEventListener('pointerup', function(evt){
  if (!pan) return;
  pan = null;
  const st = document.querySelector('.stage');
  if (st && st.classList) st.classList.remove('panning');
});
if (typeof document.getElementById('zin').addEventListener === 'function'){
  document.getElementById('zin').addEventListener('click', function(){ zoomAt(0.8); });
  document.getElementById('zout').addEventListener('click', function(){ zoomAt(1.25); });
  document.getElementById('zfit').addEventListener('click', resetView);
}

/* ============================================================
   9. ПАНЕЛЬ: ЛОТОК ДЕТАЛЕЙ
   ============================================================ */
function specialTrayPreview(key){
  if(key==='panel'){
    const panel={x:0,y:0,railCount:2,tag:'ЩР'};
    let s=panelInner(panel);
    if(!state.special.inbox)s+='<g transform="translate('+PANEL.inboxX+','+PANEL.inboxY+')">'+inboxInner(false)+'</g>';
    for(let row=0;row<2;row++)s+=railSvg({x:40,y:PANEL.firstRail+row*PANEL.pitch,slots:SLOTS});
    return '<svg class="mini" viewBox="0 0 '+PANEL.width+' '+panelHeight(panel)+'" preserveAspectRatio="xMidYMid meet">'+s+'</svg>';
  }
  if(key==='clamp')return '<svg class="mini" viewBox="-36 -36 172 72" preserveAspectRatio="xMidYMid meet">'+clampObjectSvg({id:'preview',x:0,y:0,wireId:null,drag:false},{})+'</svg>';
  if(key==='motor'){
    return '<svg class="mini" viewBox="-20 -20 272 292" preserveAspectRatio="xMidYMid meet">'
      +motorInner(0,{load:0,rpm:0,current:0,visualDur:1})+'</svg>';
  }
  if(key==='dcmotor'){
    return '<svg class="mini" viewBox="-20 -20 272 292" preserveAspectRatio="xMidYMid meet">'
      +dcMotorInner(0,null,{angle:0})+'</svg>';
  }
  if(key==='pushbutton'){
    return '<svg class="mini" viewBox="-24 0 218 300" preserveAspectRatio="xMidYMid meet">'
      +pushbuttonInner()+'</svg>';
  }
  if(key==='inbox'){
    return '<svg class="mini" viewBox="0 0 '+inboxWidth()+' '+INBOX.h+'" preserveAspectRatio="xMidYMid meet">'
      +inboxInner()+'</svg>';
  }
  if(key==='multimeter'){
    return '<svg class="mini" viewBox="0 -28 230 358" preserveAspectRatio="xMidYMid meet">'
      +'<rect x="0" y="0" width="230" height="330" rx="24" fill="#e8b817" stroke="#6f5a0c" stroke-width="5"/>'
      +'<rect x="9" y="9" width="212" height="312" rx="17" fill="#f2ca2e" stroke="#ffe77d" stroke-width="2"/>'
      +'<rect x="63" y="-7" width="18" height="18" rx="5" fill="#17191c"/><rect x="149" y="-7" width="18" height="18" rx="5" fill="#d62f35"/>'
      +'<rect x="20" y="48" width="190" height="61" rx="7" fill="#26322e"/><rect x="27" y="55" width="176" height="47" rx="4" fill="#a8c5ad"/>'
      +'<text x="115" y="87" text-anchor="middle" font-size="25" font-weight="800" fill="#17241d" font-family="Consolas,monospace">—</text>'
      +'<rect x="20" y="129" width="93" height="30" rx="8" fill="#26333c"/><rect x="117" y="129" width="93" height="30" rx="8" fill="rgba(255,255,255,.32)"/>'
      +'<rect x="20" y="171" width="93" height="30" rx="8" fill="rgba(255,255,255,.32)"/><rect x="117" y="171" width="93" height="30" rx="8" fill="rgba(255,255,255,.32)"/>'
      +'<text x="66" y="150" text-anchor="middle" font-size="11" font-weight="800" fill="#ffe47a">V~</text><text x="163" y="150" text-anchor="middle" font-size="11" font-weight="800" fill="#54470e">V⎓</text>'
      +'<text x="66" y="192" text-anchor="middle" font-size="11" font-weight="800" fill="#54470e">Ω</text><text x="163" y="192" text-anchor="middle" font-size="8.5" font-weight="800" fill="#54470e">ПРОЗВОНКА</text>'
      +'<g transform="translate(72,-28)"><line y2="16" stroke="#c3c8cc" stroke-width="4"/><rect x="-9" y="14" width="18" height="36" rx="7" fill="#17191c"/></g>'
      +'<g transform="translate(158,-28)"><line y2="16" stroke="#c3c8cc" stroke-width="4"/><rect x="-9" y="14" width="18" height="36" rx="7" fill="#d62f35"/></g></svg>';
  }
  return '';
}
function renderTray(){
  const box = document.getElementById('tray');
  let html = '';
  Object.keys(STOCK).forEach(function(type){
    const t = TYPES[type], w = t.modules*MODULE, h = t.h, over = t.over || 0, overR = t.overR || 0;
    html += '<div class="tray-item" data-type="'+type+'">'
          +   '<svg class="mini" viewBox="0 '+(-over)+' '+(w+overR)+' '+(h+over)+'" preserveAspectRatio="xMidYMid meet">'+deviceInner(type,{})+'</svg>'
          +   '<div class="tray-meta"><b>'+t.title+'</b>'
          +     '<span>'+(t.freeOnly?'свободное размещение':t.modules+' мод. · '+(t.modules*17.5).toFixed(1)+' мм')+' · '+(KIND_RU[t.kind]||'')+'</span></div>'
          +   '<span class="stock" title="Количество не ограничено">∞</span><button type="button" class="tray-add" aria-label="Разместить: '+escapeHtml(t.title)+'">+</button>'
          + '</div>';
  });
  const specialTitles={inbox:'Клеммная коробка XT1',pushbutton:'Кнопочный пост',motor:'Асинхронный двигатель',dcmotor:'Двигатель постоянного тока',multimeter:'Цифровой мультиметр',clamp:'Токовые клещи',panel:'Монтажный щит'};
  const unlimitedSpecials={motor:true,dcmotor:true,pushbutton:true,clamp:true,panel:true};
  Object.keys(specialTitles).forEach(function(key){
    if(key==='inbox'&&state.standaloneRails===false)return;
    if(!unlimitedSpecials[key]&&state.special[key])return;
    html+='<div class="tray-item tray-special" data-special="'+key+'">'
        +specialTrayPreview(key)+'<div class="tray-meta"><b>'+specialTitles[key]+'</b>'
        +'<span>Перетащите на рабочее поле</span></div><span class="stock">'+(unlimitedSpecials[key]?'∞':'×1')+'</span><button type="button" class="tray-add" aria-label="Разместить: '+specialTitles[key]+'">+</button></div>';
  });
  box.innerHTML = html || '<div class="empty-tray">Все аппараты установлены на рейке</div>';
}

function lampsOn(){
  const q = inputBreaker(), km = contactor();
  return !!(state.power && q && q.on && !q.tripped && km && km.coil);
}

/* ============================================================
   ПРОТОКОЛ ИСПЫТАНИЙ
   В протокол попадает только то, что имеет смысл при разборе работы:
   аварии (err), предупреждения (warn), значимые действия (ok) и справка
   по аппаратам (info). Служебная рутина — цвет и форма провода, режим
   мультиметра, работа с пресетами — идёт мимо протокола через trace()
   и остаётся только в консоли разработчика.
   ============================================================ */
const LOG_LIMIT = 60;
const LOG_LEVEL_RU = { err:'АВАРИЯ', warn:'ВНИМАНИЕ', ok:'ДЕЙСТВИЕ', info:'СПРАВКА' };
const LOG_FILTERS = {
  fault:{ title:'Аварии',              levels:['err','warn'] },
  work: { title:'Аварии и действия',   levels:['err','warn','ok'] },
  all:  { title:'Всё',                 levels:['err','warn','ok','info'] }
};
let logItems = [];
let logFilter = 'work';
let logFaultCount = 0;
function trace(msg){
  if (typeof console !== 'undefined' && console.log) console.log('[стенд] ' + msg);
}
function isFaultKind(kind){ return kind === 'err' || kind === 'warn'; }
function logTimeStamp(){
  const d = new Date();
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0');
}
function log(msg, kind){
  const level = LOG_LEVEL_RU[kind] ? kind : 'info';
  logItems.unshift({ ts:logTimeStamp(), msg:String(msg), kind:level });
  if (logItems.length > LOG_LIMIT) logItems.pop();
  if (isFaultKind(level)) logFaultCount++;
  renderLog();
  trace(msg);
}
function renderLog(){
  const box = document.getElementById('log');
  if (!box) return;
  const levels = (LOG_FILTERS[logFilter] || LOG_FILTERS.work).levels;
  const visible = logItems.filter(function(i){ return levels.indexOf(i.kind) >= 0; });
  if (visible.length){
    box.innerHTML = visible.map(function(i){
      return '<div class="'+i.kind+'"><time>'+escapeHtml(i.ts)+'</time>'+escapeHtml(i.msg)+'</div>';
    }).join('');
  } else if (!logItems.length){
    box.innerHTML = '<div class="log-empty">Протокол пуст. Соберите схему, включите питание и запустите двигатель.</div>';
  } else {
    box.innerHTML = '<div class="log-empty">В выбранном фильтре записей нет. Всего в протоколе: '+logItems.length+'.</div>';
  }
  box.scrollTop = 0;
  const count = document.getElementById('logCount');
  if (count) count.textContent = 'Записей: ' + logItems.length;
  const faults = document.getElementById('logFaultCount');
  if (faults){
    faults.textContent = 'Аварий и предупреждений: ' + logFaultCount;
    faults.classList.toggle('clean', logFaultCount === 0);
  }
}
function setLogFilter(name){
  if (!LOG_FILTERS[name]) return;
  logFilter = name;
  const box = document.getElementById('logFilters');
  if (box) Array.prototype.forEach.call(box.querySelectorAll('[data-log-filter]'), function(b){
    const on = b.getAttribute('data-log-filter') === name;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  renderLog();
}
function clearLog(){
  logItems = [];
  logFaultCount = 0;
  renderLog();
}
/* Восстановление протокола из пресета: неизвестные уровни отбрасываем,
   иначе импортированный файл мог бы подсунуть произвольный CSS-класс. */
function restoreLog(journal){
  const items = (journal && Array.isArray(journal.items)) ? journal.items : [];
  logItems = items.filter(function(i){ return i && LOG_LEVEL_RU[i.kind]; })
                  .slice(0, LOG_LIMIT)
                  .map(function(i){ return { ts:String(i.ts || ''), msg:String(i.msg || ''), kind:i.kind }; });
  logFaultCount = Math.max(0, Number(journal && journal.faultCount) || 0);
  setLogFilter((journal && LOG_FILTERS[journal.filter]) ? journal.filter : 'work');
}
function protocolText(){
  const input = document.getElementById('presetName');
  const name = (input && input.value ? input.value : '').trim() || 'без названия';
  const now = new Date();
  const stamp = now.toLocaleDateString('ru-RU') + ', ' + logTimeStamp();
  const head = [
    'ПРОТОКОЛ ИСПЫТАНИЙ',
    'Тренажёр-стенд «Пуск и реверс трёхфазного асинхронного двигателя»',
    'Дата: ' + stamp,
    'Схема: ' + name,
    'Записей: ' + logItems.length + ' · аварий и предупреждений: ' + logFaultCount,
    new Array(64).join('-')
  ];
  const rows = logItems.slice().reverse().map(function(i){
    return i.ts + '  ' + (LOG_LEVEL_RU[i.kind] || 'ЗАПИСЬ').padEnd(9, ' ') + '  ' + i.msg;
  });
  return head.concat(rows.length ? rows : ['Записей нет.']).join('\r\n') + '\r\n';
}
function downloadTextFile(text, filename){
  try{
    const blob = new Blob([text], { type:'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    return true;
  }catch(e){ return false; }
}
function exportProtocol(){
  if (!logItems.length){ warn('Протокол пуст — нечего выгружать.'); return; }
  const text = protocolText();
  const stamp = new Date().toISOString().slice(0,10);
  if (!downloadTextFile(text, safePresetFilename('Протокол-стенда-' + stamp) + '.txt')){
    warn('Не удалось подготовить файл протокола.');
    return;
  }
  log('Протокол испытаний выгружен в файл (записей: ' + logItems.length + ').', 'ok');
}
let toastTimer = null;
function warn(msg){
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.className = 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ el.className=''; }, 3400);
}
function showPhaseFault(msg){
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show fault';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ el.className=''; }, 7000);
}

function renderSide(){
  renderMotor();
  renderTray();
  renderMM();
}
function renderAll(){
  syncPanelInbox();
  updateCoils();                 // сначала считаем, что замкнуто в цепи (катушка A1–A2)
  renderPanels();renderRail();
  renderInbox();
  renderDevices();
  renderRelays();
  renderTerminalGuides();
  renderWires();
  renderTerminals();
  renderMM();
  renderSide();
  renderClamp();
}

/* ============================================================
   ЛОКАЛЬНЫЕ ПРЕСЕТЫ СХЕМ
   ============================================================ */
const PRESET_STORAGE_KEY = 'ad-trainer-schemes-v1';
let presetFolderHandle=null,presetFolderRefresh=null,presetFolderNeedsPermission=false,presetFolderPersistenceFailed=false;
let folderPresets=presetFilesToPresets(window.ELECTROSIM_PRESET_CATALOG||[]);
function presetStatus(text, error){
  const el=document.getElementById('presetStatus');
  if(!el) return;
  el.textContent=text;
  el.style.color=error?'#ff9a9a':'#93a2b4';
}
function readBrowserPresets(){
  try{
    const raw=localStorage.getItem(PRESET_STORAGE_KEY);
    const list=raw?JSON.parse(raw):[];
    return Array.isArray(list)?list:[];
  }catch(e){ presetStatus('Локальное хранилище браузера недоступно.',true); return []; }
}
function readPresets(){return readBrowserPresets().concat(folderPresets);}
function writePresets(list){
  try{ localStorage.setItem(PRESET_STORAGE_KEY,JSON.stringify(list.filter(function(p){return !p._folderFile;}))); return true; }
  catch(e){ presetStatus('Не удалось сохранить: локальное хранилище недоступно или заполнено.',true); return false; }
}
function presetsFromData(data){
  let incoming=[];
  if(data&&data.format==='ad-trainer-schemes'&&Array.isArray(data.presets))incoming=data.presets;
  else if(data&&data.format==='ad-trainer-scheme'&&data.preset)incoming=[data.preset];
  else if(data&&data.state)incoming=[data];
  return incoming.filter(function(p){return p&&p.state&&Array.isArray(p.state.devices)&&Array.isArray(p.state.wires)
    &&p.state.devices.every(function(d){return d&&typeof d.type==='string'&&Object.prototype.hasOwnProperty.call(TYPES,d.type);})
    &&p.state.wires.every(function(w){return w&&w.a&&w.b&&w.a.devId!==undefined&&w.b.devId!==undefined&&typeof w.a.key==='string'&&typeof w.b.key==='string';});});
}
function presetFilesToPresets(files){
  const list=[];
  if(!Array.isArray(files))return list;
  files.forEach(function(entry){
    if(!entry||typeof entry.file!=='string')return;
    presetsFromData(entry.data).forEach(function(source,index){
      const p=JSON.parse(JSON.stringify(source));
      p.id='folder:'+encodeURIComponent(entry.file)+':'+encodeURIComponent(String(p.id||index))+':'+index;
      p.name=String(p.name||entry.file.replace(/\.ad-scheme\.json$|\.json$/i,''));
      p.updated=Number(p.updated)||Number(entry.modified)||0;
      p._folderFile=entry.file;
      p.state.wires.forEach(function(w){delete w.previewShape;});
      list.push(p);
    });
  });
  return list;
}
function presetFolderStatus(message,error){
  const el=document.getElementById('presetFolderStatus');
  if(el){el.textContent=message;el.style.color=error?'#ff9a9a':'#93a2b4';}
  const button=document.getElementById('presetFolderConnect');
  if(button)button.textContent=presetFolderNeedsPermission?'Разрешить доступ к папке presets':presetFolderHandle?'Сменить папку presets':'Подключить папку presets';
}
function presetFolderDb(){
  return new Promise(function(resolve,reject){
    if(typeof indexedDB==='undefined'){reject(new Error('indexedDB'));return;}
    const request=indexedDB.open('electrosim-preset-folder',1);
    request.onupgradeneeded=function(){request.result.createObjectStore('handles');};
    request.onsuccess=function(){resolve(request.result);};
    request.onerror=function(){reject(request.error);};
    request.onblocked=function(){reject(new Error('blocked'));};
  });
}
async function readPresetFolderHandle(){
  const db=await presetFolderDb();
  return new Promise(function(resolve,reject){
    const request=db.transaction('handles','readonly').objectStore('handles').get('presets');
    request.onsuccess=function(){db.close();resolve(request.result||null);};
    request.onerror=function(){db.close();reject(request.error);};
  });
}
async function storePresetFolderHandle(handle){
  const db=await presetFolderDb();
  return new Promise(function(resolve,reject){
    const transaction=db.transaction('handles','readwrite');
    transaction.objectStore('handles').put(handle,'presets');
    transaction.oncomplete=function(){db.close();resolve();};
    transaction.onerror=transaction.onabort=function(){db.close();reject(transaction.error);};
  });
}
async function scanPresetDirectory(handle){
  const entries=[],ignored=[];
  for await(const entry of handle.values()){
    if(entry.kind!=='file'||!/\.json$/i.test(entry.name))continue;
    try{
      const file=await entry.getFile(),data=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
      if(!presetsFromData(data).length)throw new Error('format');
      entries.push({file:entry.name,modified:file.lastModified,data:data});
    }catch(error){
      if(error.name==='NotAllowedError')throw error;
      ignored.push(entry.name);
    }
  }
  entries.sort(function(a,b){return a.file.localeCompare(b.file,'ru');});
  return {presets:presetFilesToPresets(entries),ignored:ignored};
}
async function refreshPresetFolder(){
  if(!presetFolderHandle)return;
  if(presetFolderRefresh)return presetFolderRefresh;
  const handle=presetFolderHandle;
  presetFolderRefresh=(async function(){
    try{
      if(await handle.queryPermission({mode:'read'})!=='granted'){
        presetFolderNeedsPermission=true;
        presetFolderStatus('Для автоматического чтения папки разрешите доступ к ней.',false);return;
      }
      const scanned=await scanPresetDirectory(handle);
      if(handle!==presetFolderHandle)return;
      presetFolderNeedsPermission=false;
      if(JSON.stringify(scanned.presets)!==JSON.stringify(folderPresets)){
        folderPresets=scanned.presets;renderPresetList();
      }
      presetFolderStatus('Папка '+handle.name+': схем '+folderPresets.length+'. Список обновляется автоматически.'+(scanned.ignored.length?' Пропущено файлов: '+scanned.ignored.length+'.':'')+(presetFolderPersistenceFailed?' При следующем открытии подключите папку снова.':''),!!scanned.ignored.length);
    }catch(error){
      presetFolderNeedsPermission=error.name==='NotAllowedError';
      presetFolderStatus(presetFolderNeedsPermission?'Доступ к папке отозван. Разрешите его снова.':'Не удалось прочитать папку. Проверьте, что она доступна, или выберите её снова.',true);
    }
  })();
  try{await presetFolderRefresh;}finally{presetFolderRefresh=null;}
}
async function connectPresetFolder(){
  if(typeof window.showDirectoryPicker!=='function'){
    presetFolderStatus('Этот браузер не поддерживает автоматическое чтение папок. Подключите папку в Chrome или Edge; импорт отдельных файлов доступен здесь.',true);return;
  }
  try{
    if(presetFolderHandle&&presetFolderNeedsPermission){
      if(await presetFolderHandle.requestPermission({mode:'read'})!=='granted'){
        presetFolderStatus('Доступ не предоставлен. Схемы из браузера и каталога остаются доступны.',true);return;
      }
    }else{
      const selected=await window.showDirectoryPicker({id:'electrosim-presets',mode:'read'});
      let handle=selected;
      if(selected.name.toLowerCase()!=='presets'){
        // Можно выбрать и всю папку проекта: находим в ней presets.
        for await(const child of selected.values())if(child.kind==='directory'&&child.name.toLowerCase()==='presets'){handle=child;break;}
      }
      presetFolderHandle=handle;
      try{await storePresetFolderHandle(handle);presetFolderPersistenceFailed=false;}catch(error){presetFolderPersistenceFailed=true;}
    }
    if(presetFolderRefresh)await presetFolderRefresh;
    await refreshPresetFolder();
  }catch(error){if(error.name!=='AbortError')presetFolderStatus('Не удалось подключить папку. Попробуйте выбрать presets ещё раз.',true);}
}
async function initPresetFolder(){
  presetFolderStatus('Из папки presets подключено схем: '+folderPresets.length+'. Для чтения новых файлов подключите папку.');
  if(typeof window.showDirectoryPicker!=='function')return;
  const originalHandle=presetFolderHandle;
  try{
    const saved=await readPresetFolderHandle();
    if(saved&&presetFolderHandle===originalHandle){presetFolderHandle=saved;await refreshPresetFolder();}
  }catch(error){/* Отсутствие разрешения или IndexedDB не мешает обычным схемам. */}
}
function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}
function schemeSnapshot(name,id){
  syncPanelInbox();
  const wires=state.wires.map(function(w){
    const copy=JSON.parse(JSON.stringify(w));
    delete copy.previewShape;
    return copy;
  });
  const devices=JSON.parse(JSON.stringify(state.devices));
  devices.forEach(function(d){
    if(d.type==='timer'){
      delete d.timerActive;delete d.timerSupply;delete d.timerSince;delete d.timerLastSignal;
    }
    if(d.type==='vfd'){
      delete d.vfdPressed;delete d.vfdPressToken;delete d.vfdInputReady;
      delete d.vfdInputVoltage;delete d.vfdInputFrequency;delete d.vfdOutputActive;
    }
    if(d.type==='tp'){
      delete d.tpPressed;delete d.tpPressToken;delete d.tpInputReady;
      delete d.tpInputVoltage;delete d.tpInputFrequency;
    }
  });
  return {
    version:3,id:id||('scheme-'+Date.now().toString(36)),name:name,updated:Date.now(),
    state:{power:state.power,devices:devices,
      relays:JSON.parse(JSON.stringify(state.relays)),wires:wires,nextId:state.nextId,
      motors:JSON.parse(JSON.stringify(state.motors)),
      pushbuttons:JSON.parse(JSON.stringify(state.pushbuttons)),
      panels:JSON.parse(JSON.stringify(state.panels)),
      standaloneRails:state.standaloneRails!==false,
      clamps:state.clamps.map(function(c){return {id:c.id,tag:c.tag,customName:c.customName,x:c.x,y:c.y,wireId:c.wireId,fraction:c.fraction};}),
      specialProps:JSON.parse(JSON.stringify(state.specialProps||{})),
      special:JSON.parse(JSON.stringify(state.special))},
    positions:{inbox:{x:INBOX.x,y:INBOX.y},pushbutton:{x:PB.x,y:PB.y},
      motor:{x:MOTOR.x,y:MOTOR.y,load:MOTOR.load},
      multimeter:{x:METER.x,y:METER.y,redX:METER.redX,redY:METER.redY,
        blackX:METER.blackX,blackY:METER.blackY,fn:state.mm.fn,
        a:state.mm.a?JSON.parse(JSON.stringify(state.mm.a)):null,
        b:state.mm.b?JSON.parse(JSON.stringify(state.mm.b)):null}},
    // Протокол испытаний переносится вместе со схемой: его можно приложить к отчёту.
    journal:{items:JSON.parse(JSON.stringify(logItems)),faultCount:logFaultCount,filter:logFilter},
    view:{x:view.x,y:view.y,w:view.w,h:view.h}
  };
}
function renderPresetList(selectedId){
  const box=document.getElementById('presetList');
  if(!box) return;
  const keepSelected=selectedId||box.value;
  const local=readBrowserPresets().sort(function(a,b){return (b.updated||0)-(a.updated||0);});
  const library=folderPresets.slice().sort(function(a,b){return a.name.localeCompare(b.name,'ru');});
  const list=library.concat(local);
  if(!list.length){ box.innerHTML='<option disabled>Нет сохранённых схем</option>';box.value='';updatePresetDeleteButton();return; }
  function option(p){
    const dt=p.updated?new Date(p.updated).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
    return '<option value="'+escapeHtml(p.id)+'"'+(p._folderFile?' title="'+escapeHtml(p._folderFile)+'"':'')+'>'+escapeHtml(p.name)+(dt?' · '+dt:'')+'</option>';
  }
  box.innerHTML=(library.length?'<optgroup label="Из папки presets">'+library.map(option).join('')+'</optgroup>':'')
    +(local.length?'<optgroup label="Сохранены в браузере">'+local.map(option).join('')+'</optgroup>':'');
  box.value=list.some(function(p){return p.id===keepSelected;})?keepSelected:list[0].id;
  updatePresetDeleteButton();
}
function updatePresetDeleteButton(){
  const button=document.getElementById('presetDelete'),selected=selectedPreset();
  if(button){button.disabled=!!(selected&&selected._folderFile);button.title=selected&&selected._folderFile?'Для удаления этой схемы удалите её файл из папки presets.':'';}
}
function selectedPreset(){
  const box=document.getElementById('presetList');
  if(!box||!box.value) return null;
  return readPresets().filter(function(p){return p.id===box.value;})[0]||null;
}
function saveCurrentPreset(){
  const input=document.getElementById('presetName');
  let name=(input&&input.value?input.value:'').trim();
  const list=readBrowserPresets();
  if(!name) name='Схема '+(list.length+1);
  const old=list.filter(function(p){return String(p.name).toLowerCase()===name.toLowerCase();})[0]||null;
  const snap=schemeSnapshot(name,old&&old.id);
  const next=old?list.map(function(p){return p.id===old.id?snap:p;}):list.concat([snap]);
  if(!writePresets(next)) return;
  if(input) input.value=name;
  renderPresetList(snap.id);
  presetStatus((old?'Обновлена':'Сохранена')+' схема «'+name+'».');
  trace((old?'Пресет обновлён: ':'Пресет сохранён: ')+name+'.');
}
function loadSelectedPreset(){
  const p=selectedPreset();
  if(!p||!p.state){presetStatus('Выберите сохранённую схему.',true);return;}
  cancelWire(); hideWireMenu();
  state.power=p.state.power!==false;
  state.devices=JSON.parse(JSON.stringify(p.state.devices||[]));
  state.devices.forEach(function(d){
    if(d.type==='km1'){d.manualPressed=false;d.coil=false;}
    if(d.type==='timer'){
      d.timerActive=false;d.timerSupply=false;d.timerSince=null;d.timerLastSignal=false;
      if(!TIMER_RANGES.includes(d.timerRange))d.timerRange=10;
      if(!TIMER_LEVELS.includes(d.timerLevel))d.timerLevel=0.5;
      if(!TIMER_MODES.includes(d.timerMode))d.timerMode='on';
    }
    if(d.type==='wallSwitch'){
      d.gangs=Number(d.gangs)===2?2:1;
      d.switchOn1=!!d.switchOn1;
      d.switchOn2=d.gangs===2&&!!d.switchOn2;
      d.ratedVoltage=Math.max(1,Number(d.ratedVoltage)||220);
      d.ratedCurrent=Math.max(.01,Number(d.ratedCurrent)||10);
    }
    if(d.type==='twoWaySwitch'){
      d.switchPosition=Number(d.switchPosition)===2?2:1;
      d.ratedVoltage=Math.max(1,Number(d.ratedVoltage)||220);
      d.ratedCurrent=Math.max(.01,Number(d.ratedCurrent)||10);
    }
    if(d.type==='mcb1'||d.type==='mcb3'){
      const allowed=['C2','C4','C6','C10','C13','C16','C20','C25','C32','C40','C50','C63'];
      if(allowed.indexOf(d.breakerType)<0)d.breakerType=d.type==='mcb3'?'C25':'C10';
      d.ratedCurrent=Math.max(2,Number(String(d.breakerType).replace(/^C/,''))||10);
      d.customName=(d.type==='mcb3'?'Автомат 3P, ':'Автомат 1P, ')+d.breakerType;
    }
    if(TYPES[d.type]&&TYPES[d.type].kind==='appliance'){
      d.applianceOn=!!d.applianceOn;d.applianceBurned=!!d.applianceBurned;
      d.ratedVoltage=Math.max(1,Number(d.ratedVoltage)||220);
      syncApplianceRatings(d);
    }
    if(d.type==='tp'){
      d.ratedVoltage=Math.max(1,Number(d.ratedVoltage)||380);
      d.tpOn=!!d.tpOn;
      d.maxArmatureVoltage=Math.max(1,Number(d.maxArmatureVoltage)||220);
      d.fieldVoltage=Math.max(1,Number(d.fieldVoltage)||220);
      setTpArmatureVoltage(d, Number(d.setArmatureVoltage)||0);
    }
  });
  state.relays=JSON.parse(JSON.stringify(p.state.relays||[]));
  ensureInstanceTags();
  state.wires=JSON.parse(JSON.stringify(p.state.wires||[]));
  state.motors=JSON.parse(JSON.stringify(p.state.motors||[]));
  state.pushbuttons=JSON.parse(JSON.stringify(p.state.pushbuttons||[]));
  state.panels=JSON.parse(JSON.stringify(Array.isArray(p.state.panels)?p.state.panels:[]));
  // В старых сохранениях две отдельные рейки были частью рабочего поля.
  state.standaloneRails=p.state.standaloneRails!==false;
  state.panels.forEach(function(panel){panel.railCount=panelRailCount(panel);panel.inletVoltage=panelInletVoltage(panel);panel.x=Number(panel.x)||0;panel.y=Number(panel.y)||0;});
  state.clamps=JSON.parse(JSON.stringify(Array.isArray(p.state.clamps)?p.state.clamps:[]));
  state.clamps.forEach(function(c,i){
    c.id='CL'+(i+1);c.tag=c.tag||'PA'+(i+1);
    c.x=Number(c.x)||0;c.y=Number(c.y)||0;c.drag=false;
    const fraction=Number(c.fraction);c.fraction=Math.max(0,Math.min(1,isFinite(fraction)?fraction:.5));
    if(!state.wires.some(function(w){return w.id===c.wireId;}))c.wireId=null;
  });
  clampState=null;
  state.specialProps=Object.assign({inbox:{tag:'XT1',customName:'Ввод 3×380 В',ratedVoltage:380,frequency:50},multimeter:{tag:'PV1',customName:'Цифровой мультиметр'}},JSON.parse(JSON.stringify(p.state.specialProps||{})));
  state.specialProps.inbox=Object.assign({tag:'XT1',customName:'Ввод 3×380 В',ratedVoltage:380,frequency:50},state.specialProps.inbox||{});
  state.special=Object.assign({inbox:true,pushbutton:false,motor:false,multimeter:true},p.state.special||{});
  state.special.motor=false;
  state.special.pushbutton=false;
  const pos=p.positions||{};
  // Совместимость со старыми сохранениями, где двигатель и пост были одиночными.
  if(!state.motors.length && p.state.special && p.state.special.motor && pos.motor){
    state.motors.push({id:'M1',x:pos.motor.x,y:pos.motor.y,w:MOTOR.w,h:MOTOR.h,scale:MOTOR.scale,
      load:Number(pos.motor.load)||0,rpmActual:0,angle:0});
  }
  if(!state.pushbuttons.length && p.state.special && p.state.special.pushbutton && pos.pushbutton){
    state.pushbuttons.push({id:'PB1',tag:'SB1–SB3',x:pos.pushbutton.x,y:pos.pushbutton.y,w:PB.w,h:PB.h,
      buttons:{up:false,stop:false,down:false}});
  }
  state.motors.forEach(function(m,i){
    if(!m.id)m.id=m.kind==='dc'?('MD'+(i+1)):('M'+(i+1));
    if(!m.tag)m.tag=m.id;m.w=m.w||MOTOR.w;m.h=m.h||MOTOR.h;m.scale=m.scale||MOTOR.scale;
    m.load=Number(m.load)||0;m.rpmActual=0;m.angle=0;
    // Машина постоянного тока: паспортные данные и номиналы по умолчанию.
    if(m.kind==='dc'){
      m.ratedArmatureVoltage=Math.max(1,Number(m.ratedArmatureVoltage)||DCM.ratedArmatureVoltage);
      m.ratedArmatureCurrent=Math.max(.1,Number(m.ratedArmatureCurrent)||DCM.ratedArmatureCurrent);
      m.ratedFieldVoltage=Math.max(1,Number(m.ratedFieldVoltage)||DCM.ratedFieldVoltage);
      m.ratedSpeed=Math.max(1,Number(m.ratedSpeed)||DCM.ratedSpeed);
      m.armatureResistance=Math.max(.01,Number(m.armatureResistance)||DCM.armatureResistance);
      m.fieldResistance=Math.max(1,Number(m.fieldResistance)||DCM.fieldResistance);
      m.inertiaFactor=Math.max(.05,Number(m.inertiaFactor)||DCM.inertiaFactor);
      return;
    }
    m.polePairs=Math.max(1,Math.round(Number(m.polePairs)||2));
    const savedSlip=Number(m.ratedSlipPercent);
    m.ratedSlipPercent=Math.max(0,Math.min(95,isFinite(savedSlip)?savedSlip:10));
    m.ratedFrequency=Math.max(1,Number(m.ratedFrequency)||50);
  });
  state.pushbuttons.forEach(function(pb,i){
    if(!pb.id)pb.id='PB'+(i+1);
    if(!pb.tag){const first=i*3+1;pb.tag='SB'+first+'–SB'+(first+2);}
    pb.w=pb.w||PB.w;pb.h=pb.h||PB.h;pb.buttons={up:false,stop:false,down:false};
  });
  state.wires.forEach(function(w){
    delete w.previewShape;
    // Старые сохранения использовали одну невидимую точку PE на чашку.
    [w.a,w.b].forEach(function(end){
      if(end.key==='s1PE')end.key='s1PEt';
      if(end.key==='s2PE')end.key='s2PEt';
      if(end.devId==='PB')end.devId='PB1';
    });
  });
  state.nextId=p.state.nextId||Math.max(1,state.devices.reduce(function(m,d){return Math.max(m,+d.id||0);},0)+1);
  wireSeq=Math.max(1,state.wires.reduce(function(m,w){return Math.max(m,+w.id||0);},0)+1);
  if(pos.inbox){INBOX.x=pos.inbox.x;INBOX.y=pos.inbox.y;}
  const pm=pos.multimeter;
  if(pm){
    METER.x=isFinite(pm.x)?pm.x:875;METER.y=isFinite(pm.y)?pm.y:1080;
    METER.redX=isFinite(pm.redX)?pm.redX:1033;METER.redY=isFinite(pm.redY)?pm.redY:1022;
    METER.blackX=isFinite(pm.blackX)?pm.blackX:947;METER.blackY=isFinite(pm.blackY)?pm.blackY:1022;
    state.mm={mode:false,fn:pm.fn||'voltage',a:pm.a||null,b:pm.b||null};
  }else{
METER.x=875;METER.y=1080;METER.redX=1033;METER.redY=1022;METER.blackX=947;METER.blackY=1022;
    state.mm={mode:false,fn:'voltage',a:null,b:null};
  }
  if(inboxSinglePhase())pruneInboxConnections();
  if(p.view&&isFinite(p.view.x)&&isFinite(p.view.y)&&isFinite(p.view.w)){
    view={x:p.view.x,y:p.view.y,w:p.view.w,h:p.view.h||p.view.w*VH/VW};clampView();applyView();
  }else resetView();
  renderRail();renderAll();
  const input=document.getElementById('presetName');if(input)input.value=p.name;
  presetStatus('Загружена схема «'+p.name+'».');
  restoreLog(p.journal);
  trace('Загружен локальный пресет: '+p.name+'.');
}
function deleteSelectedPreset(){
  const p=selectedPreset();
  if(!p){presetStatus('Выберите схему для удаления.',true);return;}
  if(p._folderFile){presetStatus('Чтобы убрать эту схему, удалите её файл из папки presets.');return;}
  if(typeof window.confirm==='function'&&!window.confirm('Удалить сохранённую схему «'+p.name+'»?'))return;
  const next=readBrowserPresets().filter(function(x){return x.id!==p.id;});
  if(!writePresets(next))return;
  renderPresetList();presetStatus('Схема «'+p.name+'» удалена.');
}
function safePresetFilename(name){
  return String(name||'scheme').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,' ').trim().slice(0,80)||'scheme';
}
function downloadPresetJson(payload,filename){
  try{
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    return true;
  }catch(e){presetStatus('Не удалось создать файл сохранения.',true);return false;}
}
function exportSelectedPreset(){
  const p=selectedPreset();
  if(!p){presetStatus('Выберите схему для экспорта.',true);return;}
  const data={format:'ad-trainer-scheme',version:1,exported:new Date().toISOString(),preset:p};
  if(downloadPresetJson(data,safePresetFilename(p.name)+'.ad-scheme.json'))presetStatus('Файл схемы «'+p.name+'» подготовлен для переноса.');
}
function exportAllPresets(){
  const list=readPresets();
  if(!list.length){presetStatus('Сначала сохраните хотя бы одну схему.',true);return;}
  const data={format:'ad-trainer-schemes',version:1,exported:new Date().toISOString(),presets:list};
  const stamp=new Date().toISOString().slice(0,10);
  if(downloadPresetJson(data,'Схемы-стенда-'+stamp+'.ad-scheme.json'))presetStatus('Все сохранённые схемы экспортированы одним файлом.');
}
function uniqueImportedName(name,list){
  const base=String(name||'Импортированная схема').trim()||'Импортированная схема';
  let candidate=base,n=2;
  const used=function(v){return list.some(function(p){return String(p.name).toLowerCase()===v.toLowerCase();});};
  if(used(candidate))candidate=base+' (импорт)';
  while(used(candidate))candidate=base+' (импорт '+(n++)+')';
  return candidate;
}
function importPresetFile(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(){
    try{
      const data=JSON.parse(String(reader.result||'').replace(/^\uFEFF/,''));
      const incoming=presetsFromData(data);
      if(!incoming.length)throw new Error('format');
      const list=readBrowserPresets(),now=Date.now();
      incoming.forEach(function(src,i){
        const p=JSON.parse(JSON.stringify(src));
        p.id='scheme-import-'+now.toString(36)+'-'+i;
        p.name=uniqueImportedName(p.name,list);
        p.updated=now+i;
        delete p._folderFile;
        (p.state.wires||[]).forEach(function(w){delete w.previewShape;});
        list.push(p);
      });
      if(!writePresets(list))return;
      renderPresetList(incoming.length===1?list[list.length-1].id:null);
      presetStatus('Импортировано схем: '+incoming.length+'. Выберите нужную и нажмите «Загрузить».');
      trace('Импортировано локальных схем: '+incoming.length+'.');
    }catch(e){presetStatus('Файл не является сохранением этого тренажёра.',true);}
  };
  reader.onerror=function(){presetStatus('Не удалось прочитать файл сохранения.',true);};
  reader.readAsText(file,'utf-8');
}

/* ============================================================
   9. ОРГАНЫ УПРАВЛЕНИЯ
   ============================================================ */
const sideMenuItems=Array.prototype.slice.call(document.querySelectorAll('.side-menu-item'));
sideMenuItems.forEach(function(item){
  item.addEventListener('toggle',function(){
    if(!item.open)return;
    sideMenuItems.forEach(function(other){if(other!==item)other.open=false;});
  });
});
document.addEventListener('pointerdown',function(evt){
  if(evt.target.closest&&evt.target.closest('.side'))return;
  sideMenuItems.forEach(function(item){item.open=false;});
});
document.addEventListener('keydown',function(evt){
  if(evt.key==='Escape')sideMenuItems.forEach(function(item){item.open=false;});
});
document.getElementById('presetSave').addEventListener('click',saveCurrentPreset);
document.getElementById('presetLoad').addEventListener('click',loadSelectedPreset);
document.getElementById('presetDelete').addEventListener('click',deleteSelectedPreset);
document.getElementById('presetList').addEventListener('dblclick',loadSelectedPreset);
document.getElementById('presetList').addEventListener('change',updatePresetDeleteButton);
document.getElementById('presetFolderConnect').addEventListener('click',connectPresetFolder);
const presetDetails=document.getElementById('presetList').closest('details');
if(presetDetails)presetDetails.addEventListener('toggle',function(){if(presetDetails.open)refreshPresetFolder();});
if(typeof window.addEventListener==='function')window.addEventListener('focus',refreshPresetFolder);
document.addEventListener('visibilitychange',function(){if(!document.hidden)refreshPresetFolder();});
setInterval(function(){if(!document.hidden&&presetFolderHandle)refreshPresetFolder();},15000);
document.getElementById('presetExport').addEventListener('click',exportSelectedPreset);
document.getElementById('presetExportAll').addEventListener('click',exportAllPresets);
document.getElementById('presetImportFile').addEventListener('change',function(e){
  const file=e.target.files&&e.target.files[0];
  importPresetFile(file);
  e.target.value='';
});

/* Протокол испытаний: фильтр по уровню, выгрузка в файл, очистка. */
function initLogPanel(){
  const filters=document.getElementById('logFilters');
  if(filters)filters.addEventListener('click',function(e){
    const b=e.target.closest('[data-log-filter]');
    if(!b)return;
    setLogFilter(b.getAttribute('data-log-filter'));
  });
  const clear=document.getElementById('logClear');
  if(clear)clear.addEventListener('click',function(){
    if(!logItems.length){warn('Протокол уже пуст.');return;}
    if(typeof window.confirm==='function'&&!window.confirm('Очистить протокол испытаний? Схема и аппараты останутся на месте.'))return;
    clearLog();
  });
  const exp=document.getElementById('logExport');
  if(exp)exp.addEventListener('click',exportProtocol);
  setLogFilter(logFilter);
}

/* Настройки слева задают вид каждого следующего провода. */
function initWireDefaults(){
  const shape=document.getElementById('wireShapeDefault');
  const color=document.getElementById('wireColorDefault');
  try{
    const saved=JSON.parse(localStorage.getItem('ad-trainer-wire-defaults')||'{}');
    if(['smooth','straight','orthogonal','arc','s'].indexOf(saved.shape)>=0)wireDefaults.shape=saved.shape;
    if(/^#[0-9a-f]{6}$/i.test(saved.color||''))wireDefaults.color=saved.color;
  }catch(e){}
  function paint(){
    const shapeNames={smooth:'∿',straight:'╱',orthogonal:'└',arc:'⌒',s:'𝑆'};
    const shapeIcon=shape&&shape.querySelector('.wire-current-shape');
    if(shapeIcon)shapeIcon.textContent=shapeNames[wireDefaults.shape]||'∿';
    const colorIcon=color&&color.querySelector('.wire-current-color');
    if(colorIcon){colorIcon.style.background=wireDefaults.color;colorIcon.classList.toggle('pe',wireDefaults.color===WC.PE);}
    if(shape)shape.querySelectorAll('[data-wire-default-shape]').forEach(function(b){b.classList.toggle('selected',b.getAttribute('data-wire-default-shape')===wireDefaults.shape);});
    if(color)color.querySelectorAll('[data-wire-default-color]').forEach(function(b){
      const c=b.getAttribute('data-wire-default-color'); b.classList.toggle('selected',c===wireDefaults.color);
      const sw=b.querySelector('i:not(.pe-swatch)'); if(sw)sw.style.setProperty('--wire-color',c);
    });
  }
  function refresh(){
    paint();
    if(pending){pending.shape=wireDefaults.shape;pending.color=wireDefaults.color;renderWires();}
    try{localStorage.setItem('ad-trainer-wire-defaults',JSON.stringify(wireDefaults));}catch(e){}
  }
  if(shape)shape.addEventListener('click',function(e){
    const b=e.target.closest('[data-wire-default-shape]'); if(!b)return;
    wireDefaults.shape=b.getAttribute('data-wire-default-shape')||'smooth'; shape.classList.remove('open'); refresh();
  });
  if(color)color.addEventListener('click',function(e){
    const b=e.target.closest('[data-wire-default-color]'); if(!b)return;
    wireDefaults.color=b.getAttribute('data-wire-default-color')||'#1c1c1c'; color.classList.remove('open'); refresh();
  });
  [shape,color].forEach(function(menu){
    if(!menu)return;
    const trigger=menu.querySelector('.wire-default-trigger');
    if(trigger){trigger.setAttribute('aria-expanded','false');trigger.addEventListener('click',function(){const open=!menu.classList.contains('open');[shape,color].forEach(function(other){if(other)other.classList.remove('open');});menu.classList.toggle('open',open);trigger.setAttribute('aria-expanded',String(open));});}
    menu.addEventListener('mouseenter',function(){if(!document.body.classList.contains('touch-input'))menu.classList.add('open');});
    menu.addEventListener('mouseleave',function(){if(!document.body.classList.contains('touch-input'))menu.classList.remove('open');});
  });
  const tools=document.querySelector('.wire-defaults'),toggle=document.getElementById('wireToolsToggle');
  if(toggle&&tools)toggle.addEventListener('click',function(){const open=!tools.classList.contains('expanded');tools.classList.toggle('expanded',open);toggle.setAttribute('aria-expanded',String(open));});
  document.addEventListener('pointerdown',function(e){if(e.target.closest('.wire-defaults'))return;[shape,color].forEach(function(menu){if(menu){menu.classList.remove('open');const b=menu.querySelector('.wire-default-trigger');if(b)b.setAttribute('aria-expanded','false');}});});
  refresh();
}
function initTerminalGuides(){
  const button=document.getElementById('guideToggle');
  try{terminalGuidesEnabled=localStorage.getItem('ad-trainer-terminal-guides')==='1';}catch(e){}
  function paint(){
    if(!button)return;
    button.classList.toggle('on',terminalGuidesEnabled);
    button.setAttribute('aria-pressed',terminalGuidesEnabled?'true':'false');
  }
  if(button)button.addEventListener('click',function(){
    terminalGuidesEnabled=!terminalGuidesEnabled;
    try{localStorage.setItem('ad-trainer-terminal-guides',terminalGuidesEnabled?'1':'0');}catch(e){}
    paint();renderTerminalGuides();
  });
  paint();
}
/* ============================================================
   10. СТАРТ
   ============================================================ */
/* Перенос щита перемещает ввод, рейки и установленные на них аппараты. */
let panelDrag=null,panelDragFrame=0,panelDragPointer=null;
const panelLayer=document.getElementById('panelLayer');
function updatePanelDrag(){
  if(!panelDrag||!panelDragPointer)return;
  const panel=panelById(panelDrag.id);if(!panel)return;
  const p=svgPoint(panelDragPointer);panelDragPointer=null;
  panel.x=p.x-panelDrag.offX;panel.y=p.y-panelDrag.offY;
  renderPanels();renderRail();renderInbox();renderDevices();renderRelays();renderTerminalGuides();renderWires();renderTerminals();renderClamp();
}
function startPanelDrag(evt,panel){
  evt.preventDefault();evt.stopPropagation();cancelWire();
  const p=svgPoint(evt);panelDrag={id:panel.id,offX:p.x-panel.x,offY:p.y-panel.y,pointerId:evt.pointerId};
}
panelLayer.addEventListener('pointerdown',function(evt){
  if(evt.button!==0)return;
  const body=evt.target.closest('[data-panel-id]'),panel=body&&panelById(body.dataset.panelId);if(!panel)return;
  startPanelDrag(evt,panel);
});
document.addEventListener('pointermove',function(evt){
  if(!panelDrag||evt.pointerId!==panelDrag.pointerId)return;
  panelDragPointer={clientX:evt.clientX,clientY:evt.clientY};
  if(!panelDragFrame)panelDragFrame=requestAnimationFrame(function(){panelDragFrame=0;updatePanelDrag();});
});
function finishPanelDrag(evt){
  if(!panelDrag||evt.pointerId!==panelDrag.pointerId)return;
  if(panelDragFrame){cancelAnimationFrame(panelDragFrame);panelDragFrame=0;}
  if(evt.type!=='pointercancel'){panelDragPointer={clientX:evt.clientX,clientY:evt.clientY};updatePanelDrag();}
  panelDrag=null;panelDragPointer=null;
}
document.addEventListener('pointerup',finishPanelDrag);
document.addEventListener('pointercancel',finishPanelDrag);
panelLayer.addEventListener('contextmenu',function(evt){
  const body=evt.target.closest('[data-panel-id]');if(body)showObjectMenu(evt,{kind:'special',key:'panel',id:body.dataset.panelId});
});
/* Токовые клещи: ток ветви считается по нагрузкам и проводящим связям.
   Малое одинаковое сопротивление проводов позволяет делить ток в параллельных путях. */
let clampState=null;
const clampLayer=document.getElementById('clampLayer');
function createClamp(x,y){
  const n=nextSpecialNumber(state.clamps,'CL');
  const number=nextSpecialNumber(state.clamps.map(function(c){return {id:c.tag||''};}),'PA');
  const c={id:'CL'+n,tag:'PA'+number,x:x,y:y,wireId:null,fraction:.5,drag:false};
  state.clamps.push(c);return c;
}
function clampWireCurrents(){
  const map=potentialMap(),result={};
  if(map.conflict)return result;
  const nodes=[],indices={},edges=[],injections=[];
  function index(n){const k=nodeKey(n);if(indices[k]===undefined){indices[k]=nodes.length;nodes.push(n);injections.push({r:0,i:0});}return indices[k];}
  function edge(a,b,g,id){edges.push({a:index(a),b:index(b),g:g,id:id});}
  internalLinks().forEach(function(p){edge(p[0],p[1],1000,null);});
  state.wires.forEach(function(w){edge(w.a,w.b,100,w.id);});
  function inject(n,r,i){const j=index(n);injections[j].r+=r;injections[j].i+=i;}
  function load(d,a,b,power,available){
    if(!available)return;
    const na={devId:d.id,key:a},nb={devId:d.id,key:b};
    const va=map.pot[nodeKey(na)],vb=map.pot[nodeKey(nb)];
    if(!va||!vb)return;
    const r=va.r-vb.r,i=va.i-vb.i,u=Math.hypot(r,i);
    if(!voltageIsOperating(u,d,220))return;
    const resistance=Math.pow(ratedVoltageOf(d,220),2)/Math.max(.01,power);
    inject(na,r/resistance,i/resistance);inject(nb,-r/resistance,-i/resistance);
  }
  state.devices.forEach(function(d){
    if(d.type==='lamp')load(d,'t0','b0',Number(d.ratedPower)||1,!d.burned);
    if(d.type==='bulb')load(d,'L','N',Number(d.ratedPower)||100,!d.burned);
    if(TYPES[d.type].kind==='appliance')load(d,'L','N',Number(d.ratedPower)||TYPES[d.type].defaultPower,d.applianceOn&&!d.applianceBurned);
    if(d.type==='km1')load(d,'A1','A2',Number(d.ratedPower)||8,!d.coilBurned);
    if(d.type==='timer')load(d,'A1','A2',Number(d.ratedPower)||4,!d.timerBurned);
  });
  state.motors.forEach(function(m){
    if(motorIsDc(m)){
      const point=dcMotorOperatingPoint(m,map);
      if(point.armatureDc&&point.armaturePresent){inject({devId:m.id,key:'ya1'},point.armatureCurrent,0);inject({devId:m.id,key:'ya2'},-point.armatureCurrent,0);}
      if(point.fieldDc&&Math.abs(point.fieldVoltage)>1){const current=Math.sign(point.fieldVoltage)*point.fieldCurrent;inject({devId:m.id,key:'sh1'},current,0);inject({devId:m.id,key:'sh2'},-current,0);}
      return;
    }
    const direction=motorPhaseDirection(m),current=motorOperatingPoint(m,direction).current;
    if(!current)return;
    ['U1','V1','W1'].forEach(function(key){
      const n={devId:m.id,key:key},v=map.pot[nodeKey(n)];
      if(v){const u=Math.hypot(v.r,v.i);if(u)inject(n,current*v.r/u,current*v.i/u);}
    });
  });
  const count=nodes.length,adj=Array.from({length:count},function(){return [];});
  edges.forEach(function(e){adj[e.a].push(e.b);adj[e.b].push(e.a);});
  const pinned={},seen={};
  nodes.forEach(function(n,j){
    if(String(n.devId)==='IN')pinned[j]=true;
    const d=devById(n.devId);
    if(d&&d.type==='vfd'&&d.vfdOutputActive&&['U','V','W'].includes(n.key))pinned[j]=true;
    if(d&&d.type==='tp'&&d.tpOn&&d.tpInputReady&&['ya1','ya2','sh1','sh2'].includes(n.key))pinned[j]=true;
  });
  // Каждому изолированному компоненту нужна одна опорная точка.
  for(let start=0;start<count;start++){
    if(seen[start])continue;
    const queue=[start],component=[];seen[start]=true;
    while(queue.length){const j=queue.pop();component.push(j);adj[j].forEach(function(k){if(!seen[k]){seen[k]=true;queue.push(k);}});}
    if(!component.some(function(j){return pinned[j];}))pinned[start]=true;
  }
  const free=[],position={};nodes.forEach(function(n,j){if(!pinned[j]){position[j]=free.length;free.push(j);}});
  const size=free.length;
  const matrix=Array.from({length:size},function(_,j){const row=new Float64Array(size+2);row[size]=injections[free[j]].r;row[size+1]=injections[free[j]].i;return row;});
  edges.forEach(function(e){
    const a=position[e.a],b=position[e.b];
    if(a!==undefined){matrix[a][a]+=e.g;if(b!==undefined)matrix[a][b]-=e.g;}
    if(b!==undefined){matrix[b][b]+=e.g;if(a!==undefined)matrix[b][a]-=e.g;}
  });
  for(let col=0;col<size;col++){
    let pivot=col;for(let j=col+1;j<size;j++)if(Math.abs(matrix[j][col])>Math.abs(matrix[pivot][col]))pivot=j;
    if(Math.abs(matrix[pivot][col])<1e-10)continue;
    const temp=matrix[col];matrix[col]=matrix[pivot];matrix[pivot]=temp;
    for(let j=col+1;j<size;j++){
      const ratio=matrix[j][col]/matrix[col][col];if(!ratio)continue;
      for(let k=col;k<size+2;k++)matrix[j][k]-=ratio*matrix[col][k];
    }
  }
  const real=new Float64Array(count),imag=new Float64Array(count);
  for(let row=size-1;row>=0;row--){
    let r=matrix[row][size],i=matrix[row][size+1];
    for(let k=row+1;k<size;k++){r-=matrix[row][k]*real[free[k]];i-=matrix[row][k]*imag[free[k]];}
    if(Math.abs(matrix[row][row])>1e-10){real[free[row]]=r/matrix[row][row];imag[free[row]]=i/matrix[row][row];}
  }
  edges.forEach(function(e){if(e.id!==null)result[e.id]=e.g*Math.hypot(real[e.a]-real[e.b],imag[e.a]-imag[e.b]);});
  return result;
}
const clampPathCache=new WeakMap();
function clampNearestWire(point){
  let best=null;
  wireLayer.querySelectorAll('[data-wid] .wire-hit').forEach(function(path){
    let cached=clampPathCache.get(path);
    const d=path.getAttribute('d');
    if(!cached||cached.d!==d){
      const length=path.getTotalLength();if(!length)return;
      const count=Math.max(16,Math.min(2048,Math.ceil(length/8))),points=[];
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      for(let j=0;j<=count;j++){
        const p=path.getPointAtLength(length*j/count);points.push({x:p.x,y:p.y});
        minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
      }
      cached={d:d,length:length,points:points,step:length/count,minX:minX,minY:minY,maxX:maxX,maxY:maxY};
      clampPathCache.set(path,cached);
    }
    if(point.x<cached.minX-16||point.x>cached.maxX+16||point.y<cached.minY-16||point.y>cached.maxY+16)return;
    let distance=Infinity,at=0;
    for(let j=1;j<cached.points.length;j++){
      const a=cached.points[j-1],b=cached.points[j],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
      const t=den?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/den)):0;
      const gap=Math.hypot(a.x+t*dx-point.x,a.y+t*dy-point.y);
      if(gap<distance){distance=gap;at=cached.step*(j-1+t);}
    }
    if(distance<16&&(!best||distance<best.distance))best={path:path,cached:cached,at:at,distance:distance};
  });
  if(!best)return null;
  const path=best.path,length=best.cached.length;
  let at=best.at,p=path.getPointAtLength(at),distance=Math.hypot(p.x-point.x,p.y-point.y),step=best.cached.step/2;
  for(let j=0;j<6;j++){
    for(const t of [Math.max(0,at-step),Math.min(length,at+step)]){
      const q=path.getPointAtLength(t),gap=Math.hypot(q.x-point.x,q.y-point.y);
      if(gap<distance){distance=gap;at=t;p=q;}
    }
    step/=2;
  }
  return distance<14?{id:Number(path.parentNode.dataset.wid),fraction:at/length,x:p.x,y:p.y,distance:distance,path:path}:null;
}
let clampDragFrame=0,clampDragPointer=null;
function updateClampDrag(){
  if(!clampState||!clampState.drag)return;
  if(clampDragPointer){
    const p=svgPoint(clampDragPointer);clampDragPointer=null;
    if(isFinite(p.x)&&isFinite(p.y)){clampState.x=p.x-clampState.offX;clampState.y=p.y-clampState.offY;}
  }
  const body=clampLayer.querySelector('[data-clamp-id="'+clampState.id+'"]');
  if(body)body.setAttribute('transform','translate('+clampState.x+','+clampState.y+')');
  const candidate=clampNearestWire(clampState),highlight=clampLayer.querySelector('[data-clamp-highlight]');
  if(highlight){highlight.setAttribute('d',candidate?candidate.path.getAttribute('d'):'');highlight.style.display=candidate?'':'none';}
}
function clampCurrentText(current){
  const amps=Math.max(0,Number(current)||0);
  if(amps<.000001)return '0.00 A';
  if(amps<.1)return (amps*1000).toFixed(1)+' mA';
  return amps.toFixed(2)+' A';
}
function clampJawSvg(open,angle,frontOnly){
  const upper='M 24 -13 C 20 -26, -6 -29, -20 -17 C -25 -12, -27 -6, -27 0';
  const lower='M 24 13 C 20 26, -6 29, -20 17 C -25 12, -27 6, -27 0';
  function jaw(path,rotation,pivotY){
    return '<g transform="rotate('+rotation+' 24 '+pivotY+')">'
      +'<path d="'+path+'" fill="none" stroke="#92430e" stroke-width="11" stroke-linecap="round"/>'
      +'<path d="'+path+'" fill="none" stroke="#f58220" stroke-width="8" stroke-linecap="round"/>'
      +'</g>';
  }
  return '<g transform="rotate('+angle+')">'
    +(frontOnly?'':jaw(upper,open?22:0,-13))
    +jaw(lower,open?-22:0,13)+'</g>';
}
function clampObjectSvg(clampState,currents){
  let wirePath=null,ringAngle=0;
  if(clampState.wireId!==null){
    const path=wireLayer.querySelector('[data-wid="'+clampState.wireId+'"] .wire-hit');
    if(path){
      const length=path.getTotalLength(),at=length*clampState.fraction;
      const p=path.getPointAtLength(at),before=path.getPointAtLength(Math.max(0,at-1)),after=path.getPointAtLength(Math.min(length,at+1));
      clampState.x=p.x;clampState.y=p.y;wirePath=path;
      ringAngle=8*Math.sin(2*Math.atan2(after.y-before.y,after.x-before.x));
    }
    else clampState.wireId=null;
  }
  const attached=clampState.wireId!==null;
  const text=attached?clampCurrentText(currents[clampState.wireId]):'— A';
  let ring='';
  if(attached&&wirePath){
    // Задняя половина кольца находится за проводом, передняя — перед ним.
    // Ориентация кольца следует касательной даже на дугах провода.
    const wire=state.wires.find(function(w){return w.id===clampState.wireId;});
    const a=wire&&terminal(wire.a.devId,wire.a.key);
    const color=wire&&(wire.color||(a&&a.color))||'#1c1c1c';
    // Окно включает всю толщину губок с запасом: граница не режет провод
    // в месте пересечения с внешним краем задней губки.
    const clipId='clamp-wire-window-'+clampState.id;
    ring='<defs><clipPath id="'+clipId+'" clipPathUnits="userSpaceOnUse"><rect x="-44" y="-44" width="88" height="88" transform="rotate('+ringAngle+')"/></clipPath></defs>'
      +clampJawSvg(false,ringAngle,false)
      +'<g clip-path="url(#'+clipId+')" pointer-events="none"><g transform="translate('+(-clampState.x)+','+(-clampState.y)+')">'
      +wireStrokeGeom(wirePath.getAttribute('d'),color,null,false)+'</g></g>'
      +clampJawSvg(false,ringAngle,true);
  }else{
    ring=clampJawSvg(clampState.drag,0,false);
  }
  return '<g data-clamp-id="'+clampState.id+'" transform="translate('+clampState.x+','+clampState.y+')" style="cursor:grab;touch-action:none">'
    +ring
    +'<path d="M 20 -17 Q 29 -24 39 -19 V 19 Q 29 24 20 17 Z" fill="#24282c" stroke="#555b62" stroke-width="1.5"/>'
    +'<rect x="33" y="-27" width="98" height="54" rx="8" fill="#202428" stroke="#626971" stroke-width="1.5"/>'
    +'<rect x="38" y="-22" width="88" height="44" rx="5" fill="#30363b" stroke="#41484f"/>'
    +'<text x="82" y="-17" text-anchor="middle" font-family="Segoe UI,Arial" font-size="5" fill="#ced4d9">'+escapeHtml(clampState.tag||'PA')+'</text>'
    +'<rect x="42" y="-15" width="80" height="28" rx="3" fill="#b9c8b5" stroke="#101518" stroke-width="2"/>'
    +'<text x="82" y="4" text-anchor="middle" font-family="Consolas,monospace" font-size="15" fill="#26332c">'+text+'</text>'
    +'<text x="82" y="22" text-anchor="middle" font-family="Segoe UI,Arial" font-size="6" fill="#ced4d9">'+(attached?'ТОК · RMS':(clampState.drag?'КЛЕЩИ ОТКРЫТЫ':'АМПЕРМЕТР'))+'</text>'
    +'<rect x="28" y="14" width="10" height="9" rx="2" fill="#f58220" stroke="#92430e"/>'
    +'<circle r="32" fill="transparent" pointer-events="all"/>'
    +'</g>';
}
function renderClamp(force){
  if(!clampLayer)return;
  if(clampState&&clampState.drag&&!force){updateClampDrag();return;}
  const currents=state.clamps.some(function(c){return c.wireId!==null;})?clampWireCurrents():{};
  const highlight='<path data-clamp-highlight="1" d="" style="display:none" fill="none" stroke="#f6ce64" stroke-width="11" stroke-opacity=".28" stroke-linecap="round" pointer-events="none"/>';
  clampLayer.innerHTML=highlight+state.clamps.map(function(c){return clampObjectSvg(c,currents);}).join('');
  if(clampState&&clampState.drag)updateClampDrag();
}
clampLayer.addEventListener('pointerdown',function(evt){
  if(evt.button!==0)return;
  const body=evt.target.closest('[data-clamp-id]');if(!body)return;
  clampState=state.clamps.find(function(c){return c.id===body.dataset.clampId;});if(!clampState)return;
  evt.preventDefault();evt.stopPropagation();cancelWire();
  const p=svgPoint(evt);clampState.offX=p.x-clampState.x;clampState.offY=p.y-clampState.y;
  clampState.wireId=null;clampState.drag=true;
  renderClamp(true);
});
document.addEventListener('pointermove',function(evt){
  if(!clampState||!clampState.drag)return;
  clampDragPointer={clientX:evt.clientX,clientY:evt.clientY};
  if(!clampDragFrame)clampDragFrame=requestAnimationFrame(function(){clampDragFrame=0;updateClampDrag();});
},true);
document.addEventListener('pointerup',function(evt){
  if(!clampState||!clampState.drag)return;
  if(clampDragFrame){cancelAnimationFrame(clampDragFrame);clampDragFrame=0;}
  clampDragPointer={clientX:evt.clientX,clientY:evt.clientY};updateClampDrag();
  clampState.drag=false;
  const hit=clampNearestWire(clampState);
  if(hit){clampState.wireId=hit.id;clampState.fraction=hit.fraction;clampState.x=hit.x;clampState.y=hit.y;}
  renderClamp();
},true);
clampLayer.addEventListener('contextmenu',function(evt){
  const body=evt.target.closest('[data-clamp-id]');if(body)showObjectMenu(evt,{kind:'special',key:'clamp',id:body.dataset.clampId});
});
document.addEventListener('pointercancel',function(){
  if(!clampState||!clampState.drag)return;
  if(clampDragFrame){cancelAnimationFrame(clampDragFrame);clampDragFrame=0;}
  clampDragPointer=null;clampState.drag=false;renderClamp();
},true);
setInterval(function(){if(state.clamps.length&&(!clampState||!clampState.drag))renderClamp();},500);
initWireDefaults();
initTerminalGuides();
renderRail();
initialState();
resetView();
renderAll();
renderPresetList();
initPresetFolder();
initLogPanel();
log('Тренажёр запущен: на сцене монтажный щит с двумя DIN-рейками и встроенным вводом XT1 — 3×380 В, N и PE.', 'info');

})();
