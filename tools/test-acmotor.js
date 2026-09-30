/* Регрессия асинхронного привода. Запуск: node tools/test-acmotor.js
   Проверяет, что переход к постоянному току не изменил поведение трёхфазной
   части стенда: граф потенциалов, порядок фаз, направление вращения, звезду,
   тепловое реле и режим V~ мультиметра. */
const { load } = require('./sandbox');

const env = load();
const t = env.api, check = env.check, near = env.near;
const s = t.state;

s.power = true;
s.special = { inbox:true, pushbutton:false, motor:false, multimeter:true };
s.devices = [
  { id:1, type:'klemma', rail:0, slot:8, on:false, tripped:false, coil:false, tag:'XN' },
  { id:2, type:'mcb3',   rail:0, slot:2, on:true,  tripped:false, coil:false, tag:'QF1' },
  { id:3, type:'mcb1',   rail:0, slot:6, on:true,  tripped:false, coil:false, tag:'QF2' },
  { id:4, type:'km1',    rail:1, slot:2, on:false, tripped:false, coil:true,  tag:'KM1' }
];
s.relays = [];
s.motors = [{ id:'M1', tag:'M1', kind:'ac', x:463, y:875, w:313, h:351, scale:1.5,
  load:0, rpmActual:0, angle:0, polePairs:2, ratedSlipPercent:10,
  ratedFrequency:50, ratedVoltage:380, ratedCurrent:9, ratedPower:4 }];
s.wires = [];
let id = 1;
function wire(aDev,aKey,bDev,bKey){ s.wires.push({ id:id++, a:{devId:aDev,key:aKey}, b:{devId:bDev,key:bKey} }); }
const motor = s.motors[0];

wire('IN','L1',2,'t0'); wire('IN','L2',2,'t1'); wire('IN','L3',2,'t2');
wire(2,'b0',4,'t0');    wire(2,'b1',4,'t1');    wire(2,'b2',4,'t2');
wire(4,'b0','M1','U1'); wire(4,'b1','M1','V1'); wire(4,'b2','M1','W1');
wire('IN','L3',3,'t0'); wire(3,'b0',4,'A1');
wire('IN','N',1,'k0');  wire(1,'k3',4,'A2');

console.log('— трёхфазная цепь —');
const map = t.potentialMap();
check('нет конфликта потенциалов', map.conflict === false, JSON.stringify(map.conflicts));
near('линейное напряжение между L1 и L2', Math.hypot(map.pot['IN/L1'].r-map.pot['IN/L2'].r, map.pot['IN/L1'].i-map.pot['IN/L2'].i), 380, 1);
near('фазное напряжение L1 — N', Math.hypot(map.pot['IN/L1'].r, map.pot['IN/L1'].i), 380/Math.sqrt(3), 1);
check('частота фаз осталась 50 Гц', map.pot['IN/L1'].frequencyHz === 50, map.pot['IN/L1'].frequencyHz);
check('фазы не помечены постоянным током', map.pot['IN/L1'].dc === undefined);
near('напряжение на катушке пускателя', t.coilVoltage(s.devices[3]), 220, 5);

console.log('— направление вращения —');
const direct = t.motorPhaseDirection(motor);
check('прямой порядок фаз даёт прямое вращение', direct === 1, direct);
const supply = t.motorSupplyFrequency(motor, map);
check('частота питания двигателя определена', supply > 0, supply);
const operating = t.motorOperatingPoint(motor, 1);
near('синхронная скорость при 50 Гц и 2 парах полюсов', operating.synchronousRpm, 1500, 1);
check('номинальная скорость ниже синхронной', operating.rpm < operating.synchronousRpm, operating.rpm);
check('ток двигателя положителен', operating.current > 0, operating.current);

// Переставляем две фазы на зажимах двигателя — обратное вращение.
s.wires = s.wires.filter(function(w){
  return !(String(w.b.devId)==='M1' || String(w.a.devId)==='M1');
});
wire(4,'b0','M1','V1'); wire(4,'b1','M1','U1'); wire(4,'b2','M1','W1');
check('перестановка двух фаз даёт обратное вращение', t.motorPhaseDirection(motor) === -1, t.motorPhaseDirection(motor));

console.log('— звезда и зажимы —');
const links = t.internalLinks();
check('перемычка W2–U2 на месте', links.some(function(p){
  return String(p[0].devId)==='M1' && p[0].key==='W2' && p[1].key==='U2'; }));
