/* Проверка каталога и подключённой папки без запуска браузера.
   node tools/test-presets.js */
const assert = require('assert');
const { load } = require('./sandbox');
const { collectPresetFiles } = require('./update-presets');
const path = require('path');

function directory(files){
  return {
    name:'presets', permission:'granted', permissionRequests:0,
    async queryPermission(){return this.permission;},
    async requestPermission(){this.permissionRequests++;this.permission='granted';return 'granted';},
    async *values(){
      for(const [name,value] of files){
        if(value.directory){yield {name,kind:'directory'};continue;}
        yield {name,kind:'file',getFile:async()=>({lastModified:value.modified||1,text:async()=>value.text})};
      }
    }
  };
}

function memoryIndexedDB(){
  const values=new Map();
  const db={
    close(){}, createObjectStore(){},
    transaction(){
      const transaction={};
      transaction.objectStore=()=>({
        get(key){
          const request={};
          Promise.resolve().then(()=>{request.result=values.get(key);request.onsuccess();});
          return request;
        },
        put(value,key){values.set(key,value);Promise.resolve().then(()=>transaction.oncomplete());}
      });
      return transaction;
    }
  };
  return {open(){const request={};Promise.resolve().then(()=>{request.result=db;request.onsuccess();});return request;}};
}

(async function(){
  const env=load(),t=env.api;
  const catalog=collectPresetFiles(path.join(__dirname,'..'));
  assert(catalog.entries.length>0,'нет файлов исходного каталога');
  assert(t.folderPresets().length>0,'схемы каталога не появились при запуске');
  assert(env.els.presetList.innerHTML.includes('Из папки presets'));
  const base=t.schemeSnapshot('База','stable-id');
  const make=(name,id)=>Object.assign({},JSON.parse(JSON.stringify(base)),{name,id});
  const files=new Map([
    ['одна.json',{text:JSON.stringify({format:'ad-trainer-scheme',preset:make('Первая','one')})}],
    ['набор.json',{text:'\uFEFF'+JSON.stringify({format:'ad-trainer-schemes',presets:[make('Вторая','two'),make('Третья','three')]})}],
    ['сырая.json',{text:JSON.stringify(make('<b>Четвёртая</b>','four'))}],
    ['сломанная.json',{text:'{broken'}],
    ['не-схема.json',{text:JSON.stringify({state:{devices:[],wires:[null]}})}],
    ['README.txt',{text:'инструкция'}],
    ['вложенная',{directory:true}]
  ]);
  const handle=directory(files),db=memoryIndexedDB();
  env.window.indexedDB=db;
  env.window.showDirectoryPicker=async()=>handle;
  await t.connectPresetFolder();
  assert.strictEqual(t.folderPresets().length,4,'не прочитаны разные форматы схем');
  assert(env.els.presetFolderStatus.textContent.includes('Пропущено файлов: 2'));
  assert(env.els.presetList.innerHTML.includes('&lt;b&gt;Четвёртая&lt;/b&gt;'),'имя не экранировано');

  const selected=t.folderPresets().find(p=>p.name==='Первая').id;
  env.els.presetList.value=selected;
  files.set('одна.json',{modified:2,text:JSON.stringify({format:'ad-trainer-scheme',preset:make('Изменённая','one')})});
  await t.refreshPresetFolder();
  assert.strictEqual(env.els.presetList.value,selected,'выбор потерян при изменении файла');
  assert(t.readPresets().some(p=>p.name==='Изменённая'));
  files.set('новая.json',{text:JSON.stringify(make('Новая','new'))});
  await t.refreshPresetFolder();
  assert.strictEqual(t.folderPresets().length,5,'новый файл не появился');
  files.delete('сырая.json');
  await t.refreshPresetFolder();
  assert.strictEqual(t.folderPresets().length,4,'удалённый файл остался в списке');
  const count=t.folderPresets().length;
  t.deleteSelectedPreset();
  assert.strictEqual(t.folderPresets().length,count,'кнопка удаления изменила библиотеку');

  env.window.document.getElementById('presetName').value='Моя копия';
  t.saveCurrentPreset();
  assert.strictEqual(t.readBrowserPresets().length,1);
  assert(!env.store[t.PRESET_KEY].includes('_folderFile'),'библиотека записана в браузерное хранилище');
  assert.strictEqual(t.folderPresets().length,count,'сохранение изменило библиотеку');
  t.deleteSelectedPreset();
  assert.strictEqual(t.readBrowserPresets().length,0,'не удалена браузерная копия');

  env.window.FileReader=function(){this.readAsText=file=>{this.result=file.text;this.onload();};};
  t.importPresetFile({text:JSON.stringify({format:'ad-trainer-scheme',preset:t.folderPresets()[0]})});
  assert.strictEqual(t.readBrowserPresets().length,1,'импорт отдельных файлов сломан');
  assert(!t.readBrowserPresets()[0]._folderFile,'импортированная копия помечена библиотечной');
  env.els.presetList.value=t.folderPresets()[0].id;
  t.loadSelectedPreset();
  assert.strictEqual(env.els.presetName.value,t.folderPresets()[0].name,'схема из папки не загрузилась');

  const restored=load();
  restored.window.indexedDB=db;
  restored.window.showDirectoryPicker=async()=>{throw Error('папка уже должна быть запомнена');};
  await restored.api.initPresetFolder();
  assert.strictEqual(restored.api.folderPresets().length,count,'запомненная папка не восстановлена');
  handle.permission='prompt';
  const requests=handle.permissionRequests;
  await restored.api.refreshPresetFolder();
  assert.strictEqual(handle.permissionRequests,requests,'доступ запрошен без действия пользователя');
  assert(restored.els.presetFolderConnect.textContent.includes('Разрешить'));
  await restored.api.connectPresetFolder();
  assert.strictEqual(handle.permissionRequests,requests+1);
  assert.strictEqual(restored.api.folderPresets().length,count);
  files.clear();
  await t.refreshPresetFolder();
  await restored.api.refreshPresetFolder();
  assert.strictEqual(t.folderPresets().length,0,'при пустой папке вернулся старый каталог');
  assert.strictEqual(t.readBrowserPresets().length,1,'опустошение папки удалило импортированную копию');
  assert.strictEqual(restored.api.readPresets().length,0,'в пустом списке остались старые файловые схемы');
  console.log('Пресеты: каталог, форматы файлов, обновление папки, сохранение/импорт, загрузка и доступ — все проверки пройдены.');
})().catch(error=>{console.error(error);process.exitCode=1;});
