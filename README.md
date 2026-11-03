# Pickpart: interactive prototype (ЛМВ, лаб. 3)

A clickable desktop-web prototype of **Pickpart**, a PC builder with whole-build compatibility checks. It's built from the Figma file «ЛМВ лаб.3» (page «Ключові екрани») and the Lab 3 report.

## Run

ES modules need to be served over HTTP. `file://` won't work.

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. It's plain HTML, CSS and JS, so there's no build step and no dependencies. The layout is fixed to the 1440 px desktop frame from Figma.

## Screens (Figma frame → route)

| Figma frame | Route |
| --- | --- |
| 1. Моя збірка — порожня | `#/build` (empty build) |
| 2. Моя збірка — конфлікт | `#/build` (scenario «Збірка з конфліктом») |
| 3. Заміна несумісної плати | «Показати сумісні плати» → dialog |
| 4. Каталог — процесори | `#/catalog/cpu` (also `motherboard`, `psu`, `cooler`, …) |
| 5. Компонент — пропозиції продавців | `#/product/r5-7600` |
| 6. Оформлення — доставка і дані | `#/checkout` |
| 7. Мої замовлення | `#/orders` |

The **«Прототип · сценарії»** switcher (bottom-left) jumps straight to the empty, conflict, ready or ordered states. It isn't part of the product UI.

## What's interactive

- **Compatibility check (report §12.1).** It runs on the whole build after every change. Slots switch to the Loading skeleton and the panel to Checking, then each slot gets a badge and border colour. Covered states: Conflict (CPU socket ≠ board socket), Nuance (cooler 155 mm vs case 157 mm), Unverified (the seller didn't publish specs), and an undersized PSU.
- **Build summary.** Ready, Incomplete and Conflict states. The order button is disabled whenever there's a reason, and the reason is shown.
- **Catalog filtering (§12.2).** Checkboxes change the count on «Показати N» before you apply them. Applied filters become removable chips, «Скинути фільтри» clears everything, and there's an empty state when nothing matches.
- **Offers.** Picking an offer adds or replaces the component. The toast includes «Скасувати» (undo).
- **Checkout validation (§12.3).** Fields are validated on blur, and an error clears as soon as it's fixed. «Далі»/«Перейти до оплати» moves focus to the first invalid field, and the button shows a loading state.
- **Orders.** Shipments are grouped by seller and filtered with chips (Усі / Активні / Завершені). You can cancel a shipment (destructive dialog) or start a return.
- **Dialogs.** Focus trap, Esc, × and «Скасувати» all work. Toasts show one at a time for 5 s, and error toasts stay until closed.

## Design fidelity

- `css/tokens.css` holds every colour, spacing, radius and text-style value, copied 1:1 from the Figma variables (collections *Primitives*, *Color*, *Spacing*) and text styles. They match report sections 5–7.
- The fonts are Inter (400/600/700/800) and Manrope (700/800), self-hosted in `fonts/` (Fontsource, OFL) so the prototype renders the same offline.
- The icons in `js/icons.js` are the Figma `Icon/*` components exported as SVG. The only change is `stroke="currentColor"`, so each icon takes its `icon/*` or `status/*` token the same way the Figma instances do.
- Effects (dialog/toast shadows, the 55 % neutral-900 scrim), component paddings and sizes all come from the Figma nodes.

## Structure

```
index.html
css/  fonts.css · tokens.css · components.css · screens.css
js/   app.js (router, state, compatibility engine, screens) · data.js (mock data) · icons.js
fonts/
```
