import { icon } from './icons.js';
import {
  SLOTS, slotById, SELLERS, PRODUCTS, productById, FILTERS, DEFAULT_FILTERS, PRICE_CAP, genericFilters,
  SCENARIOS, DEMO_SHIP_STATUS, ORDER_META, BUDGET, DELIVERY_PER_SELLER, REQUIRED_PSU_W,
} from './data.js';

/* ==========================================================================
   Helpers
   ========================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NB = ' ';
const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB) + NB + '₴';
const clone = (o) => JSON.parse(JSON.stringify(o));
/** Ukrainian plural: plural(5, ['компонент', 'компоненти', 'компонентів']) */
const plural = (n, [one, few, many]) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
const joinAnd = (arr) => (arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} і ${arr[arr.length - 1]}`);

const btn = (label, { kind = 'primary', act = '', attrs = '', block = false, disabled = false, icon: ic = '' } = {}) =>
  `<button type="button" class="btn btn--${kind}${block ? ' btn--block' : ''}" ${act ? `data-act="${act}"` : ''} ${disabled ? 'disabled' : ''} ${attrs}>${ic}${esc(label)}</button>`;

const BADGES = {
  compatible:  { icon: 'checkCircle', text: 'Сумісно' },
  nuance:      { icon: 'alertCircle', text: 'Нюанс встановлення' },
  conflict:    { icon: 'xCircle',     text: 'Конфлікт' },
  unverified:  { icon: 'helpCircle',  text: 'Не перевірено' },
  recommended: { icon: 'star',        text: 'Найвигідніше' },
};
const badge = (status, text) => {
  const b = BADGES[status];
  return `<span class="badge badge--${status}">${icon(b.icon, 16)}${esc(text || b.text)}</span>`;
};

/* ==========================================================================
   State (persisted per browser; this is a prototype, not a store)
   ========================================================================== */
const STORE_KEY = 'pickpart-proto-v1';
const freshState = () => ({
  build: {},
  order: null,
  filters: {},          // cat → { applied: [], pending: [], price: bool }
  checkout: { name: 'Володимир Хоменко', phone: '+380 67 12', city: 'Львів', branch: '№12, вул. Городоцька, 120', save: true, touched: { phone: true } },
});
let state = freshState();
try { const raw = localStorage.getItem(STORE_KEY); if (raw) state = { ...freshState(), ...JSON.parse(raw) }; } catch { /* storage unavailable */ }
const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* ignore */ } };

let checking = false;   // compatibility re-check in progress (slots → Loading, panel → Checking)
let checkTimer = 0;
let lastRoute = '';

function recheck() {
  checking = true;
  clearTimeout(checkTimer);
  render();
  checkTimer = setTimeout(() => { checking = false; render(); }, 1400);
}

/* ==========================================================================
   Compatibility engine — checks the whole build, not just the new pair
   ========================================================================== */
function part(slot, build = state.build) {
  const ref = build[slot];
  if (!ref) return null;
  const prod = productById[ref.pid];
  const offer = prod.offers.find((o) => o.seller === ref.seller) || prod.offers[0];
  return { slot, prod, offer, seller: ref.seller, price: offer.price };
}

function evaluate(build = state.build) {
  const parts = Object.fromEntries(SLOTS.map((s) => [s.id, part(s.id, build)]));
  const status = {};
  const issues = [];
  for (const s of SLOTS) if (parts[s.id]) status[s.id] = 'compatible';

  const { cpu, motherboard: mb, cooler, case: pc, psu } = parts;
  if (cpu && mb && cpu.prod.socket !== mb.prod.socket) {
    status.motherboard = 'conflict';
    issues.push({ type: 'conflict', slot: 'motherboard', title: 'Процесор і плата несумісні', short: 'процесор і плата несумісні',
      msg: `${cpu.prod.short} має сокет ${cpu.prod.socket}, а ${mb.prod.short} — ${mb.prod.socket}.`,
      action: { label: 'Показати сумісні плати', act: 'suggest-mb' } });
  }
  if (psu && psu.prod.watts < REQUIRED_PSU_W) {
    status.psu = 'conflict';
    issues.push({ type: 'conflict', slot: 'psu', title: 'Блока живлення не вистачить', short: 'блока живлення не вистачить',
      msg: `Збірці потрібно від ${REQUIRED_PSU_W} Вт, а ${psu.prod.short} дає ${psu.prod.watts} Вт.`,
      action: { label: 'Показати потужніші блоки', act: 'go', arg: '#/catalog/psu' } });
  }
  if (cooler && pc) {
    const margin = pc.prod.clearance - cooler.prod.height;
    if (margin < 0) {
      status.cooler = 'conflict';
      issues.push({ type: 'conflict', slot: 'cooler', title: 'Кулер не поміститься в корпус', short: 'кулер не поміщається в корпус',
        msg: `Кулер ${cooler.prod.height} мм, а корпус — до ${pc.prod.clearance} мм.`,
        action: { label: 'Показати сумісні кулери', act: 'go', arg: '#/catalog/cooler' } });
    } else if (margin <= 5) {
      status.cooler = 'nuance';
      issues.push({ type: 'nuance', slot: 'cooler', title: 'Сумісне, є нюанс встановлення',
        msg: `Кулер ${cooler.prod.height} мм, корпус — до ${pc.prod.clearance} мм. Запас ${margin} мм: спершу кулер, потім кришка корпусу.` });
    }
  }
  for (const s of SLOTS) {
    const x = parts[s.id];
    if (x && x.offer.noSpecs && status[s.id] === 'compatible') {
      status[s.id] = 'unverified';
      issues.push({ type: 'unverified', slot: s.id, title: 'Сумісність не перевірено', msg: x.prod.unverifiedMsg,
        action: { label: 'Обрати іншу пропозицію', act: 'go', arg: `#/product/${x.prod.id}` } });
    }
  }
  const filled = SLOTS.filter((s) => parts[s.id]);
  const sellers = [...new Set(filled.map((s) => parts[s.id].seller))];
  const components = filled.reduce((sum, s) => sum + parts[s.id].price, 0);
  const delivery = sellers.length * DELIVERY_PER_SELLER;
  return {
    parts, status, issues, filled: filled.length, missing: SLOTS.filter((s) => !parts[s.id]),
    sellers, components, delivery, total: components + delivery,
    checks: Math.max(0, filled.length * 2 - 2),   // 8 компонентів → 14 перевірок (Figma)
    conflicts: issues.filter((i) => i.type === 'conflict'),
  };
}

