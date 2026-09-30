/* Токовая защита однофазных и трёхфазных автоматов. */
const {load}=require('./sandbox');
const env=load(),t=env.api,s=t.state,check=env.check,near=env.near;

s.power=true;s.special.inbox=true;s.relays=[];s.mm={mode:false,fn:'voltage',a:null,b:null};
let wireId=1;
function wire(aDev,aKey,bDev,bKey){s.wires.push({id:wireId++,a:{devId:aDev,key:aKey},b:{devId:bDev,key:bKey}});}

console.log('— трёхфазный автомат C2 и двигатель 9 А —');
s.devices=[
  {id:2,type:'mcb3',on:true,tripped:false,breakerType:'C2',ratedCurrent:2,tag:'QF1'},
  {id:4,type:'km1',on:false,tripped:false,coil:true,tag:'KM1'}
];
s.motors=[{id:'M1',tag:'M1',kind:'ac',load:0,polePairs:2,ratedSlipPercent:10,
  ratedFrequency:50,ratedVoltage:380,ratedCurrent:9,ratedPower:4}];
s.wires=[];
wire('IN','L1',2,'t0');wire('IN','L2',2,'t1');wire('IN','L3',2,'t2');
wire(2,'b0',4,'t0');wire(2,'b1',4,'t1');wire(2,'b2',4,'t2');
wire(4,'b0','M1','U1');wire(4,'b1','M1','V1');wire(4,'b2','M1','W1');
let currents=t.clampWireCurrents(),phases=t.breakerPoleCurrents(s.devices[0],currents);
phases.forEach(function(value,index){near('ток фазы L'+(index+1),value,9,.05);});
check('за первую четверть секунды тепловой расцепитель ещё выдерживает',!t.breakerProtectionStep(.25,currents).tripped);
check('C2 отключает двигатель 9 А примерно за 0,5 с',!!t.breakerProtectionStep(.25,currents).tripped&&s.devices[0].tripped&&!s.devices[0].on);

console.log('\n— номинал выше рабочего тока —');
s.devices[0].on=true;s.devices[0].tripped=false;s.devices[0].breakerType='C16';s.devices[0].ratedCurrent=16;s.devices[0].breakerHeat=0;
for(let i=0;i<120;i++)t.breakerProtectionStep(.5,currents);
check('C16 не отключается при токе 9 А',s.devices[0].on&&!s.devices[0].tripped&&s.devices[0].breakerHeat===0);

console.log('\n— однофазный автомат C2 и стиральная машина —');
s.devices=[
  {id:1,type:'mcb1',on:true,tripped:false,breakerType:'C2',ratedCurrent:2,tag:'QF2'},
  {id:5,type:'washer',applianceOn:true,applianceBurned:false,ratedVoltage:220,ratedPower:2200,ratedCurrent:10,tag:'X1'}
];
s.motors=[];s.wires=[];
wire('IN','L1',1,'t0');wire(1,'b0',5,'L');wire('IN','N',5,'N');
currents=t.clampWireCurrents();
near('однофазный автомат видит ток нагрузки',t.breakerPoleCurrents(s.devices[0],currents)[0],10,.1);
let trip=null;for(let i=0;i<4&&!trip;i++)trip=t.breakerProtectionStep(.25,currents).tripped;
check('однофазный C2 отключается от нагрузки около 10 А',!!trip&&s.devices[0].tripped&&!s.devices[0].on);

console.log('\n— выдержка времени при небольшой перегрузке —');
s.devices=[{id:7,type:'mcb1',on:true,tripped:false,breakerType:'C10',ratedCurrent:10,tag:'QF3'}];
s.wires=[];wire('IN','L1',7,'t0');wire(7,'b0','LOAD','L');
const artificial={};s.wires.forEach(function(w){artificial[w.id]=11;});
check('11 А через C10 не вызывает мгновенного отключения',!t.breakerProtectionStep(.5,artificial).tripped&&s.devices[0].on);
for(let i=0;i<90&&!s.devices[0].tripped;i++)t.breakerProtectionStep(.5,artificial);
check('длительная перегрузка 1,1 In отключает автомат',s.devices[0].tripped&&!s.devices[0].on);
t.toggleDevice(s.devices[0]);
check('после взведения тепловая память сброшена',!s.devices[0].tripped&&!s.devices[0].on&&s.devices[0].breakerHeat===0);

console.log('');
console.log(env.fails()?('ПРОВАЛЕНО проверок: '+env.fails()):'токовая защита автоматов работает; все проверки пройдены');
process.exit(env.fails()?1:0);
