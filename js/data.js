// Mock data. Every product, price, seller and message that appears in the Figma
// «Ключові екрани» frames is reproduced verbatim; the few extra catalog items only
// exist so that filters, replacements and the empty/conflict flows have something to act on.

export const BUDGET = 55000;
export const DELIVERY_PER_SELLER = 90;   // 4 продавці → 360 ₴ (Figma Build summary)
export const REQUIRED_PSU_W = 550;

/** Build slots, in the order of Figma frame «2. Моя збірка — конфлікт». */
export const SLOTS = [
  { id: 'cpu',         label: 'Процесор',            acc: 'процесор',            icon: 'cpu',         catalogTitle: 'Процесори',             empty: ['Оберіть процесор', 'Можна почати з будь-якого компонента'] },
  { id: 'motherboard', label: 'Материнська плата',   acc: 'материнську плату',   icon: 'motherboard', catalogTitle: 'Материнські плати',     empty: ['Оберіть материнську плату', 'Можна почати з будь-якого компонента'] },
  { id: 'ram',         label: 'Оперативна пам’ять',  acc: 'оперативну пам’ять',  icon: 'ram',         catalogTitle: 'Оперативна пам’ять',    empty: ['Оберіть оперативну пам’ять', 'Можна почати з будь-якого компонента'] },
  { id: 'gpu',         label: 'Відеокарта',          acc: 'відеокарту',          icon: 'gpu',         catalogTitle: 'Відеокарти',            empty: ['Оберіть відеокарту', 'Можна почати з будь-якого компонента'] },
  { id: 'drive',       label: 'Накопичувач',         acc: 'накопичувач',         icon: 'drive',       catalogTitle: 'Накопичувачі',          empty: ['Оберіть накопичувач', 'Можна почати з будь-якого компонента'] },
  { id: 'cooler',      label: 'Кулер',               acc: 'кулер',               icon: 'cooler',      catalogTitle: 'Кулери',                empty: ['Оберіть кулер', 'Можна почати з будь-якого компонента'] },
  { id: 'case',        label: 'Корпус',              acc: 'корпус',              icon: 'case',        catalogTitle: 'Корпуси',               empty: ['Оберіть корпус', 'Можна почати з будь-якого компонента'] },
  { id: 'psu',         label: 'Блок живлення',       acc: 'блок живлення',       icon: 'psu',         catalogTitle: 'Блоки живлення',        empty: ['Оберіть блок живлення', `Потрібен від ${REQUIRED_PSU_W} Вт для цієї збірки`] },
];
export const slotById = Object.fromEntries(SLOTS.map((s) => [s.id, s]));

/** Sellers. `offerDelivery` is shown on Offer rows, `shipDelivery` on Shipment cards (as in Figma). */
export const SELLERS = {
  TechLviv:  { name: 'TechLviv',  offerDelivery: 'Нова Пошта · 1–2 дні', shipDelivery: 'Нова Пошта · 2–3 дні', rating: '4.9' },
  PCBox:     { name: 'PCBox',     offerDelivery: 'Нова Пошта · 2–3 дні', shipDelivery: 'Нова Пошта · 2–3 дні', rating: '4.7' },
  ЧіпМаркет: { name: 'ЧіпМаркет', offerDelivery: 'Нова Пошта · 3–4 дні', shipDelivery: 'Нова Пошта · 3–4 дні', rating: '4.8' },
  Компік:    { name: 'Компік',    offerDelivery: 'Нова Пошта · 2–3 дні', shipDelivery: 'Нова Пошта · 2–3 дні', rating: '4.6' },
};

/*
 * Products. `spec` is what the catalog row shows, `meta(seller)` what the slot card shows.
 * offers: [{ seller, price, sub, best?, unavailable?, noSpecs? }]
 *   noSpecs → the seller didn't publish the data needed for a check → slot becomes «Не перевірено».
 */