check('перемычка U2–V2 на месте', links.some(function(p){
  return String(p[0].devId)==='M1' && p[0].key==='U2' && p[1].key==='V2'; }));
check('у асинхронного двигателя есть зажим U1', !!t.terminal('M1','U1'));
check('зажима U1 у машины постоянного тока нет', t.terminal('MD1','U1') === null);
check('сопротивление обмотки доступно для измерения',
  isFinite(t.resistanceBetween({devId:'M1',key:'U1'},{devId:'M1',key:'V1'})));

console.log('— мультиметр в режиме V~ —');
s.mm = { mode:false, fn:'voltage', a:{devId:'IN',key:'L1'}, b:{devId:'IN',key:'N'} };
const phaseMeasure = t.measureNow();
check('фазное напряжение измеряется как AC', phaseMeasure && phaseMeasure.cap === 'Напряжение AC', phaseMeasure && phaseMeasure.cap);
check('показание 220 В', phaseMeasure && phaseMeasure.display === '220 В', phaseMeasure && phaseMeasure.display);
check('подсказка про фазное напряжение', phaseMeasure && phaseMeasure.note.indexOf('Фазное') >= 0, phaseMeasure && phaseMeasure.note);
s.mm = { mode:false, fn:'dcvoltage', a:{devId:'IN',key:'L1'}, b:{devId:'IN',key:'N'} };
const dcOnAc = t.measureNow();
check('режим V⎓ на переменном напряжении предупреждает', dcOnAc && dcOnAc.note.indexOf('V~') >= 0, dcOnAc && dcOnAc.note);

console.log('— фазоры и выборки —');
const snap = t.acSnapshot(0);
near('линейное напряжение снимка', snap.lineVoltageRms, 380, 0.01);
check('частота снимка 50 Гц', snap.frequencyHz === 50);
const dcSample = t.acSample({ r:110, i:0, frequencyHz:0, dc:true }, 0.25);
near('выборка постоянного напряжения не зависит от времени', dcSample.instantaneous, 110, 0.001);
check('у постоянного напряжения нет периода', dcSample.periodSeconds === Infinity, dcSample.periodSeconds);
const peakSample = t.acSample({ r:220, i:0, frequencyHz:50 }, 0);
near('выборка переменного напряжения в момент t=0 равна амплитуде', peakSample.instantaneous, 220*Math.SQRT2, 0.01);
near('действующее значение переменного напряжения', peakSample.rms, 220, 0.001);
near('через четверть периода выборка проходит через ноль', t.acSample({ r:220, i:0, frequencyHz:50 }, 1/200).instantaneous, 0, 0.5);
check('период переменного напряжения 20 мс', Math.abs(peakSample.periodSeconds - 0.02) < 1e-9, peakSample.periodSeconds);
const dcDiff = t.phasorDifference({ r:220, i:0, frequencyHz:0, dc:true }, { r:0, i:0, frequencyHz:0, dc:true });
check('разность двух постоянных напряжений остаётся постоянной', dcDiff.frequencyHz === 0 && dcDiff.dc === true, JSON.stringify(dcDiff));
const acDiff = t.phasorDifference({ r:220, i:0, frequencyHz:50 }, { r:0, i:0, frequencyHz:0 });
check('разность переменного и нуля остаётся переменной', acDiff.frequencyHz === 50, JSON.stringify(acDiff));

console.log('— окраска машин —');
const acSvg = t.motorInner(0, { load:0, rpm:0, current:0, visualDur:1 }, motor);
check('асинхронный двигатель остался синим',
  acSvg.indexOf('#2a6fbf') >= 0 && acSvg.indexOf('#1f5fa8') >= 0);
check('асинхронный двигатель не перекрашен в зелёный',
  ['#2f8a4c','#25703c','#2a7f45','#2f7f47'].every(function(c){ return acSvg.indexOf(c) < 0; }));
check('машины различаются цветом корпуса',
  acSvg.indexOf('#2a6fbf') >= 0 && t.dcMotorInner(0, null, {angle:0}).indexOf('#2a6fbf') < 0);

console.log('— перерисовка —');
let result = 'ok';
try{ t.renderAll(); }catch(e){ result = String(e && e.message); }
check('полная перерисовка без ошибок', result === 'ok', result);

console.log('');
console.log(env.fails() ? ('ПРОВАЛЕНО проверок: ' + env.fails()) : 'все проверки пройдены');
process.exit(env.fails() ? 1 : 0);