/** Is a catalog product compatible with what's already in the build? */
function fitsBuild(prod) {
  const ev = evaluate({ ...state.build, [prod.slot]: { pid: prod.id, seller: prod.offers[0].seller } });
  return ev.status[prod.slot] !== 'conflict' && !ev.conflicts.some((c) => c.slot === prod.slot || (prod.slot === 'cpu' && c.slot === 'motherboard'));
}

/* ==========================================================================
   Shared organisms
   ========================================================================== */
function header(active) {
  const item = (id, label, href) => `<a class="nav__item" href="${href}" ${active === id ? 'aria-current="page"' : ''}>${label}</a>`;
  const nav = item('catalog', 'Комплектуючі', '#/catalog/cpu') + item('build', 'Моя збірка', '#/build') + item('orders', 'Мої замовлення', '#/orders');
  return `
  <header class="header-bar">
    <div class="header">
      <a class="logo" href="#/build" aria-label="Pickpart — на головну">
        <span class="logo__mark">${icon('cpu', 20, 'ic-on-primary')}</span>
        <span class="logo__name">Pickpart</span>
      </a>
      <form class="search" role="search" data-form="search">
        <label class="field search__field">
          ${icon('search', 20, 'ic-secondary')}
          <span class="sr-only">Пошук комплектуючих</span>
          <input type="search" name="q" placeholder="Наприклад, «RTX 5060» або «AM5»" autocomplete="off">
        </label>
        <button type="submit" class="btn btn--primary">Знайти</button>
      </form>
      <nav class="nav" aria-label="Розділи">${nav}</nav>
      ${btn('Увійти', { kind: 'text', act: 'login' })}
    </div>
  </header>`;
}

function pageTitle(title, subtitle) {
  return `<div class="page__title"><h1 class="t-h1">${esc(title)}</h1>${subtitle ? `<p class="t-body page__subtitle">${esc(subtitle)}</p>` : ''}</div>`;
}

function compatibilityPanel(ev) {
  let boxes;
  const box = (type, ic, title, msg) => `
    <div class="status-box status-box--${type}" role="status">
      ${icon(ic, 24, `ic-${type === 'checking' ? 'info' : type}`)}
      <div class="status-box__text"><p class="status-box__title">${esc(title)}</p>${msg ? `<p>${esc(msg)}</p>` : ''}</div>
    </div>`;
  const actionBtn = (i) => i.action ? btn(i.action.label, { kind: i.type === 'conflict' ? 'secondary' : 'text', act: i.action.act, block: true, attrs: i.action.arg ? `data-arg="${i.action.arg}"` : '' }) : '';

  if (checking) {
    boxes = box('checking', 'spinner', 'Перевіряємо сумісність…', 'Усю збірку, а не лише нову пару компонентів');
  } else if (ev.filled === 0) {
    boxes = box('unverified', 'helpCircle', 'Збірка поки порожня', 'Перевіримо сумісність після першого компонента.');
  } else if (ev.conflicts.length) {
    boxes = ev.conflicts.map((i) => box('conflict', 'xCircle', i.title, i.msg) + actionBtn(i)).join('');
  } else {
    const rest = ev.issues.filter((i) => i.type === 'unverified').concat(ev.issues.filter((i) => i.type === 'nuance'));
    boxes = rest.length
      ? rest.map((i) => box(i.type, i.type === 'nuance' ? 'alertCircle' : 'helpCircle', i.title, i.msg) + actionBtn(i)).join('')
      : box('compatible', 'checkCircle', 'Усе сумісне',
          ev.filled > 1
            ? `${ev.filled} ${plural(ev.filled, ['компонент', 'компоненти', 'компонентів'])} · ${ev.checks} ${plural(ev.checks, ['перевірка', 'перевірки', 'перевірок'])}`
            : '1 компонент · перевіримо після наступного');
  }
  return `<section class="card panel" aria-label="Сумісність" aria-live="polite"><h2 class="t-h3">Сумісність</h2>${boxes}</section>`;
}

function buildSummary(ev, { cta = 'Оформити замовлення', ctaAct = 'checkout' } = {}) {
  let note = '';
  let ready = false;
  if (checking) {
    note = `<p class="summary__note summary__note--info">${icon('spinner', 16, 'ic-secondary spin')}<span>Перевіряємо сумісність усієї збірки…</span></p>`;
  } else if (ev.conflicts.length) {
    note = `<p class="summary__note summary__note--conflict">${icon('xCircle', 16, 'ic-conflict')}<span>Спершу розв’яжіть конфлікт: ${esc(ev.conflicts[0].short)}</span></p>`;
  } else if (ev.missing.length) {
    const k = ev.missing.length;
    note = `<p class="summary__note summary__note--info">${icon('info', 16, 'ic-secondary')}<span>Заповніть ще ${k} ${plural(k, ['обов’язковий слот', 'обов’язкові слоти', 'обов’язкових слотів'])}: ${esc(joinAnd(ev.missing.map((s) => s.acc)))}</span></p>`;
  } else {
    ready = true;
    note = ev.total <= BUDGET
      ? `<p class="summary__budget">У межах бюджету ${money(BUDGET)}</p>`
      : `<p class="summary__budget summary__budget--over">Більше за бюджет ${money(BUDGET)} на ${money(ev.total - BUDGET)}</p>`;
  }
  return `
  <section class="card summary" aria-label="Підсумок збірки">
    <div class="summary__row"><span class="summary__label">Компоненти</span><span class="t-price">${money(ev.components)}</span></div>
    <div class="summary__row"><span class="summary__label">Доставка · ${ev.sellers.length} ${plural(ev.sellers.length, ['продавець', 'продавці', 'продавців'])}</span><span class="t-price">${money(ev.delivery)}</span></div>
    <div class="summary__divider"></div>
    <div class="summary__row"><span class="t-h5">Разом</span><span class="t-price-l">${money(ev.total)}</span></div>
    ${note}
    ${btn(cta, { kind: 'primary', act: ctaAct, block: true, disabled: !ready })}
    ${btn('Зберегти збірку', { kind: 'text', act: 'save-build', block: true })}
  </section>`;
}

