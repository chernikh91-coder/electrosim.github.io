/* Тест машины постоянного тока и тиристорного преобразователя.
   Запуск: node tools/test-dcmotor.js
   Собирает в песочнице схему «ввод XT1 → тиристорный преобразователь → ДПТ НВ»
   и проверяет электрическую модель, физику машины, реверс, защиту трёхфазной
   логики от машины постоянного тока и режим V⎓ мультиметра. */
const { load } = require('./sandbox');

const env = load();
const t = env.api, check = env.check, near = env.near;
const s = t.state;
void env.store;

/* ---------- сборка схемы ---------- */
s.power = true;
s.special = { inbox:true, pushbutton:false, motor:false, multimeter:true };
s.devices = [{ id:1, type:'tp', rail:0, slot:0, on:false, tripped:false, coil:false,
  tag:'UZT1', ratedVoltage:380, tpOn:false, setArmatureVoltage:220,
  maxArmatureVoltage:220, fieldVoltage:220 }];
s.relays = [];
s.motors = [ t.newDcMotor('MD1', 500, 900) ];
s.wires = [];
let wireId = 1;
function wire(aDev, aKey, bDev, bKey){
  s.wires.push({ id:wireId++, a:{ devId:aDev, key:aKey }, b:{ devId:bDev, key:bKey } });
}
function dropWires(devId, keys){
  s.wires = s.wires.filter(function(w){
    return !((String(w.a.devId)===String(devId) && keys.indexOf(w.a.key)>=0) ||
             (String(w.b.devId)===String(devId) && keys.indexOf(w.b.key)>=0));
  });
}
const tp = s.devices[0], motor = s.motors[0];

console.log('— зажимы и обозначения —');
check('у преобразователя 8 зажимов', t.termDefs('tp', tp).length === 8, t.termDefs('tp', tp).length);
check('высота преобразователя равна высоте автоматов',
  t.TYPES.tp.h === t.TYPES.mcb3.h && t.TYPES.tp.h === t.TYPES.mcb1.h,
  'ТП ' + t.TYPES.tp.h + ', QF1 ' + t.TYPES.mcb3.h + ', QF2 ' + t.TYPES.mcb1.h);
check('высота преобразователя 82 мм', Math.abs(t.TYPES.tp.h - 82*3) < 1e-9, t.TYPES.tp.h);
check('зажимы преобразователя остались внутри корпуса',
  t.termDefs('tp', tp).every(function(x){ return x.dy > 0 && x.dy < t.TYPES.tp.h; }),
  JSON.stringify(t.termDefs('tp', tp).map(function(x){ return x.dy; })));
check('органы управления не выходят за корпус', t.deviceInner('tp', tp).indexOf('cy="162"') >= 0);
check('в лотке появился тиристорный преобразователь', !!t.TYPES.tp && !!t.STOCK.tp);
check('позиционное обозначение преобразователя', t.tagOf(1) === 'UZT1', t.tagOf(1));
check('обозначение машины постоянного тока', t.tagOf('MD1') === 'MD1', t.tagOf('MD1'));
check('зажим якоря существует', !!t.terminal('MD1','ya1'));
check('у машины 5 зажимов', t.DC_MOTOR_TERMS.length === 5);
check('отрисовка преобразователя не пустая', t.deviceInner('tp', tp).indexOf('ТП') >= 0);
check('отрисовка машины содержит пометку ДПТ', t.dcMotorInner(0, null, {angle:0}).indexOf('ДПТ') >= 0);

console.log('— окраска машины —');
const dcSvg = t.dcMotorInner(0, null, {angle:0});
check('корпус машины выкрашен в зелёный',
  dcSvg.indexOf(t.DC_GREEN.bodyMid) >= 0 && dcSvg.indexOf(t.DC_GREEN.bodyOuter) >= 0, t.DC_GREEN.bodyMid);
check('клеммная коробка тоже зелёная', dcSvg.indexOf(t.DC_GREEN.box) >= 0);
check('в машине не осталось синего цвета корпуса',
  ['#2266a8','#1f5fa8','#2a6fbf','#2868ad','#1b5490','#184d83','#174c83','#123c66','#69a6e0','#b7d2eb'].every(function(c){
    return dcSvg.indexOf(c) < 0;
  }), 'найден синий цвет');
check('металл вала, коллектор и щётки не перекрашены',
  dcSvg.indexOf('#c4cbd1') >= 0 && dcSvg.indexOf('#b8794a') >= 0 && dcSvg.indexOf('#2b3138') >= 0);
check('цвет PE остался жёлто-зелёным', dcSvg.indexOf('#e8d800') >= 0);
check('подписи зажимов читаются на зелёном фоне', dcSvg.indexOf(t.DC_GREEN.termLabel) >= 0);

console.log('— преобразователь питает цепь постоянного тока —');
wire('IN','L1',1,'R'); wire('IN','L2',1,'S'); wire('IN','L3',1,'T');
wire(1,'ya1','MD1','ya1'); wire(1,'ya2','MD1','ya2');
wire(1,'sh1','MD1','sh1'); wire(1,'sh2','MD1','sh2');
wire(1,'ya2','IN','N');                       // минус якоря на нулевой проводник — допустимо

