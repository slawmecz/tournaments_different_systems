import { load, getDB, onChange, setSetting, watchOtherTabs, setGuestPlayers } from './core/store.js';
import { t, setLang, detectLang, getLang } from './core/i18n.js';
import { esc, icon, toast } from './ui.js';
import { setRerender } from './views/common.js';
import * as home from './views/home.js';
import * as players from './views/players.js';
import * as tours from './views/tournaments.js';
import * as tview from './views/tournament.js';
import * as stats from './views/stats.js';
import * as settings from './views/settings.js';
import { decodeSnapshot } from './core/share.js';

const app = document.getElementById('app');

function changeLang(l) {
  setLang(l);
  setSetting('lang', l);
}

const routes = [
  { re: /^\/?$/, nav: 'home', title: 'nav.home', render: home.render, mount: home.mount },
  { re: /^\/players\/?$/, nav: 'players', title: 'nav.players', render: players.renderList, mount: players.mountList },
  { re: /^\/player\/([\w-]+)$/, nav: 'players', title: 'nav.players', keys: ['id'], render: players.renderProfile, mount: players.mountProfile },
  { re: /^\/tournaments\/?$/, nav: 'tournaments', title: 'nav.tournaments', render: tours.renderList },
  { re: /^\/new(?:\/(\w+))?$/, nav: 'new', title: 'nav.new', keys: ['format'], render: tours.renderWizard, mount: tours.mountWizard },
  { re: /^\/t\/([\w-]+)$/, nav: 'tournaments', title: 'nav.tournaments', keys: ['id'], render: tview.render, mount: tview.mount },
  { re: /^\/stats(?:\/(\w+))?$/, nav: 'stats', title: 'nav.stats', keys: ['tab'], render: stats.render, mount: stats.mount },
  { re: /^\/h2h\/([\w-]+)\/([\w-]+)$/, nav: 'stats', title: 'nav.stats', keys: ['a', 'b'], render: (p) => stats.render({ tab: 'h2h', ...p }), mount: stats.mount },
  { re: /^\/settings\/?$/, nav: 'settings', title: 'nav.settings', render: settings.render, mount: (root, p, info) => settings.mount(root, p, info, { onLang: changeLang }) },
  { re: /^\/view\/([\w-]+)$/, nav: '', title: 'sh.banner', keys: ['code'], snapshot: true },
];

function parse() {
  const path = location.hash.replace(/^#/, '').split('?')[0] || '/';
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      const params = {};
      (r.keys || []).forEach((k, i) => { params[k] = m[i + 1]; });
      return { r, params };
    }
  }
  return { r: null, params: {} };
}

function brandName() {
  return (getDB().settings.crew || '').trim() || t('brand.default');
}

function brandHTML() {
  const name = brandName();
  const i = name.lastIndexOf(' ');
  const inner = i > 0 ? `${esc(name.slice(0, i))} <em>${esc(name.slice(i + 1))}</em>` : `<em>${esc(name)}</em>`;
  return `<a class="brand" href="#/" aria-label="${esc(name)}"><svg viewBox="0 0 48 48" aria-hidden="true"><use href="#logo"/></svg><span class="brand-name">${inner}</span></a>`;
}

