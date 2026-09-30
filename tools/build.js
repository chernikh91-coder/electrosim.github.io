/* Сборка однофайловой версии стенда: index.html + styles.css + app.js → stand-1file.html
   Запуск: node tools/build.js                                        */
const fs = require('fs');
const path = require('path');
const dir = process.argv[2] || path.join(__dirname, '..');
const p = f => path.join(dir, f);
require('./update-presets').writePresetCatalog(dir);

let html = fs.readFileSync(p('index.html'), 'utf8');
const css  = fs.readFileSync(p('styles.css'), 'utf8');
const js   = fs.readFileSync(p('presets/catalog.js'), 'utf8') + '\n' + fs.readFileSync(p('app.js'), 'utf8');

if (html.indexOf('<link rel="stylesheet" href="styles.css">') < 0 ||
    html.indexOf('<script src="app.js"></script>') < 0){
  console.error('index.html не содержит ссылок на styles.css / app.js — сборка невозможна');
  process.exit(1);
}

/* Подстановка выполняется функцией-заменой, а не строкой: в строке-замене
   символы $&, $`, $' и $$ имеют особый смысл, а в app.js есть регулярное
   выражение с '$' — из-за этого скрипт раньше молча портился. */
function inline(replacement){ return function(){ return replacement; }; }

/* Внутри <script> последовательность </script> оборвала бы разметку. */
if (/<\/script/i.test(js)){
  console.error('app.js содержит </script — встроить его в разметку нельзя');
  process.exit(1);
}
if (/<\/style/i.test(css)){
  console.error('styles.css содержит </style — встроить его в разметку нельзя');
  process.exit(1);
}

html = html.replace('<link rel="stylesheet" href="styles.css">',
                    inline('<style>\n' + css + '\n</style>'));
html = html.replace('<script src="presets/catalog.js"></script>', '');
html = html.replace('<script src="app.js"></script>',
                    inline('<script>\n' + js + '\n</script>'));

/* Проверка: собранный документ должен содержать ровно один экземпляр
   встроенного скрипта и один закрывающий тег body. */
const scripts = (html.match(/<script>/g) || []).length;
const bodies  = (html.match(/<\/body>/g) || []).length;
if (scripts !== 1 || bodies !== 1){
  console.error('сборка повреждена: <script> — ' + scripts + ', </body> — ' + bodies);
  process.exit(1);
}

fs.writeFileSync(p('stand-1file.html'), html, 'utf8');
console.log('stand-1file.html собран: ' + Buffer.byteLength(html, 'utf8') + ' Б');