/* ==========================================================================
   Screens
   ========================================================================== */
function slotCard(slot, ev) {
  if (checking && ev.parts[slot.id]) {
    return `<div class="slot slot--loading" aria-busy="true" aria-label="${esc(slot.label)}: перевіряємо">
      <div class="slot__thumb"></div>
      <div class="slot__info"><span class="skel" style="width:96px;height:12px"></span><span class="skel" style="width:220px;max-width:100%;height:16px"></span><span class="skel" style="width:160px;max-width:80%;height:12px"></span></div>
      <div class="slot__price" style="align-items:flex-end"><span class="skel" style="width:72px;height:16px"></span><span class="skel" style="width:88px;height:20px"></span></div>
    </div>`;
  }
  const x = ev.parts[slot.id];
  if (!x) {
    return `<div class="slot slot--empty">
      <div class="slot__thumb">${icon(slot.icon, 24, 'ic-secondary')}</div>
      <div class="slot__info"><p class="slot__cat">${esc(slot.label)}</p><p class="slot__name">${esc(slot.empty[0])}</p><p class="slot__meta">${esc(slot.empty[1])}</p></div>
      ${btn('Додати', { kind: 'secondary', act: 'go', attrs: `data-arg="#/catalog/${slot.id}" aria-label="Додати: ${esc(slot.label)}"` })}
    </div>`;
  }
  const st = ev.status[slot.id];
  const meta = x.offer.noSpecs ? `${x.prod.noSpecsMeta} · ${x.seller}` : `${x.prod.metaBase} · ${x.seller}`;
  const mod = st === 'nuance' || st === 'conflict' ? ` slot--${st}` : '';
  return `<button type="button" class="slot${mod}" data-act="go" data-arg="#/product/${x.prod.id}">
    <span class="slot__thumb">${icon(slot.icon, 24, 'ic-brand')}</span>
    <span class="slot__info"><span class="slot__cat">${esc(slot.label)}</span><span class="slot__name">${esc(x.prod.name)}</span><span class="slot__meta">${esc(meta)}</span></span>
    <span class="slot__price"><span class="t-price">${money(x.price)}</span>${badge(st)}</span>
  </button>`;
}

function screenBuild() {
  const ev = evaluate();
  if (ev.filled === 0) {
    return `<main class="page" id="main">
      ${pageTitle('Моя збірка', 'Порожня збірка · 0 з 8 слотів заповнено')}
      <div class="empty-area">
        <div class="card empty">
          <div class="empty__ill">${icon('plus', 32, 'ic-brand')}</div>
          <h2 class="t-h4">Збірка поки порожня</h2>
          <p class="t-body empty__text">Додавайте компоненти в будь-якому порядку — сумісність перевіримо після кожного.</p>
          ${btn('Почати з процесора', { act: 'go', attrs: 'data-arg="#/catalog/cpu"' })}
        </div>
      </div>
    </main>`;
  }
  const hasProblems = !checking && ev.issues.length > 0;
  const subtitle = hasProblems
    ? 'Проблемні слоти виділені рамкою кольору статусу — їх видно під час прокручування.'
    : `Ігри та кодинг · бюджет до ${money(BUDGET)} · ${ev.filled} з 8 слотів заповнено`;
  return `<main class="page" id="main">
    ${pageTitle('Моя збірка', subtitle)}
    <div class="split">
      <div class="split__main" aria-label="Слоти збірки">${SLOTS.map((s) => slotCard(s, ev)).join('')}</div>
      <aside class="split__aside">${compatibilityPanel(ev)}${buildSummary(ev)}</aside>
    </div>
  </main>`;
}

function filterState(cat) {
  if (!state.filters[cat]) {
    const def = DEFAULT_FILTERS[cat] || ['compat'];
    state.filters[cat] = { applied: [...def], pending: [...def], price: !!PRICE_CAP[cat], q: '' };
  }
  return state.filters[cat];
}
function filterDefs(cat) { return FILTERS[cat] || genericFilters; }
function applyFilters(cat, ids, fs) {
  const defs = filterDefs(cat);
  return PRODUCTS.filter((x) => x.slot === cat)
    .filter((x) => ids.every((id) => (id === 'compat' ? fitsBuild(x) : defs.find((d) => d.id === id).test(x))))
    .filter((x) => !(fs.price && PRICE_CAP[cat]) || Math.min(...x.offers.filter((o) => !o.unavailable).map((o) => o.price), Infinity) <= PRICE_CAP[cat] || x.offers.every((o) => o.unavailable))
    .filter((x) => !fs.q || x.name.toLowerCase().includes(fs.q.toLowerCase()) || x.spec.toLowerCase().includes(fs.q.toLowerCase()));
}
const models = (n) => `${n} ${plural(n, ['модель', 'моделі', 'моделей'])}`;