function renderChrome(nav) {
  const link = (key, href, ic) => `<a href="${href}" class="${nav === key ? 'active' : ''}" ${nav === key ? 'aria-current="page"' : ''}>${icon(ic)}<span>${esc(t('nav.' + key))}</span></a>`;
  const lang = getLang();
  document.getElementById('topbar').innerHTML = `${brandHTML()}
    <nav class="nav" aria-label="Main">${link('home', '#/', 'home')}${link('tournaments', '#/tournaments', 'trophy')}${link('players', '#/players', 'users')}${link('stats', '#/stats', 'chart')}</nav>
    <div class="topbar-actions">
      <div class="lang-toggle" role="group" aria-label="${esc(t('set.language'))}"><button type="button" data-set-lang="pl" class="${lang === 'pl' ? 'on' : ''}" aria-pressed="${lang === 'pl'}">PL</button><button type="button" data-set-lang="en" class="${lang === 'en' ? 'on' : ''}" aria-pressed="${lang === 'en'}">EN</button></div>
      <a class="btn btn-icon btn-ghost ${nav === 'settings' ? 'active' : ''}" href="#/settings" title="${esc(t('nav.settings'))}" aria-label="${esc(t('nav.settings'))}">${icon('gear')}</a>
      <a class="btn btn-primary btn-sm btn-new" href="#/new">${icon('plus')}${esc(t('nav.new'))}</a>
    </div>`;
  document.getElementById('tabbar').innerHTML = `${link('home', '#/', 'home')}${link('tournaments', '#/tournaments', 'trophy')}
    <a href="#/new" class="tab-new ${nav === 'new' ? 'active' : ''}" aria-label="${esc(t('nav.new'))}"><span class="fab">${icon('plus')}</span></a>
    ${link('players', '#/players', 'users')}${link('stats', '#/stats', 'chart')}`;
  document.getElementById('footer').innerHTML = `<span>© ${new Date().getFullYear()} ${esc(brandName())}</span><span>·</span><span>${esc(t('footer.tagline'))}</span><span class="spacer"></span><span>${icon('lock', 'ico-sm')}</span><span>${esc(t('footer.local'))}</span>`;
}

let snapshot = { code: null, data: null, error: null };

function renderRoute({ isNav = false, info = {} } = {}) {
  const { r, params } = parse();
  let html;
  let mountFn = null;
  if (!r) {
    html = `<div class="page"><div class="card not-found"><h1 class="display h2">${esc(t('c.notFound'))}</h1><p><a class="btn btn-primary" href="#/">${icon('home')}${esc(t('c.goHome'))}</a></p></div></div>`;
  } else if (r.snapshot) {
    if (snapshot.code !== params.code) {
      snapshot = { code: params.code, data: null, error: null };
      const code = params.code;
      decodeSnapshot(code)
        .then((d) => { if (snapshot.code === code) { snapshot.data = d; renderRoute({ isNav: true }); } })
        .catch((e) => { console.error('[share] invalid snapshot', e); if (snapshot.code === code) { snapshot.error = e; renderRoute({ isNav: true }); } });
    }
    if (snapshot.error) {
      html = `<div class="page"><div class="card not-found"><h1 class="display h2">${esc(t('sh.invalid'))}</h1><p><a class="btn btn-primary" href="#/">${icon('home')}${esc(t('c.goHome'))}</a></p></div></div>`;
    } else if (snapshot.data) {
      setGuestPlayers(snapshot.data.p);
      const opts = { snapshot: snapshot.data };
      html = tview.render({ id: snapshot.data.t.id }, opts);
      mountFn = (root) => tview.mount(root, { id: snapshot.data.t.id }, info, opts);
    } else {
      html = `<div class="page"><div class="card empty"><div class="art">${icon('ball')}</div></div></div>`;
    }
  } else {
    setGuestPlayers([]);
    html = r.render(params);
    if (r.mount) mountFn = (root) => r.mount(root, params, info);
  }
  app.innerHTML = html;
  const page = app.firstElementChild;
  if (isNav && page) page.classList.add('enter');
  // Views bind listeners to the freshly rendered page element (never to #app itself),
  // so handlers are discarded with the old DOM and never pile up across re-renders.
  mountFn?.(page || app);
  renderChrome(r?.nav);
  document.title = `${r ? t(r.title) : t('c.notFound')} · ${brandName()}`;
  if (isNav) {
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }
}

function boot() {
  load();
  setLang(getDB().settings.lang || detectLang());
  setRerender((info) => renderRoute({ info: info || {} }));
  onChange((info) => {
    if (info && info.saved === false) toast(t('c.storageError'), 'err');
    if (info?.silent) { renderChrome(parse().r?.nav); return; }
    renderRoute({ info: info || {} });
  });
  watchOtherTabs();
  window.addEventListener('hashchange', () => renderRoute({ isNav: true }));
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-set-lang]');
    if (b) changeLang(b.dataset.setLang);
  });
  renderRoute({ isNav: true });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch((e) => console.warn('[sw] registration failed', e)));
  }
}

boot();