const mapIdle = t.potentialMap();
check('трёхфазный вход преобразователя распознан', t.tpInputState(tp, mapIdle.pot).ready === true);
check('нет конфликта потенциалов', mapIdle.conflict === false, JSON.stringify(mapIdle.conflicts));
near('напряжение возбуждения 220 В', mapIdle.pot['MD1/sh1'].r, 220, 0.01);
check('возбуждение помечено как постоянное', mapIdle.pot['MD1/sh1'].dc === true);
check('частота постоянного напряжения равна нулю', mapIdle.pot['MD1/sh1'].frequencyHz === 0,
  mapIdle.pot['MD1/sh1'].frequencyHz);
near('якорь обесточен, пока выход выключен', mapIdle.pot['MD1/ya1'].r, 0, 0.01);

console.log('— включение выхода якоря —');
tp.tpOn = true;
const mapOn = t.potentialMap();
near('напряжение на якоре 220 В', t.dcTerminalVoltage(motor,'ya1','ya2',mapOn.pot).volts, 220, 0.01);
check('якорь постоянного тока не считается переменным', mapOn.pot['MD1/ya1'].dc === true);
check('соединение минуса якоря с нулём не даёт КЗ', mapOn.conflict === false, JSON.stringify(mapOn.conflicts));

console.log('— паспортные величины машины —');
const data = t.dcMotorData(motor);
near('ЭДС при номинальном режиме', data.emfNom, 220 - 5*1.6, 0.01);
near('постоянная машины', data.cPhi, data.emfNom/(1500*Math.PI/30), 0.0001);
near('номинальный момент', data.torqueNom, data.cPhi*5, 0.001);

console.log('— пуск и холостой ход —');
const start = t.dcMotorOperatingPoint(motor);
near('пусковой ток при неподвижном якоре', start.armatureCurrent, 220/1.6, 0.5);
check('ЭДС неподвижного якоря равна нулю', Math.abs(start.emf) < 1e-9, start.emf);
motor.load = 0;
for (let i=0;i<200;i++) t.dcMotorInertiaStep(motor, 0.05);       // 10 с
const idle = t.dcMotorOperatingPoint(motor);
near('скорость холостого хода', idle.rpm, 220/data.cPhi*30/Math.PI, 5);
near('ток холостого хода близок к нулю', idle.armatureCurrent, 0, 0.5);

console.log('— нагрузка на валу —');
motor.load = 100;
for (let i=0;i<400;i++) t.dcMotorInertiaStep(motor, 0.05);       // 20 с
const rated = t.dcMotorOperatingPoint(motor);
near('номинальная скорость под полной нагрузкой', rated.rpm, 1500, 25);
near('номинальный ток якоря под полной нагрузкой', rated.armatureCurrent, 5, 0.3);
near('номинальный момент на валу', rated.torque, data.torqueNom, 0.5);

console.log('— снижение уставки напряжения —');
near('исходная уставка 220 В', t.tpSetArmatureVoltage(tp), 220, 0.01);
t.setTpArmatureVoltage(tp, 0);
t.changeTpArmatureVoltage(tp, 110);
near('уставка выставлена на 110 В', t.tpSetArmatureVoltage(tp), 110, 0.01);
for (let i=0;i<400;i++) t.dcMotorInertiaStep(motor, 0.05);
const half = t.dcMotorOperatingPoint(motor);
check('скорость упала примерно вдвое', half.rpm > 600 && half.rpm < 900, half.rpm);
near('ток под нагрузкой не изменился', half.armatureCurrent, 5, 0.3);
t.changeTpArmatureVoltage(tp, 400);
near('уставка не превышает максимум преобразователя', t.tpSetArmatureVoltage(tp), 220, 0.01);
check('изменение уставки возвращает признак изменения', t.changeTpArmatureVoltage(tp, -10) === true);
t.changeTpArmatureVoltage(tp, -1000);
near('уставка не уходит ниже нуля', t.tpSetArmatureVoltage(tp), 0, 0.01);
t.setTpArmatureVoltage(tp, 220);

console.log('— реверс перестановкой проводов якоря —');
motor.load = 0;
for (let i=0;i<200;i++) t.dcMotorInertiaStep(motor, 0.05);
dropWires(1, ['ya1','ya2']);
dropWires('MD1', ['ya1','ya2']);
wire(1,'ya1','MD1','ya2'); wire(1,'ya2','MD1','ya1');
const mapRev = t.potentialMap();
near('напряжение якоря сменило знак', t.dcTerminalVoltage(motor,'ya1','ya2',mapRev.pot).volts, -220, 0.01);
for (let i=0;i<600;i++) t.dcMotorInertiaStep(motor, 0.05);       // 30 с
check('машина вращается в обратную сторону', motor.rpmActual < -1400, motor.rpmActual);
near('обратная скорость по модулю та же', Math.abs(motor.rpmActual), 220/data.cPhi*30/Math.PI, 5);