function catalogRow(x) {
  const avail = x.offers.filter((o) => !o.unavailable);
  if (!avail.length) {
    return `<div class="offer is-unavailable">
      <div class="offer__thumb">${icon(slotById[x.slot].icon, 20, 'ic-brand')}</div>
      <div class="offer__info"><div class="offer__row"><p class="offer__name">${esc(x.name)}</p></div><p class="offer__meta">Немає в наявності</p></div>
      ${btn('Пропозиції', { kind: 'secondary', disabled: true })}
    </div>`;
  }
  const min = Math.min(...avail.map((o) => o.price));
  const n = x.offers.length;
  return `<div class="offer">
    <div class="offer__thumb">${icon(slotById[x.slot].icon, 20, 'ic-brand')}</div>
    <div class="offer__info"><div class="offer__row"><p class="offer__name">${esc(x.name)}</p>${x.best ? badge('recommended') : ''}</div><p class="offer__meta">${esc(x.spec)}</p></div>
    <div class="offer__price"><span class="t-price">${money(min)}</span><span class="offer__sub">${n} ${plural(n, ['пропозиція', 'пропозиції', 'пропозицій'])}</span></div>
    ${btn('Пропозиції', { kind: 'secondary', act: 'go', attrs: `data-arg="#/product/${x.id}" aria-label="Пропозиції: ${esc(x.name)}"` })}
  </div>`;
}

function screenCatalog(cat) {
  const slot = slotById[cat] || slotById.cpu;
  cat = slot.id;
  const fs = filterState(cat);
  const defs = filterDefs(cat);
  const list = applyFilters(cat, fs.applied, fs);
  const pendingCount = applyFilters(cat, fs.pending, fs).length;
  const compatOn = fs.applied.includes('compat');
  const subtitle = `${compatOn ? 'Показано лише компоненти, сумісні з вашою збіркою' : 'Показано всі компоненти категорії'} · ${models(list.length)}`;

  const chips = [
    ...fs.applied.filter((id) => id !== 'compat').map((id) => ({ id, label: defs.find((d) => d.id === id).chip })),
    ...(fs.price && PRICE_CAP[cat] ? [{ id: 'price', label: `до ${money(PRICE_CAP[cat])}` }] : []),
    ...(fs.q ? [{ id: 'q', label: `«${fs.q}»` }] : []),
  ];
  const anyFilter = chips.length || fs.applied.length;

  const results = list.length
    ? `<div class="list">${list.map(catalogRow).join('')}</div>`
    : `<div class="empty-area" style="padding-top:var(--space-5)"><div class="card empty">
        <div class="empty__ill">${icon('search', 32, 'ic-brand')}</div>
        <h2 class="t-h4">Нічого не знайдено</h2>
        <p class="t-body empty__text">Спробуйте прибрати ${chips.length ? `фільтр ${esc(chips[chips.length - 1].label.startsWith('«') ? chips[chips.length - 1].label : `«${chips[chips.length - 1].label}»`)}` : 'фільтр «Лише сумісні з моєю збіркою»'}.</p>
        ${btn('Скинути фільтри', { kind: 'secondary', act: 'reset-filters', attrs: `data-arg="${cat}"` })}
      </div></div>`;

  return `<main class="page" id="main">
    ${pageTitle(slot.catalogTitle, subtitle)}
    <div class="split catalog">
      <form class="card filters" data-form="filters" data-cat="${cat}">
        <h2 class="t-h4">Фільтри</h2>
        ${defs.map((d) => `<label class="checkbox"><input type="checkbox" name="${d.id}" ${fs.pending.includes(d.id) ? 'checked' : ''}><span class="checkbox__box">${icon('check', 16, 'ic-on-primary')}</span><span>${esc(d.label)}</span></label>`).join('')}
        <button type="submit" class="btn btn--primary btn--block">Показати ${pendingCount}</button>
      </form>
      <div class="catalog__results">
        ${anyFilter ? `<div class="active-filters" aria-label="Активні фільтри">
          ${chips.map((c) => `<button type="button" class="chip is-selected" data-act="remove-chip" data-cat="${cat}" data-arg="${c.id}" aria-label="Прибрати фільтр ${esc(c.label)}">${esc(c.label)}${icon('close', 16, 'ic-brand')}</button>`).join('')}
          ${btn('Скинути фільтри', { kind: 'text', act: 'reset-filters', attrs: `data-arg="${cat}"` })}
        </div>` : ''}
        ${results}
      </div>
    </div>
  </main>`;
}

function screenProduct(pid, fromCatalog) {
  const prod = productById[pid];
  if (!prod) return screenNotFound();
  const ev = evaluate();
  const current = state.build[prod.slot];
  const inBuild = current && current.pid === prod.id ? current.seller : null;
  const n = prod.offers.length;

  const rows = prod.offers.map((o) => {
    const s = SELLERS[o.seller];
    if (o.unavailable) {
      return `<div class="offer is-unavailable">
        <div class="offer__thumb">${icon('store', 20, 'ic-secondary')}</div>
        <div class="offer__info"><div class="offer__row"><p class="offer__name">${esc(o.seller)}</p></div><p class="offer__meta">Немає в наявності</p></div>
        ${btn('Обрати', { kind: 'secondary', disabled: true })}
      </div>`;
    }
    const selected = inBuild === o.seller;
    const st = selected ? (checking ? null : ev.status[prod.slot]) : null;
    const right = selected
      ? (st ? badge(st, st === 'compatible' ? 'У збірці' : undefined) : '')
      : btn('Обрати', { kind: 'secondary', act: 'choose-offer', attrs: `data-arg="${prod.id}|${o.seller}" aria-label="Обрати пропозицію ${esc(o.seller)}"` });
    return `<div class="offer${selected ? ' is-selected' : ''}">
      <div class="offer__thumb">${icon('store', 20, 'ic-default')}</div>
      <div class="offer__info"><div class="offer__row"><p class="offer__name">${esc(o.seller)}</p>${o.best ? badge('recommended') : ''}</div><p class="offer__meta">${esc(s.offerDelivery)} · рейтинг ${s.rating}${o.noSpecs ? ' · без характеристик' : ''}</p></div>
      <div class="offer__price"><span class="t-price">${money(o.price)}</span><span class="offer__sub">${esc(o.sub)}</span></div>
      ${right}
    </div>`;
  }).join('');

  return `<main class="page" id="main">
    ${fromCatalog ? btn('← До каталогу', { kind: 'text', act: 'go', attrs: `data-arg="#/catalog/${prod.slot}"` }) : btn('← До збірки', { kind: 'text', act: 'go', attrs: 'data-arg="#/build"' })}
    ${pageTitle(prod.name, `${prod.detail} · ${n} ${plural(n, ['пропозиція', 'пропозиції', 'пропозицій'])} від продавців`)}
    <div class="split">
      <div class="split__main"><h2 class="t-h3">Пропозиції продавців</h2>${rows}</div>
      <aside class="split__aside">${compatibilityPanel(ev)}${buildSummary(ev)}</aside>
    </div>
  </main>`;
}