const p = (o) => o;
export const PRODUCTS = [
  // ---------- Процесори (Figma «4. Каталог — процесори» + «5. Компонент — пропозиції») ----------
  p({ id: 'r5-7600', slot: 'cpu', name: 'AMD Ryzen 5 7600', short: 'Ryzen 5 7600', socket: 'AM5', cores: 6,
      spec: 'AM5 · 6 ядер · 65 Вт', detail: 'AM5 · 6 ядер · 12 потоків · 65 Вт', metaBase: 'AM5 · 6 ядер · 65 Вт',
      offers: [
        { seller: 'TechLviv', price: 7199, sub: 'безкоштовна доставка', best: true },
        { seller: 'PCBox', price: 7349, sub: '+ 90 ₴ доставка' },
        { seller: 'Компік', unavailable: true },
      ] }),
  p({ id: 'r5-8400f', slot: 'cpu', name: 'AMD Ryzen 5 8400F', short: 'Ryzen 5 8400F', socket: 'AM5', cores: 6, best: true,
      spec: 'AM5 · 6 ядер · 65 Вт', detail: 'AM5 · 6 ядер · 12 потоків · 65 Вт', metaBase: 'AM5 · 6 ядер · 65 Вт',
      offers: [
        { seller: 'PCBox', price: 5899, sub: '+ 90 ₴ доставка', best: true },
        { seller: 'TechLviv', price: 5999, sub: 'безкоштовна доставка' },
        { seller: 'ЧіпМаркет', price: 6049, sub: '+ 90 ₴ доставка' },
      ] }),
  p({ id: 'r7-7700', slot: 'cpu', name: 'AMD Ryzen 7 7700', short: 'Ryzen 7 7700', socket: 'AM5', cores: 8,
      spec: 'AM5 · 8 ядер · 65 Вт', detail: 'AM5 · 8 ядер · 16 потоків · 65 Вт', metaBase: 'AM5 · 8 ядер · 65 Вт',
      offers: [
        { seller: 'TechLviv', price: 9999, sub: 'безкоштовна доставка', best: true },
        { seller: 'PCBox', price: 10199, sub: '+ 90 ₴ доставка' },
      ] }),
  p({ id: 'r5-9600x', slot: 'cpu', name: 'AMD Ryzen 5 9600X', short: 'Ryzen 5 9600X', socket: 'AM5', cores: 6,
      spec: 'AM5 · 6 ядер · 65 Вт', detail: 'AM5 · 6 ядер · 12 потоків · 65 Вт', metaBase: 'AM5 · 6 ядер · 65 Вт',
      offers: [
        { seller: 'PCBox', price: 9499, sub: '+ 90 ₴ доставка', best: true },
        { seller: 'TechLviv', price: 9599, sub: 'безкоштовна доставка' },
        { seller: 'ЧіпМаркет', price: 9649, sub: '+ 90 ₴ доставка' },
        { seller: 'Компік', price: 9699, sub: '+ 90 ₴ доставка' },
      ] }),
  p({ id: 'r7-9700x', slot: 'cpu', name: 'AMD Ryzen 7 9700X', short: 'Ryzen 7 9700X', socket: 'AM5', cores: 8,
      spec: 'AM5 · 8 ядер · 65 Вт', detail: 'AM5 · 8 ядер · 16 потоків · 65 Вт', metaBase: 'AM5 · 8 ядер · 65 Вт',
      offers: [{ seller: 'TechLviv', unavailable: true }, { seller: 'PCBox', unavailable: true }] }),
  p({ id: 'r9-7900x', slot: 'cpu', name: 'AMD Ryzen 9 7900X', short: 'Ryzen 9 7900X', socket: 'AM5', cores: 12,
      spec: 'AM5 · 12 ядер · 170 Вт', detail: 'AM5 · 12 ядер · 24 потоки · 170 Вт', metaBase: 'AM5 · 12 ядер · 170 Вт',
      offers: [{ seller: 'PCBox', price: 14999, sub: '+ 90 ₴ доставка', best: true }, { seller: 'TechLviv', price: 15199, sub: 'безкоштовна доставка' }] }),
  p({ id: 'i5-14400f', slot: 'cpu', name: 'Intel Core i5-14400F', short: 'Core i5-14400F', socket: 'LGA1700', cores: 10,
      spec: 'LGA1700 · 10 ядер · 65 Вт', detail: 'LGA1700 · 10 ядер · 16 потоків · 65 Вт', metaBase: 'LGA1700 · 10 ядер · 65 Вт',
      offers: [{ seller: 'ЧіпМаркет', price: 6899, sub: '+ 90 ₴ доставка', best: true }, { seller: 'PCBox', price: 6999, sub: '+ 90 ₴ доставка' }] }),

  // ---------- Материнські плати ----------
  p({ id: 'b650-eagle', slot: 'motherboard', name: 'Gigabyte B650 Eagle AX', short: 'B650 Eagle AX', socket: 'AM5',
      spec: 'AM5 · DDR5 · ATX', detail: 'AM5 · DDR5 · ATX · Wi‑Fi 6E', metaBase: 'AM5 · DDR5 · ATX',
      offers: [{ seller: 'ЧіпМаркет', price: 6499, sub: '+ 90 ₴ доставка', best: true }, { seller: 'TechLviv', price: 6699, sub: 'безкоштовна доставка' }] }),
  p({ id: 'b760m-ds3h', slot: 'motherboard', name: 'Gigabyte B760M DS3H', short: 'Gigabyte B760M', socket: 'LGA1700',
      spec: 'LGA1700 · DDR4 · mATX', detail: 'LGA1700 · DDR4 · mATX', metaBase: 'LGA1700 · DDR4',
      offers: [{ seller: 'ЧіпМаркет', price: 4299, sub: '+ 90 ₴ доставка', best: true }, { seller: 'PCBox', price: 4399, sub: '+ 90 ₴ доставка' }] }),
  p({ id: 'a620m', slot: 'motherboard', name: 'ASUS Prime A620M-K', short: 'Prime A620M-K', socket: 'AM5',
      spec: 'AM5 · DDR5 · mATX', detail: 'AM5 · DDR5 · mATX', metaBase: 'AM5 · DDR5 · mATX',
      offers: [{ seller: 'TechLviv', price: 3799, sub: 'безкоштовна доставка', best: true }] }),

  // ---------- Пам’ять ----------
  p({ id: 'fury-32', slot: 'ram', name: 'Kingston Fury Beast 32 ГБ', short: 'Fury Beast 32 ГБ',
      spec: 'DDR5 · 6000 МГц · 2×16 ГБ', detail: 'DDR5 · 6000 МГц · 2×16 ГБ · CL36', metaBase: 'DDR5 · 6000 МГц',
      offers: [{ seller: 'TechLviv', price: 5899, sub: 'безкоштовна доставка', best: true }, { seller: 'PCBox', price: 5999, sub: '+ 90 ₴ доставка' }] }),
  p({ id: 'flare-32', slot: 'ram', name: 'G.Skill Flare X5 32 ГБ', short: 'Flare X5 32 ГБ',
      spec: 'DDR5 · 6000 МГц · 2×16 ГБ', detail: 'DDR5 · 6000 МГц · 2×16 ГБ · CL30', metaBase: 'DDR5 · 6000 МГц',
      offers: [{ seller: 'PCBox', price: 6299, sub: '+ 90 ₴ доставка', best: true }] }),

  // ---------- Відеокарти ----------
  p({ id: 'rtx5060-ventus', slot: 'gpu', name: 'MSI GeForce RTX 5060 Ventus 2X', short: 'RTX 5060 Ventus 2X',
      spec: '8 ГБ GDDR7 · 145 Вт', detail: '8 ГБ GDDR7 · 2 слоти · 145 Вт', metaBase: '8 ГБ GDDR7 · 145 Вт',
      offers: [{ seller: 'PCBox', price: 21199, sub: '+ 90 ₴ доставка', best: true }, { seller: 'TechLviv', price: 21499, sub: 'безкоштовна доставка' }] }),
  p({ id: 'rtx5060ti-16', slot: 'gpu', name: 'GeForce RTX 5060 Ti 16 ГБ', short: 'RTX 5060 Ti',
      spec: '16 ГБ GDDR7 · 180 Вт', detail: '2 слоти · 240 мм · 180 Вт', metaBase: '2 слоти · 240 мм · 180 Вт',
      offers: [{ seller: 'PCBox', price: 21499, sub: '+ 90 ₴ доставка', best: true }] }),

  // ---------- Накопичувачі ----------
  p({ id: '990evo-1tb', slot: 'drive', name: 'Samsung 990 EVO 1 ТБ', short: '990 EVO 1 ТБ',
      spec: 'NVMe M.2 · PCIe 4.0', detail: 'NVMe M.2 · PCIe 4.0 · до 5000 МБ/с', metaBase: 'NVMe M.2 · PCIe 4.0',
      offers: [{ seller: 'PCBox', price: 4099, sub: '+ 90 ₴ доставка', best: true }, { seller: 'Компік', price: 4199, sub: '+ 90 ₴ доставка' }] }),
  p({ id: 'nv3-1tb', slot: 'drive', name: 'Kingston NV3 1 ТБ', short: 'NV3 1 ТБ',
      spec: 'M.2 NVMe · PCIe 4.0', detail: 'M.2 NVMe · PCIe 4.0', metaBase: 'M.2 NVMe · PCIe 4.0',
      offers: [{ seller: 'Компік', price: 3099, sub: '+ 90 ₴ доставка', best: true }] }),

  // ---------- Кулери ----------
  p({ id: 'ak400', slot: 'cooler', name: 'DeepCool AK400', short: 'AK400', height: 155,
      spec: 'висота 155 мм · AM5', detail: 'баштовий · висота 155 мм · AM5 / LGA1700', metaBase: 'висота 155 мм',
      offers: [{ seller: 'ЧіпМаркет', price: 1449, sub: '+ 90 ₴ доставка', best: true }, { seller: 'PCBox', price: 1499, sub: '+ 90 ₴ доставка' }] }),
  p({ id: 'se224', slot: 'cooler', name: 'ID-Cooling SE-224-XTS', short: 'SE-224-XTS', height: 150,
      spec: 'висота 150 мм · AM5', detail: 'баштовий · висота 150 мм · AM5 / LGA1700', metaBase: 'висота 150 мм',
      offers: [{ seller: 'PCBox', price: 1099, sub: '+ 90 ₴ доставка', best: true }] }),

  // ---------- Корпуси ----------
  p({ id: 'corvo-c3', slot: 'case', name: 'Corvo C3 Airflow', short: 'Corvo C3', clearance: 157,
      spec: 'ATX · кулер до 157 мм', detail: 'ATX · кулер до 157 мм · 3 вентилятори', metaBase: 'ATX · кулер до 157 мм',
      noSpecsMeta: 'немає даних про допуск кулера',
      unverifiedMsg: 'Продавець корпусу не вказав допуск висоти кулера.',
      offers: [
        { seller: 'Компік', price: 2799, sub: '+ 90 ₴ доставка', noSpecs: true },
        { seller: 'PCBox', price: 2849, sub: '+ 90 ₴ доставка', best: true },
      ] }),
  p({ id: 'air903', slot: 'case', name: 'Montech AIR 903 Base', short: 'AIR 903', clearance: 180,
      spec: 'E-ATX · кулер до 180 мм', detail: 'E-ATX · кулер до 180 мм · 3 вентилятори', metaBase: 'E-ATX · кулер до 180 мм',
      offers: [{ seller: 'PCBox', price: 3499, sub: '+ 90 ₴ доставка', best: true }] }),

  // ---------- Блоки живлення ----------
  p({ id: 'bq-650', slot: 'psu', name: 'be quiet! Pure Power 650 Вт', short: 'Pure Power 650', watts: 650,
      spec: '650 Вт · 80+ Gold', detail: '650 Вт · 80+ Gold · модульний', metaBase: '650 Вт · 80+ Gold',
      offers: [{ seller: 'Компік', price: 3899, sub: '+ 90 ₴ доставка', best: true }, { seller: 'PCBox', price: 3999, sub: '+ 90 ₴ доставка' }] }),
  p({ id: 'proton-750', slot: 'psu', name: 'Chieftec Proton 750 Вт', short: 'Proton 750', watts: 750,
      spec: '750 Вт · 80+ Bronze', detail: '750 Вт · 80+ Bronze', metaBase: '750 Вт · 80+ Bronze',
      offers: [{ seller: 'PCBox', price: 3599, sub: '+ 90 ₴ доставка', best: true }] }),
  p({ id: 'vp-500', slot: 'psu', name: 'Gamemax VP-500 500 Вт', short: 'VP-500', watts: 500,
      spec: '500 Вт · 80+ Bronze', detail: '500 Вт · 80+ Bronze', metaBase: '500 Вт · 80+ Bronze',
      offers: [{ seller: 'Компік', price: 1599, sub: '+ 90 ₴ доставка', best: true }] }),
];
export const productById = Object.fromEntries(PRODUCTS.map((x) => [x.id, x]));