console.log('— обмотка возбуждения —');
dropWires('MD1', ['sh1']);
const mapNoField = t.potentialMap();
check('без провода возбуждения поток равен нулю',
  Math.abs(t.dcMotorOperatingPoint(motor, mapNoField.pot).flux) < 1e-9);
check('без возбуждения машина не развивает момент',
  Math.abs(t.dcMotorOperatingPoint(motor, mapNoField.pot).torque) < 1e-9);
wire(1,'sh1','MD1','sh1');

console.log('— трёхфазная логика не путает машину постоянного тока —');
check('направление по порядку фаз не определяется', t.motorPhaseDirection(motor) === 0);
check('машина опознана как машина постоянного тока', t.motorIsDc(motor) === true);
check('асинхронный двигатель не считается машиной постоянного тока', t.motorIsDc({kind:'ac'}) === false);
check('три обмотки звезды к машине постоянного тока не применяются',
  t.internalLinks().every(function(p){
    return !(String(p[0].devId)==='MD1' && p[0].key==='W2');
  }));
const rArm = t.resistanceBetween({devId:'MD1',key:'ya1'},{devId:'MD1',key:'ya2'});
check('сопротивление якоря измеряется', isFinite(rArm) && rArm >= 1.6 && rArm < 2.5, rArm);
const rField = t.resistanceBetween({devId:'MD1',key:'sh1'},{devId:'MD1',key:'sh2'});
check('сопротивление возбуждения измеряется', isFinite(rField) && rField >= 220, rField);

console.log('— режим V⎓ мультиметра —');
s.mm = { mode:false, fn:'dcvoltage', a:{devId:'MD1',key:'ya1'}, b:{devId:'MD1',key:'ya2'} };
const dcMeasure = t.measureNow();
check('измерение постоянного напряжения', dcMeasure && dcMeasure.cap === 'Напряжение DC', dcMeasure && dcMeasure.cap);
check('показание со знаком полярности', dcMeasure && dcMeasure.display === '−220 В' || dcMeasure.display === '-220 В', dcMeasure && dcMeasure.display);
s.mm.fn = 'voltage';
const acMeasure = t.measureNow();
check('режим V~ подсказывает перейти на V⎓', acMeasure && acMeasure.note.indexOf('V⎓') >= 0, acMeasure && acMeasure.note);

console.log('— ошибка монтажа: плюс якоря на PE —');
wire(1,'ya1','IN','PE');
const mapFault = t.potentialMap();
check('заземление плюса якоря распознано как КЗ', mapFault.conflict === true);

console.log('— пресет и отрисовка —');
const snap = t.schemeSnapshot('ДПТ');
check('версия пресета поднята', snap.version === 3, snap.version);
check('машина постоянного тока попала в снимок', snap.state.motors[0].kind === 'dc');
check('уставка преобразователя сохранена', snap.state.devices[0].setArmatureVoltage !== undefined);
check('состояние кнопок преобразователя не сохраняется',
  snap.state.devices[0].tpPressed === undefined && snap.state.devices[0].tpInputReady === undefined);
let rendered = '';
try{ t.renderAll(); rendered = 'ok'; }catch(e){ rendered = String(e && e.message); }
check('полная перерисовка схемы без ошибок', rendered === 'ok', rendered);

console.log('— цикл «сохранил → загрузил» —');
env.store[t.PRESET_KEY] = JSON.stringify([snap]);
env.els.presetList.value = snap.id;
s.devices = []; s.motors = []; s.wires = [];
let loadError = '';
try{ t.loadSelectedPreset(); }catch(e){ loadError = String(e && e.message); }
check('загрузка пресета без ошибок', loadError === '', loadError);
check('преобразователь восстановлен', s.devices.length === 1 && s.devices[0].type === 'tp', s.devices.length);
check('уставка якоря восстановлена', s.devices[0] && s.devices[0].setArmatureVoltage === 220,
  s.devices[0] && s.devices[0].setArmatureVoltage);
check('машина постоянного тока восстановлена', s.motors.length === 1 && s.motors[0].kind === 'dc', s.motors.length);
check('номиналы машины восстановлены', s.motors[0] && s.motors[0].armatureResistance === 1.6,
  s.motors[0] && s.motors[0].armatureResistance);
check('машина начинает с нулевых оборотов', s.motors[0] && s.motors[0].rpmActual === 0);
check('провода восстановлены', s.wires.length > 0, s.wires.length);
const afterLoad = t.potentialMap();
near('после загрузки на якоре снова 220 В', t.dcTerminalVoltage(s.motors[0],'ya1','ya2',afterLoad.pot).volts, -220, 220);

console.log('');
console.log(env.fails() ? ('ПРОВАЛЕНО проверок: ' + env.fails()) : 'все проверки пройдены');
process.exit(env.fails() ? 1 : 0);
