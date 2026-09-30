const {load}=require('./sandbox');

let fails=0;
function check(name,value){
  if(value)console.log('  ok   '+name);
  else{fails++;console.log('  FAIL '+name);}
}
function wheel(box,delta){return box.pointer(box.els.scene,'wheel',{pointerType:'mouse',deltaY:delta,clientX:500,clientY:400});}

console.log('ПК: отдельная геометрия и управление мышью');
const pc=load({interactive:true,width:1575,height:892});
check('мобильная компоновка на ПК выключена',!pc.api.mobileTouchLayout()&&!pc.window.document.documentElement.classList.contains('touch-ui'));
check('исходный масштаб 100%',pc.api.touchView().w===1240&&pc.api.touchView().h===1550);
const out=wheel(pc,120);
check('колесо отдаляет и отменяет прокрутку страницы',out.defaultPrevented&&pc.api.touchView().w>1240);
for(let i=0;i<40;i++)wheel(pc,120);
check('максимальное отдаление достижимо',pc.api.touchView().w===1736);
for(let i=0;i<80;i++)wheel(pc,-120);
check('максимальное приближение достижимо',pc.api.touchView().w===155);

console.log('\nМобильный режим: жест двумя пальцами');
const mobile=load({interactive:true,mobile:true,width:430,height:860});
mobile.els.scene.getScreenCTM=()=>({a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this;}});
check('мобильная компоновка включена',mobile.api.mobileTouchLayout()&&mobile.window.document.documentElement.classList.contains('touch-ui'));
const before=mobile.api.touchView().w;
mobile.pointer(mobile.els.scene,'pointerdown',{pointerId:1,clientX:100,clientY:300});
mobile.pointer(mobile.els.scene,'pointerdown',{pointerId:2,clientX:300,clientY:300});
mobile.pointer(mobile.els.scene,'pointermove',{pointerId:2,clientX:380,clientY:300});
check('разведение пальцев приближает',mobile.api.touchView().w<before);
mobile.pointer(mobile.els.scene,'pointerup',{pointerId:2,clientX:380,clientY:300});
mobile.pointer(mobile.els.scene,'pointerup',{pointerId:1,clientX:100,clientY:300});
check('жест полностью завершается',mobile.api.touchPointers.size===0);

if(fails){console.error('\nОшибок: '+fails);process.exit(1);}
console.log('\nМышь и сенсорное управление разделены; все проверки пройдены.');
