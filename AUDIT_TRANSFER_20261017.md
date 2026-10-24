# Thermoprint — Audit Transfer Report (2026-10-17)
> Для передачі в Antigravity / інший агент. Згенеровано Muse Spark Open 816B Promo (read-only аудит).

## 0. Мета і контекст перевірки
Користувач попросив ретельний аудит форку `phanex/thermoprint` (ориг. `tomLadder/thermoprint`) з фокусом на:
- повну перевірку коду (ядро + web + cli),
- валідацію Conductor SDD (чи можна його юзати),
- Bluetooth-стек перетягнутий з проєкту `phomymo` для другого принтера (Phomemo P12) — зараз є регресія "принтер перестав конектитись".

**Принцип користувача:** `працює — не чіпай` для BLE, якщо немає живого тесту на залізі. Всі BLE-фікси — тільки ізольовано, по одному, з логами з реального P12/Marklife.

**Що перевірено:** 3 паралельні глибокі агенти пройшли:
- `packages/core/src` (printer.ts, flow-control.ts, image/*, template/*, protocol/*, device/*) + 11 тестів
- `packages/web/src` (editor-store.ts, printer-store.ts, canvas/*, inspector/*, lib/*, hooks/use-web-bluetooth.ts, transport/web-bluetooth.ts, label/dynamic-label.ts)
- `packages/cli/src` (commands/*, transport/noble.ts, render/*, image/load.ts, store/config.ts) + root/monorepo/conductor/docs

**Покриття:** ~85-90% ключової логіки. Не лізли глибоко в Iconify/font fetching, Vite config деталі, CSS токени — там ризики низькі.

---

## 1. Conductor SDD — чи можна юзати? ТАК

**Структура наявна і валідна:**
```
conductor/index.md
conductor/product.md
conductor/product-guidelines.md
conductor/tech-stack.md
conductor/workflow.md (8-кроковий Standard Task Workflow)
conductor/tracks.md (реєстр 7 треків, 6×[x] + 1×[ ] codebase_hardening_20261016)
conductor/tracks/<slug>/spec.md + plan.md + index.md (+ metadata.json у частини)
conductor/code_styleguides/{typescript,html-css,general}.md
```

**Активний трек:** `conductor/tracks/codebase_hardening_20261016` — відмінна таксономія 22 багів по Tier 1/2/3. Це і має бути Source of Truth.

**Але є 4 невідповідності що зламають онбординг нового агента, треба пофіксити P0:**
1. `conductor/workflow.md:1` каже "The Plan is Source of Truth: `plan.md`" — але факту `plan.md` в корені немає, працює `tracks.md` → `tracks/<slug>/plan.md`. Оновити workflow.md під track-модель.
2. `conductor/tech-stack.md` застарів: пише `Yarn Workspaces + L11 only`, фактично `Bun + pho-p12/mark-l11/mark-x2`, немає `sharp/noble/zustand/zundo/konva/tailwind4/fflate`.
3. `conductor/code_styleguides/*.md` не енфорсяться: вимагають `'` а код на `"`, забороняють `default export` а `vite.config.ts` на ньому. ESLint не покриває.
4. `.gitignore` ігнорує `.agents/` та `GEMINI.md`, але `conductor/index.md` на них посилається — новий клон не побачить скіли. Варіанти: комітити або перенести в `conductor/skills/`.

**Висновок:** SDD юзабельний прямо зараз. Агент має читати `tracks.md` → брати наступний `[ ]` з `plan.md` → `Mark In Progress [~]` → TDD → browser/hardware verify → CHANGELOG → atomic commit → git notes → `[x]`.

---

## 2. Monorepo / Build — 🔴 КРИТИКА (P0 перед будь-яким код-фіксом)

| Проблема | Файли | Фікс |
|----------|-------|------|
| **3 локфайли одночасно:** `bun.lock` (канон, в гіті) + `package-lock.json` (221KB stray, в .gitignore) + `yarn.lock` нема, хоча `package.json:packageManager` = `yarn@1.22.22`. CI юзає `bun`, локально хтось поставить `npm install` → різні `sharp/noble/libvips`. | `package.json:7`, `.gitignore`, `bun.lock`, `package-lock.json` | Видалити `package-lock.json`, видалити `.yarn/cache`, виставити `packageManager: bun` або прибрати поле, оновити `workflow.md` з `yarn --cwd` → `bun --filter` |
| **CLI не публікується:** `main/bin → src/index.ts` з `#!/usr/bin/env bun` | `packages/cli/package.json:3-6`, `packages/cli/src/index.ts:1` | `main: dist/index.js`, `bin: dist/index.js`, `#!/usr/bin/env node`, додати `build: tsc` |
| **Core не зібраний:** `exports → src/index.ts` працює тільки в Bun | `packages/core/package.json:3` | `exports → dist/index.js` + build |
| **Версії роз'їхались:** README `0.2.0` vs core/cli `0.1.0` vs web `0.0.0` | `README.md:32`, `packages/*/package.json` | Синхронізувати, тегнути `0.2.0` |
| `@thermoprint/core: "*"` має бути `workspace:*` | `packages/cli/package.json`, `packages/web/package.json:33` | Замінити |
| CI лінтує тільки `core` | `.github/workflows/ci.yml` | Додати `web` + `cli` typecheck |
| `tech-stack.md` бреше про Yarn | `conductor/tech-stack.md` | Оновити |

---

## 3. Bluetooth — чому "перестав конектитись" (гіпотези)

Користувач: Bluetooth перетягнутий з `phomymo` під другий принтер (P12). Можливо "правильна" робота була до цього.

**Ймовірні причини регресії (в порядку вірогідності):**
1. **GX-стек переїхав з таймінгами під X2/M60, але P12 має іншу ініціалізацію (6-пакетна `1F 11 38...` в `packages/core/src/protocol/pho-p12/commands.ts:7-23`) + інший GATT (`ff00/ff02/ff03` в `device/profiles/pho-p12.ts`). Якщо P12-профіль не підхоплюється `findDeviceByName` (RegExp `pho-p12.ts:identification` з негативним lookahead `^(?!.*_ble$)`) — падає на fallback і шле L11 команди → мовчанка/таймаут.
2. **RX subscribe 2s timeout в `packages/core/src/printer.ts:115` + `web-bluetooth.ts:33` `write()` fallback** — на Windows WinRT CCCD дескриптор не резолвиться → раніше був `expectsAck=false` write-only шлях, зараз може рвати конекшн.
3. **B06 3s stall:** `pho-p12/protocol.ts:55` `buildModelQuery()` шле `getFirmware` а `printer.ts:298` чекає `type:"model"` → 3с стопор на кожному конекті. Якщо до phomymo цього не було — це воно.
4. **B08 3s `waitForDeviceReady`:** `web-bluetooth.ts:266` — 3с слип коли `watchAdvertisements` unsupported (десктоп Chrome). Раніше могло бути 0с.
5. **B02 DataView slicing:** `web-bluetooth.ts:68` `new Uint8Array(buf)` без offset → сміття з пулу → `parseResponse` не матчить → батарея/статус не приходять → UI показує "Connecting" вічно.

**Рекомендація користувача вірна:** не чіпати BLE масово. Фіксити тільки ізольовано по Tier 3, кожен з логами з живого P12 (як в `CHANGELOG.md:240-243` верифікація keep-alive 4.5хв).

---

## 4. Підтверджені баги з codebase_hardening_20261016/spec.md (22 шт)

### Tier 1 Safe Canvas (0 ризику заліза):
- **B04** `canvas.tsx:787-809` marquee без rotation → `getElementBounds(el)` — **ПІДТВЕРДЖЕНО**, критично
- **B05** `use-element-drag.ts:101-111` trailing click зносить мультиселекшн — **користувач відхилив**, працює норм → пропускаємо
- **B13** `dynamic-label.ts:18,80` line на Y=0 false-positive — **користувач залишив як фічу** (паркінг-зона)
- **B14** `transform-section.tsx:16-25` alignment без врахування rotation — **ПОФІКШЕНО** в CHANGELOG:33, але треба перевірити
- **B15** `fields.tsx:140` NumInput NaN/0 — **користувач відхилив**, поведінка ок
- **B16** `editor.tsx:96-103` handles в thumbnails — **ПОФІКШЕНО** (ховають overlay)

### Tier 2 State/Template:
- **B10** `use-web-bluetooth.ts:49` + `printer-store.ts:47-74` applyModelDefaults затирає канву — **ПІДТВЕРДЖЕНО**, треба guard `if(elements.length>0) skip`
- **B11** `editor-store.ts:627` paperType не в Zundo partialize → Ctrl+Z ламає режим — **ПІДТВЕРДЖЕНО**
- **B12** `template-engine.ts:99-143` decimals тільки по start → `{{#:1+0.5}}` губить `.0` — **ПІДТВЕРДЖЕНО**
- **B03** `editor.tsx:185-215` + `barcode-element.tsx:139` + `qr-element.tsx:63` Image.onload race → barcode відстає на 1 — **ПІДТВЕРДЖЕНО**
- **B17** `library.ts:48` QuotaExceededError — **ПІДТВЕРДЖЕНО**, мовчки губить дані

### Tier 3 BLE/Protocol (тільки з залізом):
- **B06** `pho-p12/protocol.ts:55` + `printer.ts:293` 3s model query stall — **ПІДТВЕРДЖЕНО**
- **B08** `web-bluetooth.ts:266` 3s waitForDeviceReady — **ПІДТВЕРДЖЕНО**
- **B01** `printer.ts:441` zombie polling timer — **ПІДТВЕРДЖЕНО**
- **B02** `web-bluetooth.ts:68` DataView slicing — **ПІДТВЕРДЖЕНО**, критично
- **B09** `printer.ts:179` немає concurrency guard — **ПІДТВЕРДЖЕНО**
- **B18** `flow-control.ts:65` packetDelayMs 0 → 30ms — **ПІДТВЕРДЖЕНО**

---

## 5. Додаткові знахідки аудитора (поза 22 багами)

### Core (`packages/core/src`):
- **CRITICAL** `printer.ts:139-143` CX subscribe failure не робить `connection.disconnect()` → витік BLE конекшну
- **CRITICAL** `printer.ts:335` `disconnect()` — якщо `rx.unsubscribe()` кине, `cx` + `connection` не відпишуться → `Promise.allSettled` треба
- **HIGH** `printer.ts:312` keepAlive `setInterval(async)` без м'ютекса — два `getBattery()` паралельно → FIFO `pendingResponses` mismatch
- **HIGH** `flow-control.ts:65` `packetSize=0` → `chunkSize=0` → infinite loop 0-byte пакетів (немає guard)
- **HIGH** `printer.ts:43` `!cx → isUnmetered=Infinity` — якщо CX не знайшли через GATT глік, мовчки флудить без кредитів, треба throw
- **MEDIUM** `printer.ts:232` `Math.max(packetDelayMs??20,40)` форсить 40ms всім профілям, ігнорує `mark-m60:1ms`
- **MEDIUM** `printer.ts:298` `getModel()` для pho-p12 декодить `[02,b6,00]` як строку → `"\u0002¶\u0000"` garbage
- **MEDIUM** `template-engine.ts:80` `stepRaw "0" → parseInt 0 ||1 =1` — крок 0 неможливий (маскується)
- **LOW** `printer-connect.test.ts:60,71,82` `expect(...).rejects.toThrow()` без `await` — false positive тестів

### Web (`packages/web/src`):
- **HIGH** `store/editor-store.ts: S-08` `scheduleDynamicFit(600)` + звиклий `set()` → два Zundo entries на один keystroke (контент + auto-fit) → треба 2×Ctrl+Z
- **HIGH** `store/editor-store.ts: S-05` `applyModelDefaults` `widthMm=max(len,tape)` `heightMm=min(len,tape)` ламає портретні die-cut (квадрат → фліп)
- **HIGH** `canvas/canvas.tsx: C-09` Text auto-measure → `updateElement({width})` → `scheduleDynamicFit` → shift всіх елементів → re-measure → потенційний ping-pong на CJK/emoji
- **HIGH** `editor/inspector/sections/multi-transform-section.tsx: I-06` `totalGaps = span - totalW` може бути від'ємним → distribute розкидає на `x=-500` (потім sanitize в 0 — втрата)
- **CRITICAL** `lib/library.ts: L-01` quota не обробляється — юзер бачить "Saved" а дані пропали
- **MEDIUM** `lib/range-parser.ts: L-07` `start` не клампиться до `maxLimit` → `15-20` при `max=10` дає `[]` як "Invalid range" без пояснення
- **MEDIUM** `lib/date-format.ts: L-10` `m` мапиться в `month`, не `minute` → `[[HH:mm +45m]]` додає 45 місяців, не хвилин
- **MEDIUM** `editor/editor.tsx:beforeunload` тільки `preventDefault()` без `e.returnValue=""` → Chrome не покаже prompt, можна втратити роботу

### CLI (`packages/cli/src`):
- **HIGH** `transport/noble.ts` `removeAllListeners("stateChange"/"discover")` зносить чужі лісенери, ламає конкурентні скани → `off(handler)` + instance `peripheralMap`
- **HIGH** `render/element-renderers.ts: renderLine` `x2=width y2=height` діагональ замість `y2=0` горизонталь (web: `points=[0,0,width,0]`) — WYSIWYG зламаний
- **HIGH** `render/element-renderers.ts: renderImage` + `template-schema.ts` немає клампу `label.widthMm 10..200` → `9999mm` → OOM
- **HIGH** `image/load.ts` `sharp(filePath)` двічі → подвійний I/O + лок файлу на Windows
- **MEDIUM** `cli/commands/*` `findPrinter` скопійовано 4×, `PrintOptions` дублюється, `process.exit()` всередині action ламає тести → винести в `src/cli/utils/`
- **SECURITY** `renderImage` arbitrary file read без allowlist → AI-генерений JSON може злити `/etc/passwd`

---

## 6. Що ще не перевірено / наступні кроки

**Не аудитили глибоко:** Iconify fetching батч-API, `fonts.ts` queryLocalFonts, `vite.config.ts`/`tailwind.config.ts` токени, `selection-handles.tsx` (legacy dead code).

**Чи можу я все пофіксити?** Так, але тільки атомарно по workflow.md:
1. **Фаза P0** (без заліза): root build/monorepo, tech-stack/docs, DataView slice (B02) — але B02 це Tier3, треба з залізом, тому відкладаємо якщо "працює не чіпай". Замість нього в P0: тільки доки + Zundo + quota + distribute guard.
2. **Фаза Tier1** (тільки браузер): B04 marquee + перевірка B14
3. **Фаза Tier2** (юніт-тести): B11/B12/B10/B03/B17
4. **Фаза Tier3** (по одному з live логами): B02, B01, B09, B06, B08, B18

**Кожен крок:** `Mark [~] → Red test → Green → Refactor → Browser/Hardware verify → CHANGELOG ## [Unreleased] → atomic commit + git notes → Mark [x] + commit plan`. Жодного `git push` без твого `пуш`.

**Для Antigravity:** передай цей файл + `conductor/tracks/codebase_hardening_20261016/spec.md` + `plan.md` + `GEMINI.md`. Новий агент має старт з `conductor/tracks.md` і взяти наступний `[ ]` в `plan.md`.

---
*Кінець звіту. Наступна дія — чекаю твоєї команди: `погнали P0 доки` або `погнали B04 marquee` або `залишаємо BLE як є`.*
