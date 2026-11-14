// Builds the teacher's answer key (PDF) from a game's own data, so the key never drifts from the game.
// Usage: node tools/answer-key.js pod-igoto "„Под игото“" "Пътят към свободата" [романа]
// The last argument says what the text is, in the genitive: „романа“ (default), „разказа“…
// Needs Google Chrome for print-to-PDF; writes <game>/otgovori.html (temporary) and <game>/otgovori.pdf.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const [game, work, title, kind = 'романа'] = process.argv.slice(2);
const dir = path.join(__dirname, '..', game);
const src = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

// the data block: from QUESTIONS up to EVENTS (inclusive)
const from = src.indexOf('const QUESTIONS');
const to = src.indexOf('];', src.indexOf('const EVENTS')) + 2;
const data = vm.runInNewContext(src.slice(from, to).replace(/^const /gm, 'var ') + '; ({ QUESTIONS, MATCHES, ORDERS })');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LETTERS = ['А', 'Б', 'В', 'Г'];
const GROUPS = [
  { t: 'g', name: 'Зелени полета: факти от текста', color: '#4f9d5d' },
  { t: 'y', name: 'Жълти полета: смисъл', color: '#e0b23a' },
  { t: 'r', name: 'Червени полета: цитати', color: '#c8372d' },
];

let n = 0;
const question = (q) => {
  n++;
  const opts = q.o.map((o, i) => `<li class="${i === q.a ? 'ok' : ''}"><b>${LETTERS[i]}</b> ${esc(o)}</li>`).join('');
  return `<article class="q">
    <div class="num">${n}</div>
    <div>
      ${q.quote ? `<p class="quote">${esc(q.quote)}</p>` : ''}
      <h3>${esc(q.q)}</h3>
      <ol class="opts">${opts}</ol>
      <p class="note">${esc(q.n)}</p>
      <p class="ch">${esc(q.ch)}</p>
    </div>
  </article>`;
};

const groups = GROUPS.map((g) => {
  const qs = data.QUESTIONS.filter((q) => q.t === g.t);
  return `<section><h2><span class="dot" style="background:${g.color}"></span>${g.name} <small>(${qs.length})</small></h2>${qs.map(question).join('')}</section>`;
}).join('');

const matches = `<section><h2><span class="dot" style="background:#e9dcc0"></span>„Свържи“ <small>(${data.MATCHES.length})</small></h2>${data.MATCHES.map((m) => `
  <article class="task"><h3>${esc(m.title)}</h3><ul>${m.pairs.map((p) => `<li>${esc(p[0])} <span>→</span> ${esc(p[1])}</li>`).join('')}</ul><p class="ch">${esc(m.ch)}</p></article>`).join('')}</section>`;

const orders = `<section><h2><span class="dot" style="background:#e9dcc0"></span>„Подреди“ <small>(${data.ORDERS.length})</small></h2>${data.ORDERS.map((o) => `
  <article class="task"><h3>${esc(o.title)}</h3><ol>${o.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ol><p class="ch">${esc(o.ch)}</p></article>`).join('')}</section>`;

const total = data.QUESTIONS.length;
const html = `<!doctype html>
<html lang="bg"><head><meta charset="utf-8">
<title>${esc(work)}: въпроси и отговори</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,500;0,700;0,800;1,500&family=Alegreya+Sans:wght@400;500;700;800&display=swap">
<style>
  @page { size: A4; margin: 16mm 16mm 18mm; @bottom-center { content: "beligri.org  ·  " counter(page) " / " counter(pages); font: 9pt "Alegreya Sans", sans-serif; color: #6e6455; } }
  * { box-sizing: border-box; }
  body { margin: 0; font: 10.5pt/1.4 "Alegreya Sans", Arial, sans-serif; color: #1d1a16; }
  header { border-bottom: 3px solid #b0281f; padding-bottom: 10px; margin-bottom: 14px; }
  .eyebrow { font-size: 8.5pt; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #b0281f; }
  h1 { font: 800 24pt/1.05 Alegreya, Georgia, serif; margin: 4px 0 6px; }
  header p { margin: 0; color: #3a342c; }
  .legend { margin-top: 8px; font-size: 9.5pt; color: #3a342c; }
  .legend b { display: inline-block; padding: 0 5px; border-radius: 3px; background: #e6f2e3; color: #2f6b3a; }
  h2 { font: 800 14pt Alegreya, Georgia, serif; margin: 18px 0 8px; display: flex; align-items: center; gap: 8px; break-after: avoid; }
  h2 small { font: 500 10pt "Alegreya Sans", sans-serif; color: #6e6455; }
  .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
  .q { display: grid; grid-template-columns: 26px 1fr; gap: 8px; padding: 8px 0; border-bottom: 1px solid #e3d8c2; break-inside: avoid; }
  .num { font: 800 12pt Alegreya, serif; color: #b0281f; }
  .quote { margin: 0 0 2px; font: italic 500 11.5pt Alegreya, serif; }
  h3 { margin: 0 0 4px; font-size: 10.5pt; font-weight: 700; }
  .opts { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 1px 14px; }
  .opts li b { color: #6e6455; font-weight: 700; margin-right: 3px; }
  .opts li.ok { font-weight: 700; color: #2f6b3a; }
  .opts li.ok b { color: #2f6b3a; }
  .opts li.ok::after { content: " ✓"; }
  .note { margin: 4px 0 0; color: #3a342c; font-family: Alegreya, serif; }
  .ch { margin: 2px 0 0; font-size: 8.5pt; color: #6e6455; }
  .task { padding: 8px 0; border-bottom: 1px solid #e3d8c2; break-inside: avoid; }
  .task ul, .task ol { margin: 0; padding-left: 18px; }
  .task li span { color: #b0281f; }
</style></head><body>
<header>
  <div class="eyebrow">За учителя · beligri.org</div>
  <h1>${esc(work)}: въпроси и отговори</h1>
  <p>Играта „${esc(title)}“. Всички ${total} въпроса и задачите „Свържи“ и „Подреди“ с верните отговори, пояснението и мястото в текста. Въпросите и цитатите са сверени с пълния текст на ${esc(kind)}.</p>
  <p class="legend">Верният отговор е маркиран така: <b>✓</b>. В играта отговорите се разбъркват.</p>
</header>
${groups}${matches}${orders}
</body></html>`;

const htmlPath = path.join(dir, 'otgovori.html');
const pdfPath = path.join(dir, 'otgovori.pdf');
fs.writeFileSync(htmlPath, html);
// Chrome: google-chrome on Linux, the usual install paths on Windows and macOS
const chrome = [process.env.CHROME, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => p && fs.existsSync(p)) || 'google-chrome';
execFileSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
  '--virtual-time-budget=8000', `--print-to-pdf=${pdfPath}`, require('url').pathToFileURL(htmlPath).href], { stdio: 'ignore' });
if (process.env.KEEP_HTML) fs.copyFileSync(htmlPath, process.env.KEEP_HTML); // preview copy for checking the layout
fs.unlinkSync(htmlPath);
console.log(`${pdfPath}: ${total} questions, ${data.MATCHES.length} matches, ${data.ORDERS.length} orders`);
