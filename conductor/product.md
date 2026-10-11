# Product Definition: Thermoprint

## Overview
Thermoprint — це сучасна відкрита веб-платформа та модульний рушій для візуального дизайну етикеток і бездрайверного друку на портативних Bluetooth-термопринтерах (Phomemo, Marklife) напряму з браузера.

## Value Propositions
1. **Zero-Driver Web Bluetooth**: Пряме бездротове підключення через Web Bluetooth API з браузерів на базі Chromium (Chrome, Edge, Opera) без системних драйверів, хмарних реєстрацій чи фірмових мобільних додатків.
2. **Platform-Agnostic Core (`@thermoprint/core`)**: Ізольоване ядро на чистому TypeScript з підтримкою dependency injection для BLE-транспортів (Web Bluetooth, Noble, react-native-ble-plx), credit-based flow control та растрового пайплайну (Floyd-Steinberg dithering, thresholding, 1bpp bit-packing).
3. **Гнучкий WYSIWYG редактор (`@thermoprint/web`)**: 
   - Полотно на базі React 19 та Konva.
   - Підтримка неперервної стрічки (автоматичне масштабування довжини під контент із маркерами відрізу) та фіксованих етикеток (die-cut).
   - Багатий набір елементів: адаптивна типографіка (Google Fonts), штрихкоди (EAN-13, CODE-128, UPC), QR-коди, векторні іконки через Iconify, фігури та довільні зображення.
4. **Динамічні змінні та пакетний друк (Batch Printing)**:
   - Автономні лічильники (`{{#:001}}`), дати/часові мітки зі зсувами (`[[+7d]]`).
   - Прив'язка даних до колонок із CSV/TSV файлів (`{{Column}}`) для масового маркування.
5. **Локальність і конфіденційність**: Повна автономність, збереження шаблонів у LocalStorage та експорт/імпорт JSON/ZIP проектів.

## Supported Hardware & Protocols
- **Моделі**:
  - Phomemo P12 (`pho-p12`)
  - Marklife P15 (`mark-p15`)
  - Marklife P12 (`mark-p12`)
  - Marklife X2 (`mark-x2`)
  - Marklife M60 (`mark-m60`)
- **Протоколи**:
  - `pho-p12`
  - `mark-l11`
  - `mark-x2`

## Target Audience
- Мейкери, радіоаматори, інженери та розробники, яким потрібен швидкий локальний або скриптований друк етикеток.
- Малий бізнес, склади та майстерні (маркування деталей, штрихкодування, інвентаризація).
- Користувачі домашньої організації (підпис коробок, кабелів, банок, контейнерів).