/* ---------- Checkout ---------- */
const PHONE_RE = /^\+380\d{9}$/;
const FIELDS = [
  { id: 'name', label: 'Ім’я та прізвище', helper: 'Як у документі для отримання посилки', placeholder: 'Наприклад, Олена Коваль', autocomplete: 'name',
    validate: (v) => (v.trim().split(/\s+/).length >= 2 ? '' : 'Вкажіть ім’я та прізвище, як у документі') },
  { id: 'phone', label: 'Телефон отримувача', helper: 'Для SMS про статус кожного відправлення', placeholder: '+380 __ ___ __ __', autocomplete: 'tel', type: 'tel',
    validate: (v) => (PHONE_RE.test(v.replace(/[\s()-]/g, '')) ? '' : 'Номер має містити 12 цифр: +380 і ще 9') },
  { id: 'city', label: 'Місто', helper: 'Одне місто для всіх відправлень', placeholder: 'Наприклад, Львів', autocomplete: 'address-level2',
    validate: (v) => (v.trim() ? '' : 'Вкажіть місто доставки') },
  { id: 'branch', label: 'Відділення Нової Пошти', helper: 'Можна змінити для окремого відправлення', placeholder: 'Номер або адреса відділення',
    validate: (v) => (v.trim() ? '' : 'Оберіть відділення Нової Пошти') },
];
const fieldError = (f) => (state.checkout.touched[f.id] ? f.validate(state.checkout[f.id] || '') : '');

function inputField(f) {
  const err = fieldError(f);
  return `<div class="input${err ? ' is-error' : ''}" data-field="${f.id}">
    <label class="input__label" for="f-${f.id}">${esc(f.label)}</label>
    <div class="field"><input id="f-${f.id}" name="${f.id}" type="${f.type || 'text'}" value="${esc(state.checkout[f.id] || '')}" placeholder="${esc(f.placeholder)}" ${f.autocomplete ? `autocomplete="${f.autocomplete}"` : ''} aria-describedby="h-${f.id}" ${err ? 'aria-invalid="true"' : ''}></div>
    <p class="input__helper" id="h-${f.id}">${err ? icon('alertCircle', 16, 'ic-conflict') + esc(err) : esc(f.helper)}</p>
  </div>`;
}

function groupBySeller(ev) {
  const g = {};
  for (const s of SLOTS) { const x = ev.parts[s.id]; if (x) (g[x.seller] ||= []).push({ name: x.prod.name, price: x.price }); }
  const order = Object.keys(SELLERS);   // TechLviv, PCBox, ЧіпМаркет, Компік — as in Figma
  return Object.entries(g).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)).map(([seller, parts]) => ({ seller, parts }));
}

const SHIP = {
  pending:    { badge: 'unverified', ic: 'package',     text: 'Очікує оплати' },
  processing: { badge: 'unverified', ic: 'package',     text: 'Готується',   foot: ['store', 'Продавець комплектує відправлення'] },
  shipped:    { badge: 'info',       ic: 'truck',       text: 'Відправлено', foot: ['truck', (s) => `Нова Пошта · очікуйте за ${SELLERS[s].shipDelivery.split('· ')[1]}`] },
  delivered:  { badge: 'compatible', ic: 'checkCircle', text: 'Доставлено',  foot: ['check', 'Відправлення отримано'] },
  cancelled:  { badge: 'conflict',   ic: 'xCircle',     text: 'Скасовано',   foot: ['xCircle', 'Кошти за відправлення повернуто'] },
};
function shipmentCard(sh, { action = false, idx = 0 } = {}) {
  const st = SHIP[sh.status];
  const foot = st.foot ? [st.foot[0], typeof st.foot[1] === 'function' ? st.foot[1](sh.seller) : st.foot[1]] : ['store', SELLERS[sh.seller].shipDelivery];
  const shown = sh.parts.slice(0, 3);
  const more = sh.parts.length - shown.length;
  let act = '';
  if (action && sh.status === 'processing') act = btn('Скасувати відправлення', { kind: 'text', act: 'cancel-shipment', attrs: `data-arg="${idx}"` });
  if (action && sh.status === 'delivered') act = btn('Повернення або гарантія', { kind: 'text', act: 'return', attrs: `data-arg="${idx}"` });
  return `<article class="card ship">
    <div class="ship__head">${icon('store', 20, 'ic-secondary')}<h3 class="ship__seller">${esc(sh.seller)}</h3>
      <span class="badge badge--${st.badge}">${icon(st.ic, 16)}${st.text}</span></div>
    <div class="ship__parts">
      ${shown.map((x) => `<div class="ship__part"><span class="ship__part-name">${esc(x.name)}</span><span class="t-price">${money(x.price)}</span></div>`).join('')}
      ${more > 0 ? `<p class="t-caption" style="color:var(--text-secondary)">ще ${more} ${plural(more, ['компонент', 'компоненти', 'компонентів'])}</p>` : ''}
    </div>
    <p class="ship__foot">${icon(foot[0], 16, 'ic-secondary')}<span>${esc(foot[1])}</span></p>
    ${act}
  </article>`;
}

