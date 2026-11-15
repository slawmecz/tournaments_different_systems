import { t, getLang } from '../core/i18n.js';
import { getDB, setSetting, replaceAll, fresh, storageBytes, context } from '../core/store.js';
import { validateDB } from '../core/validate.js';
import { esc, icon, toast, confirmDialog } from '../ui.js';
import { loadDemo, removeDemo, hasDemo } from '../core/demo.js';

export function render() {
  const db = getDB();
  const ctx = context();
  const kb = (storageBytes() / 1024).toFixed(1);
  const lang = getLang();
  return `<div class="page">
    <div class="page-head"><div class="titles"><span class="eyebrow">${icon('gear', 'ico-sm')}${esc(t('nav.settings'))}</span><h1 class="display h1">${esc(t('set.title'))}</h1></div></div>
    <div class="grid-2">
      <section class="card stack">
        <div class="field"><label for="crew">${esc(t('set.crew'))}</label>
          <input id="crew" class="input" maxlength="28" value="${esc(db.settings.crew || '')}" placeholder="${esc(t('brand.default'))}" autocomplete="off">
          <span class="hint">${esc(t('set.crewHint'))}</span></div>
        <div class="field"><span class="flabel">${esc(t('set.language'))}</span>
          <div class="seg"><button type="button" data-lang="pl" class="${lang === 'pl' ? 'on' : ''}">🇵🇱 Polski</button><button type="button" data-lang="en" class="${lang === 'en' ? 'on' : ''}">🇬🇧 English</button></div></div>
        <div class="notice">${icon('download')}<span>${esc(t('set.installHint'))}</span></div>
      </section>
      <section class="card stack">
        <div class="section-head" style="margin:0"><h2 class="h3">${esc(t('set.data'))}</h2></div>
        <p class="muted" style="margin:0;font-size:.9rem">${esc(t('set.dataInfo'))}</p>
        <div>
          <div class="kv"><span>${esc(t('set.players'))}</span><b>${db.players.length}</b></div>
          <div class="kv"><span>${esc(t('set.tournaments'))}</span><b>${db.tournaments.length}</b></div>
          <div class="kv"><span>${esc(t('set.matches'))}</span><b>${ctx.matches.length}</b></div>
          <div class="kv"><span>${esc(t('set.storage'))}</span><b>${kb} KB</b></div>
        </div>
        <div class="row-wrap">
          <button class="btn btn-primary" data-export>${icon('download')}${esc(t('set.export'))}</button>
          <label class="btn" style="cursor:pointer">${icon('upload')}${esc(t('set.import'))}<input type="file" accept="application/json,.json" data-import hidden></label>
        </div>
      </section>
    </div>
    <section class="card danger-zone stack">
      <div class="section-head" style="margin:0"><h2 class="h3">${esc(t('set.danger'))}</h2></div>
      <div class="row-wrap">
        ${hasDemo() ? `<button class="btn" data-remove-demo>${icon('sparkles')}${esc(t('set.removeDemo'))}</button>` : `<button class="btn" data-demo>${icon('sparkles')}${esc(t('set.demo'))}</button>`}
        <button class="btn btn-danger" data-reset>${icon('trash')}${esc(t('set.reset'))}</button>
      </div>
    </section>
  </div>`;
}

function download(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function mount(root, _params, _info, { onLang } = {}) {
  const crew = root.querySelector('#crew');
  // Saved on change (blur/Enter) as a silent update: header refreshes, the page keeps focus.
  crew.addEventListener('change', () => { setSetting('crew', crew.value.trim(), { silent: true }); toast(t('set.saved')); });
  crew.addEventListener('keydown', (e) => { if (e.key === 'Enter') crew.blur(); });
  root.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => onLang?.(b.dataset.lang)));
  root.querySelector('[data-export]').addEventListener('click', () => {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`sunday-league-backup-${stamp}.json`, JSON.stringify(getDB(), null, 1));
  });
  root.querySelector('[data-import]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let data;
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('file too large');
      const res = validateDB(JSON.parse(await file.text()));
      if (!res.ok) throw new Error(res.error);
      data = res.value;
    } catch (err) {
      console.warn('[import] backup rejected:', err.message);
      toast(t('set.importError'), 'err');
      return;
    }
    const db = getDB();
    const ok = await confirmDialog({ title: t('set.import'), text: t('set.importConfirm', { p: db.players.length, t: db.tournaments.length }), confirmLabel: t('set.import') });
    if (!ok) return;
    replaceAll(data);
    toast(t('set.imported'));
  });
  root.querySelector('[data-demo]')?.addEventListener('click', () => { loadDemo(); toast(t('set.demoLoaded')); });
  root.querySelector('[data-remove-demo]')?.addEventListener('click', () => { removeDemo(); toast(t('set.demoRemoved')); });
  root.querySelector('[data-reset]').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: t('set.reset'), text: t('set.resetConfirm'), confirmLabel: t('c.delete'), danger: true });
    if (!ok) return;
    const keep = getDB().settings;
    replaceAll({ ...fresh(), settings: keep });
    toast(t('set.resetDone'));
  });
}