/* Catalog filters per category. `chip` = label shown above results when applied. */
export const FILTERS = {
  cpu: [
    { id: 'compat', label: 'Лише сумісні з моєю збіркою' },
    { id: 'am5', label: 'Сокет AM5', chip: 'Сокет AM5', test: (x) => x.socket === 'AM5' },
    { id: 'cores6', label: '6 ядер і більше', chip: '6+ ядер', test: (x) => x.cores >= 6 },
    { id: 'stock', label: 'Є в наявності', chip: 'Є в наявності', test: (x) => x.offers.some((o) => !o.unavailable) },
  ],
  motherboard: [
    { id: 'compat', label: 'Лише сумісні з моєю збіркою' },
    { id: 'ddr5', label: 'Пам’ять DDR5', chip: 'DDR5', test: (x) => /DDR5/.test(x.spec) },
    { id: 'stock', label: 'Є в наявності', chip: 'Є в наявності', test: (x) => x.offers.some((o) => !o.unavailable) },
  ],
  psu: [
    { id: 'compat', label: 'Лише сумісні з моєю збіркою' },
    { id: 'gold', label: '80+ Gold', chip: '80+ Gold', test: (x) => /Gold/.test(x.spec) },
    { id: 'stock', label: 'Є в наявності', chip: 'Є в наявності', test: (x) => x.offers.some((o) => !o.unavailable) },
  ],
};
export const DEFAULT_FILTERS = { cpu: ['compat', 'am5'], motherboard: ['compat'], psu: ['compat'] };
export const PRICE_CAP = { cpu: 10000 };   // chip «до 10 000 ₴» (Figma)
export const genericFilters = [
  { id: 'compat', label: 'Лише сумісні з моєю збіркою' },
  { id: 'stock', label: 'Є в наявності', chip: 'Є в наявності', test: (x) => x.offers.some((o) => !o.unavailable) },
];