function screenCheckout() {
  const ev = evaluate();
  if (ev.filled === 0) return screenBuild();
  const shipments = groupBySeller(ev).map((s) => ({ ...s, status: 'pending' }));
  return `<main class="page" id="main">
    ${pageTitle('Оформлення замовлення', `Крок 2 з 3 · Доставка і дані · ${shipments.length} ${plural(shipments.length, ['відправлення', 'відправлення', 'відправлень'])} від ${shipments.length} ${plural(shipments.length, ['продавця', 'продавців', 'продавців'])}`)}
    <div class="split">
      <form class="split__main checkout__form" data-form="checkout" novalidate>
        <section class="card form-panel" aria-labelledby="rcp">
          <h2 class="t-h3" id="rcp">Дані отримувача</h2>
          <div class="form-row">${inputField(FIELDS[0])}${inputField(FIELDS[1])}</div>
          <div class="form-row">${inputField(FIELDS[2])}${inputField(FIELDS[3])}</div>
          <label class="toggle"><input type="checkbox" name="save" ${state.checkout.save ? 'checked' : ''}><span class="toggle__track"><span class="toggle__knob"></span></span><span>Зберегти дані для наступних замовлень</span></label>
        </section>
        <section class="card form-panel" aria-labelledby="shp">
          <h2 class="t-h3" id="shp">Відправлення</h2>
          <p class="t-body-s" style="color:var(--text-secondary)">Замовлення розбито на відправлення за продавцями: кожне доставляється окремо.</p>
          <div class="ship-grid">${shipments.map((s) => shipmentCard(s)).join('')}</div>
        </section>
      </form>
      <aside class="split__aside">${buildSummary(ev, { cta: 'Перейти до оплати', ctaAct: 'pay' })}</aside>
    </div>
  </main>`;
}

/* ---------- Orders ---------- */
let ordersFilter = 'all';
function screenOrders() {
  const o = state.order;
  if (!o) {
    return `<main class="page" id="main">
      ${pageTitle('Мої замовлення', 'Тут з’явиться статус кожного відправлення')}
      <div class="empty-area"><div class="card empty">
        <div class="empty__ill">${icon('truck', 32, 'ic-brand')}</div>
        <h2 class="t-h4">Замовлень ще немає</h2>
        <p class="t-body empty__text">Тут з’явиться статус кожного відправлення від кожного продавця.</p>
        ${btn('Перейти до збірки', { kind: 'secondary', act: 'go', attrs: 'data-arg="#/build"' })}
      </div></div>
    </main>`;
  }
  const active = (s) => s.status === 'processing' || s.status === 'shipped';
  const shown = o.shipments.map((s, i) => ({ s, i })).filter(({ s }) => ordersFilter === 'all' || (ordersFilter === 'active' ? active(s) : !active(s)));
  const chip = (id, label) => `<button type="button" class="chip" data-act="orders-filter" data-arg="${id}" aria-pressed="${ordersFilter === id}">${label}</button>`;
  return `<main class="page" id="main">
    ${pageTitle('Мої замовлення', `Замовлення №${o.id} від ${o.date} · ${o.shipments.length} ${plural(o.shipments.length, ['відправлення', 'відправлення', 'відправлень'])}`)}
    <div class="chips" role="group" aria-label="Фільтр відправлень">${chip('all', 'Усі відправлення')}${chip('active', 'Активні')}${chip('done', 'Завершені')}</div>
    <div class="ship-grid">${shown.map(({ s, i }) => shipmentCard(s, { action: true, idx: i })).join('') || '<p class="t-body" style="color:var(--text-secondary)">У цій групі відправлень немає.</p>'}</div>
  </main>`;
}

function screenNotFound() {
  return `<main class="page" id="main">${pageTitle('Сторінку не знайдено', 'Можливо, посилання застаріло.')}${btn('До збірки', { act: 'go', attrs: 'data-arg="#/build"' })}</main>`;
}

/* ==========================================================================
   Router + render
   ========================================================================== */
