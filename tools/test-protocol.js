/* Тест протокола испытаний. Запуск: node tools/test-protocol.js
   Проверяет уровни записей, фильтры, счётчик аварий, экранирование, перенос
   журнала в пресет и обратно, а также текст выгружаемого протокола. */
const { load } = require('./sandbox');

const env = load();
const t = env.api, els = env.els, check = env.check;

console.log('— уровни и счётчик —');
t.clearLog();
t.log('Автомат включён.', 'ok');
t.log('Лампа перегорела.', 'err');
t.log('УЗО сработало.', 'warn');
t.log('Справка по клеммной колодке.', 'info');
t.log('Неизвестный уровень.', 'bogus');
check('всего записей 5', t.items().length === 5, String(t.items().length));
check('счётчик аварий считает err+warn = 2', t.faults() === 2, String(t.faults()));
check('неизвестный уровень стал info', t.items()[0].kind === 'info', t.items()[0].kind);
check('новая запись сверху', t.items()[0].msg === 'Неизвестный уровень.');

console.log('— лимит протокола —');
for (let i = 0; i < 80; i++) t.log('Запись ' + i, 'info');
check('буфер не превышает ' + t.LOG_LIMIT, t.items().length === t.LOG_LIMIT, String(t.items().length));
check('остались самые свежие', t.items()[0].msg === 'Запись 79', t.items()[0].msg);

console.log('— фильтры —');
t.clearLog();
t.log('действие', 'ok'); t.log('авария', 'err'); t.log('предупреждение', 'warn'); t.log('справка', 'info');
t.setLogFilter('fault');
check('фильтр Аварии', t.filter() === 'fault');
const shown = els['log'].innerHTML;
check('в режиме «Аварии» нет справки', shown.indexOf('справка') < 0 && shown.indexOf('авария') >= 0);
t.setLogFilter('work');
check('в режиме «Аварии и действия» есть действие', els['log'].innerHTML.indexOf('действие') >= 0);
check('в режиме «Аварии и действия» нет справки', els['log'].innerHTML.indexOf('справка') < 0);
t.setLogFilter('all');
check('в режиме «Всё» есть справка', els['log'].innerHTML.indexOf('справка') >= 0);
t.setLogFilter('nope');
check('неизвестный фильтр игнорируется', t.filter() === 'all', t.filter());

console.log('— экранирование —');
t.clearLog();
t.log('<img src=x onerror=alert(1)>', 'err');
check('HTML в сообщении экранирован', els['log'].innerHTML.indexOf('<img') < 0
      && els['log'].innerHTML.indexOf('&lt;img') >= 0, els['log'].innerHTML);

console.log('— пустой протокол —');
t.clearLog();
check('очистка обнуляет счётчик', t.faults() === 0 && t.items().length === 0);
check('показана заглушка', els['log'].innerHTML.indexOf('log-empty') >= 0, els['log'].innerHTML);

console.log('— перенос в пресет —');
t.setLogFilter('fault');
t.log('RCD QD1: утечка 30 мА.', 'err');
t.log('Провод №7 удалён.', 'ok');
const snap = t.schemeSnapshot('Тестовая схема');
check('снимок содержит журнал', !!(snap.journal && Array.isArray(snap.journal.items)), JSON.stringify(snap.journal));
check('журнал в снимке: 2 записи', snap.journal.items.length === 2, String(snap.journal.items.length));
check('счётчик аварий в снимке = 1', snap.journal.faultCount === 1, String(snap.journal.faultCount));
check('фильтр сохранён', snap.journal.filter === 'fault', String(snap.journal.filter));
check('журнал сериализуется', JSON.stringify(snap).length > 0);

console.log('— восстановление из пресета —');
t.restoreLog(JSON.parse(JSON.stringify(snap.journal)));
check('восстановлено 2 записи', t.items().length === 2, String(t.items().length));
check('счётчик восстановлен', t.faults() === 1, String(t.faults()));
check('фильтр восстановлен', t.filter() === 'fault', t.filter());
t.restoreLog({ items: [{ ts:'00:00:00', msg:'подделка', kind:'"><script>' },
                       { ts:'00:00:01', msg:'нормальная', kind:'ok' }], faultCount:'7', filter:'hack' });
check('неизвестный уровень отброшен', t.items().length === 1, String(t.items().length));
check('осталась только валидная запись', t.items()[0].msg === 'нормальная');
check('мусорный фильтр заменён на work', t.filter() === 'work', t.filter());
t.restoreLog(undefined);
check('пустой журнал не ломает восстановление', t.items().length === 0 && t.filter() === 'work');

console.log('— текст протокола —');
t.restoreLog(JSON.parse(JSON.stringify(snap.journal)));
const text = t.protocolText();
check('есть заголовок', text.indexOf('ПРОТОКОЛ ИСПЫТАНИЙ') === 0);
check('есть название схемы', text.indexOf('Схема: ') >= 0);
check('есть уровень АВАРИЯ', text.indexOf('АВАРИЯ') >= 0, text);
check('записи в хронологическом порядке', text.indexOf('утечка') < text.indexOf('Провод №7'), text);
check('нет падения на пустом протоколе', (function(){
  t.clearLog(); const s = t.protocolText(); return s.indexOf('Записей нет.') >= 0;
})());

console.log('');
console.log(env.fails() ? ('ПРОВАЛЕНО проверок: ' + env.fails()) : 'все проверки пройдены');
process.exit(env.fails() ? 1 : 0);