/* Demo scenarios (Figma frames). build: slot → { pid, seller } */
export const SCENARIOS = {
  empty: { label: 'Порожня збірка', build: {} },
  conflict: {
    label: 'Збірка з конфліктом',
    build: {
      cpu: { pid: 'r5-7600', seller: 'TechLviv' },
      motherboard: { pid: 'b760m-ds3h', seller: 'ЧіпМаркет' },
      ram: { pid: 'fury-32', seller: 'TechLviv' },
      gpu: { pid: 'rtx5060-ventus', seller: 'PCBox' },
      drive: { pid: '990evo-1tb', seller: 'PCBox' },
      cooler: { pid: 'ak400', seller: 'ЧіпМаркет' },
      case: { pid: 'corvo-c3', seller: 'Компік' },
    },
  },
  ready: {
    label: 'Готова збірка',
    build: {
      cpu: { pid: 'r5-7600', seller: 'TechLviv' },
      motherboard: { pid: 'b650-eagle', seller: 'ЧіпМаркет' },
      ram: { pid: 'fury-32', seller: 'TechLviv' },
      gpu: { pid: 'rtx5060-ventus', seller: 'PCBox' },
      drive: { pid: '990evo-1tb', seller: 'PCBox' },
      cooler: { pid: 'ak400', seller: 'ЧіпМаркет' },
      case: { pid: 'corvo-c3', seller: 'Компік' },
      psu: { pid: 'bq-650', seller: 'Компік' },
    },
  },
};

/* Shipment status per seller for the demo order (Figma «7. Мої замовлення»). */
export const DEMO_SHIP_STATUS = { TechLviv: 'shipped', PCBox: 'processing', ЧіпМаркет: 'delivered', Компік: 'cancelled' };
export const ORDER_META = { id: 1048, date: '3 листопада 2026' };
