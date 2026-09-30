/* Каталог схем для обычного открытия index.html и статического сайта.
   Запуск из любой папки: node tools/update-presets.js
   Файлы .json в presets остаются источником данных; каталог их не изменяет. */
const fs = require('fs');
const path = require('path');

function presetsIn(data){
  const list = data && data.format === 'ad-trainer-schemes' && Array.isArray(data.presets)
    ? data.presets : data && data.format === 'ad-trainer-scheme' && data.preset
      ? [data.preset] : data && data.state ? [data] : [];
  return list.filter(p => p && p.state && Array.isArray(p.state.devices) && Array.isArray(p.state.wires));
}

function collectPresetFiles(projectDir){
  const dir = path.join(projectDir, 'presets'), entries = [], ignored = [];
  fs.mkdirSync(dir, { recursive:true });
  const files = fs.readdirSync(dir, { withFileTypes:true })
    .filter(e => e.isFile() && /\.json$/i.test(e.name))
    .map(e => e.name).sort((a,b) => a.localeCompare(b, 'ru'));
  for (const file of files){
    try{
      const filename = path.join(dir, file);
      const data = JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
      if (!presetsIn(data).length) throw new Error('нет схем тренажёра');
      entries.push({ file, modified:fs.statSync(filename).mtimeMs, data });
    }catch(error){ ignored.push({ file, reason:error.message }); }
  }
  return { entries, ignored };
}

function writePresetCatalog(projectDir){
  const result = collectPresetFiles(projectDir);
  const json = JSON.stringify(result.entries, null, 2).replace(/</g, '\\u003c');
  const output = '// Создан tools/update-presets.js из файлов папки presets.\n'
    + 'globalThis.ELECTROSIM_PRESET_CATALOG = ' + json + ';\n';
  fs.writeFileSync(path.join(projectDir, 'presets', 'catalog.js'), output, 'utf8');
  return result;
}

if (require.main === module){
  const projectDir = process.argv[2] || path.join(__dirname, '..');
  const result = writePresetCatalog(projectDir);
  console.log('Каталог presets обновлён. Файлов со схемами: ' + result.entries.length + '.');
  for (const item of result.ignored) console.warn('Пропущен ' + item.file + ': ' + item.reason);
}
module.exports = { presetsIn, collectPresetFiles, writePresetCatalog };