function route() {
  const h = location.hash.replace(/^#/, '') || '/build';
  const [, a, b] = h.split('/');
  return { name: a || 'build', arg: b ? decodeURIComponent(b) : '' };
}
const NAV_OF = { build: 'build', catalog: 'catalog', product: 'build', checkout: 'build', orders: 'orders' };

function render() {
  const r = route();
  // keep keyboard focus on the "same" control across re-renders
  const a = document.activeElement;
  let focusSel = null;
  if (a && a !== document.body) {
    if (a.id) focusSel = `#${CSS.escape(a.id)}`;
    else if (a.dataset && a.dataset.act) focusSel = `[data-act="${a.dataset.act}"]${a.dataset.arg ? `[data-arg="${CSS.escape(a.dataset.arg)}"]` : ''}`;
    else if (a.name && a.form) focusSel = `[data-form="${a.form.dataset.form}"] [name="${a.name}"]`;
  }
  let body;
  switch (r.name) {
    case 'build': body = screenBuild(); break;
    case 'catalog': body = screenCatalog(r.arg || 'cpu'); break;
    case 'product': body = screenProduct(r.arg, lastRoute.startsWith('catalog')); break;
    case 'checkout': body = screenCheckout(); break;
    case 'orders': body = screenOrders(); break;
    default: body = screenNotFound();
  }
  $('#app').innerHTML = header(NAV_OF[r.name]) + body;
  const titles = { build: 'Моя збірка', catalog: 'Каталог', product: 'Пропозиції', checkout: 'Оформлення', orders: 'Мої замовлення' };
  document.title = `${titles[r.name] || 'Pickpart'} — Pickpart`;
  if (focusSel) { const el = $(focusSel); if (el) el.focus({ preventScroll: true }); }
  renderProtoBar();
}

// remember the route we navigate *from* (used for «← До каталогу»)
let currentRouteName = route().name;
window.addEventListener('hashchange', () => {
  lastRoute = currentRouteName;
  currentRouteName = route().name;
  render();
  window.scrollTo(0, 0);
  const h1 = $('h1');
  if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
});

/* ==========================================================================
   Toast (one at a time; 5 s; errors stay until closed)
   ========================================================================== */
let toastTimer = 0;
const TOAST_ICON = { success: ['checkCircle', 'ic-compatible'], error: ['xCircle', 'ic-conflict'], offline: ['wifiOff', 'ic-secondary'], info: ['info', 'ic-info'] };
function toast(type, title, msg = '', action = null) {
  clearTimeout(toastTimer);
  const [ic, tone] = TOAST_ICON[type];
  $('#toasts').innerHTML = `<div class="toast" role="${type === 'error' ? 'alert' : 'status'}">
    ${icon(ic, 20, tone)}
    <div class="toast__body"><p class="toast__title">${esc(title)}</p>${msg ? `<p class="toast__msg">${esc(msg)}</p>` : ''}</div>
    ${action ? `<button type="button" class="toast__action" data-toast-action>${esc(action.label)}</button>` : ''}
    <button type="button" class="toast__close" data-toast-close aria-label="Закрити">${icon('close', 20, 'ic-secondary')}</button>
  </div>`;
  const el = $('#toasts .toast');
  el.querySelector('[data-toast-close]').onclick = closeToast;
  if (action) el.querySelector('[data-toast-action]').onclick = () => { closeToast(); action.run(); };
  if (type !== 'error') toastTimer = setTimeout(closeToast, 5000);
}
function closeToast() { clearTimeout(toastTimer); $('#toasts').innerHTML = ''; }

/* ==========================================================================
   Dialog (focus moves in and stays; Esc / × / «Скасувати» close)
   ========================================================================== */
let dialogReturn = null;
function dialog({ title, text, confirm, cancel = 'Скасувати', destructive = false, onConfirm }) {
  dialogReturn = document.activeElement;
  $('#dialogs').innerHTML = `<div class="scrim" data-scrim>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-d">
      <div class="dialog__head"><h2 class="t-h4 dialog__title" id="dlg-t">${esc(title)}</h2>
        <button type="button" class="dialog__close" data-dlg-close aria-label="Закрити">${icon('close', 24, 'ic-secondary')}</button></div>
      <p class="t-body dialog__text" id="dlg-d">${esc(text)}</p>
      <div class="dialog__actions">${btn(cancel, { kind: 'text', attrs: 'data-dlg-close' })}${btn(confirm, { kind: destructive ? 'secondary' : 'primary', attrs: 'data-dlg-ok' })}</div>
    </div></div>`;
  const root = $('#dialogs');
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); if (dialogReturn && dialogReturn.isConnected) dialogReturn.focus(); };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = [...root.querySelectorAll('button')];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  root.querySelectorAll('[data-dlg-close]').forEach((b) => (b.onclick = close));
  root.querySelector('[data-scrim]').onclick = (e) => { if (e.target === e.currentTarget) close(); };
  root.querySelector('[data-dlg-ok]').onclick = () => { close(); onConfirm(); };
  root.querySelector('[data-dlg-ok]').focus();
}

/* ==========================================================================
   Actions
   ========================================================================== */
function setPart(slot, pid, seller, { undoLabel = 'Додано до збірки' } = {}) {
  const before = clone(state.build);
  state.build[slot] = { pid, seller };
  save();
  toast('success', undoLabel, 'Перевіряємо сумісність усієї збірки', { label: 'Скасувати', run: () => { state.build = before; save(); recheck(); } });
}

const ACTIONS = {
  go: (el) => { location.hash = el.dataset.arg; },
  login: () => toast('info', 'Вхід з’явиться пізніше', 'Поки що збірка зберігається на цьому пристрої'),
  'save-build': () => toast('success', 'Збірку збережено', 'Вона залишиться на цьому пристрої', { label: 'Скасувати', run: () => toast('info', 'Збереження скасовано') }),
  checkout: () => { location.hash = '#/checkout'; },
  'suggest-mb': () => {
    const cur = part('motherboard');
    const cpu = part('cpu');
    const alt = productById['b650-eagle'];
    const altOffer = alt.offers[0];
    const diff = altOffer.price - cur.price;
    dialog({
      title: 'Замінити плату на сумісну?',
      text: `${cur.prod.name} буде замінено на ${alt.name} (${cpu.prod.socket}). Різниця в ціні: ${diff >= 0 ? '+' : '−'}${money(Math.abs(diff))}.`,
      confirm: 'Замінити плату',
      onConfirm: () => { setPart('motherboard', alt.id, altOffer.seller, { undoLabel: 'Плату замінено' }); recheck(); },
    });
  },
  'choose-offer': (el) => {
    const [pid, seller] = el.dataset.arg.split('|');
    const prod = productById[pid];
    const had = state.build[prod.slot];
    setPart(prod.slot, pid, seller, { undoLabel: had ? 'Компонент замінено' : 'Додано до збірки' });
    checking = true;
    location.hash = '#/build';
    recheck();
  },
  'remove-chip': (el) => {
    const fs = filterState(el.dataset.cat);
    const id = el.dataset.arg;
    if (id === 'price') fs.price = false;
    else if (id === 'q') fs.q = '';
    else { fs.applied = fs.applied.filter((x) => x !== id); fs.pending = fs.pending.filter((x) => x !== id); }
    save(); render();
  },
  'reset-filters': (el) => {
    const fs = filterState(el.dataset.arg);
    fs.applied = []; fs.pending = []; fs.price = false; fs.q = '';
    save(); render();
  },
  pay: () => submitCheckout(),
  'cancel-shipment': (el) => {
    const sh = state.order.shipments[+el.dataset.arg];
    const sum = sh.parts.reduce((a, x) => a + x.price, 0);
    dialog({
      title: `Скасувати відправлення від ${sh.seller}?`,
      text: `${joinAnd(sh.parts.map((x) => x.name))} не буде відправлено. ${money(sum)} повернемо на картку, решта замовлення не зміниться.`,
      confirm: 'Скасувати відправлення', cancel: 'Залишити', destructive: true,
      onConfirm: () => { sh.status = 'cancelled'; save(); render(); toast('success', 'Відправлення скасовано', `Кошти ${money(sum)} повернемо протягом 1–3 днів`); },
    });
  },
  return: (el) => {
    const sh = state.order.shipments[+el.dataset.arg];
    toast('info', `Звернення надіслано ${sh.seller}`, 'Продавець відповість протягом доби');
  },
  'orders-filter': (el) => { ordersFilter = el.dataset.arg; render(); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});

/* Filters: checkboxes edit the pending set; «Показати N» applies it */
document.addEventListener('change', (e) => {
  const form = e.target.closest('[data-form="filters"]');
  if (form) {
    const fs = filterState(form.dataset.cat);
    fs.pending = [...form.querySelectorAll('input[type=checkbox]:checked')].map((i) => i.name);
    const n = applyFilters(form.dataset.cat, fs.pending, fs).length;
    form.querySelector('button[type=submit]').textContent = `Показати ${n}`;
    save();
    return;
  }
  if (e.target.name === 'save' && e.target.closest('[data-form="checkout"]')) { state.checkout.save = e.target.checked; save(); }
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form.dataset.form === 'filters') {
    e.preventDefault();
    const fs = filterState(form.dataset.cat);
    fs.applied = [...fs.pending];
    save(); render();
    $('.catalog__results')?.scrollIntoView({ block: 'nearest' });
  } else if (form.dataset.form === 'search') {
    e.preventDefault();
    const q = form.q.value.trim();
    if (!q) { form.q.focus(); return; }   // empty query isn't sent
    const ql = q.toLowerCase();
    const hit = PRODUCTS.find((x) => x.name.toLowerCase().includes(ql) || x.spec.toLowerCase().includes(ql));
    const cat = hit ? hit.slot : 'cpu';
    const fs = filterState(cat);
    fs.q = q; fs.applied = fs.applied.filter((x) => x !== 'compat'); fs.pending = [...fs.applied]; fs.price = false;
    save();
    if (location.hash === `#/catalog/${cat}`) render(); else location.hash = `#/catalog/${cat}`;
  } else if (form.dataset.form === 'checkout') {
    e.preventDefault();
    submitCheckout();
  }
});

/* Checkout validation: on blur, not on every keystroke; an error clears as soon as it's fixed */
function refreshField(f) {
  const wrap = document.querySelector(`[data-field="${f.id}"]`);
  if (!wrap) return;
  const err = fieldError(f);
  wrap.classList.toggle('is-error', !!err);
  const input = wrap.querySelector('input');
  if (err) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  wrap.querySelector('.input__helper').innerHTML = err ? icon('alertCircle', 16, 'ic-conflict') + esc(err) : esc(f.helper);
}
document.addEventListener('input', (e) => {
  const f = FIELDS.find((x) => x.id === e.target.name);
  if (!f || !e.target.closest('[data-form="checkout"]')) return;
  state.checkout[f.id] = e.target.value;
  save();
  if (state.checkout.touched[f.id] && !f.validate(e.target.value)) refreshField(f);   // clear immediately once valid
});
document.addEventListener('focusout', (e) => {
  const f = FIELDS.find((x) => x.id === e.target.name);
  if (!f || !e.target.closest('[data-form="checkout"]')) return;
  state.checkout.touched[f.id] = true;
  save();
  refreshField(f);
});

function submitCheckout() {
  FIELDS.forEach((f) => { state.checkout.touched[f.id] = true; refreshField(f); });
  save();
  const firstBad = FIELDS.find((f) => fieldError(f));
  if (firstBad) { document.getElementById(`f-${firstBad.id}`).focus(); return; }
  const b = document.querySelector('[data-act="pay"]');
  b.classList.add('is-loading');
  b.setAttribute('aria-disabled', 'true');
  b.innerHTML = `${icon('spinner', 20, 'spin')}Перейти до оплати`;
  setTimeout(() => {
    const ev = evaluate();
    state.order = { ...ORDER_META, shipments: groupBySeller(ev).map((s) => ({ ...s, status: DEMO_SHIP_STATUS[s.seller] || 'processing' })) };
    save();
    ordersFilter = 'all';
    location.hash = '#/orders';
    toast('success', `Замовлення №${ORDER_META.id} оформлено`, 'Статус кожного відправлення — на цій сторінці');
  }, 1200);
}

/* ==========================================================================
   Prototype scenario switcher (not part of the product UI)
   ========================================================================== */
function renderProtoBar() {
  const bar = $('#proto');
  if (bar.dataset.ready) return;
  bar.dataset.ready = '1';
  bar.innerHTML = `<details>
    <summary>Прототип · сценарії</summary>
    <div class="proto__body">
      ${Object.entries(SCENARIOS).map(([id, s]) => `<button type="button" data-scenario="${id}">${s.label}</button>`).join('')}
      <button type="button" data-scenario="ordered">Оформлене замовлення</button>
      <button type="button" data-scenario="reset">Скинути все</button>
    </div></details>`;
  bar.addEventListener('click', (e) => {
    const id = e.target.dataset && e.target.dataset.scenario;
    if (!id) return;
    closeToast();
    if (id === 'reset') { state = freshState(); state.build = {}; save(); location.hash = '#/build'; render(); return; }
    if (id === 'ordered') {
      state.build = clone(SCENARIOS.ready.build);
      state.order = { ...ORDER_META, shipments: groupBySeller(evaluate()).map((s) => ({ ...s, status: DEMO_SHIP_STATUS[s.seller] || 'processing' })) };
      save(); ordersFilter = 'all'; location.hash = '#/orders'; render(); return;
    }
    state.build = clone(SCENARIOS[id].build);
    save();
    if (location.hash !== '#/build') location.hash = '#/build'; else render();
  });
}

render();
