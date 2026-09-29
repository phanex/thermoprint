# Dynamic Template Engine: Counters & CSV Fields

Full specification and documentation for the Thermoprint template engine.

---

## 1. Core Principle: Positional Stencil (Mask)

In thermal label printing and asset tagging, **floating-point decimal fractions do not exist**. Expressions like `1.01`, `1/01`, or `1,01` are not mathematical numbers, but **positional stencils (masks)** where non-numeric characters serve as fixed anchor slots, and embedded digits form an integer counter.

### How the Engine Evaluates a Stencil:
1. **Stencil Skeleton**: All non-digit characters (letters, hyphens, dots, commas, slashes, spaces, `#`, `№`) remain fixed at their original positions as an immutable skeleton.
2. **Digit Extraction**: All digits within the pattern are extracted into a single starting integer. Their count determines the **minimum padding width** (leading zeros).
3. **Integer Arithmetic**: The engine increments or decrements the extracted integer by the configured step for each subsequent printed label.
4. **Slot Refill**: The resulting number is formatted back into the original digit slots of the stencil skeleton.

### Examples in Practice:
- `SN-0001` → Skeleton `SN-____`, digits `0001` advance: `SN-0002`, `SN-0003`...
- `1.01` or `1/01` → Skeleton `_.__`, digits `101` become `102` (`1.02`), and after `1.99` naturally roll over to `2.00`!
- Arbitrary starting values: start from `1`, `100`, `050`, or `0001` — the exact expression entered prints on the 1st label (WYSIWYG).

---

## 2. Binary Syntax Separation

Expressions inside double curly braces `{{...}}` follow a strict binary rule:

| Expression | Type | Source | Examples |
|---|---|---|---|
| `{{#:...}}` | **Autonomous Counter** | Evaluated on every print step. Self-contained, **does NOT require CSV**. | `{{#:1}}`, `{{#:001}}`, `{{#:SN-001+5}}`, `{{#:100+-1}}` |
| `{{...}}` | **Table Column (CSV)** | Replaced with the corresponding column value from the loaded CSV/TSV file for that row. | `{{Field name}}`, `{{SKU}}`, `{{Price}}`, `{{Barcode}}` |

> [!NOTE]
> The colon in `{{#:` guarantees that if your spreadsheet has a column named `#` or `##` (e.g. row index in Excel), you can safely reference it as `{{#}}` or `{{##}}` without conflicting with counters.

---

## 3. Counter Anatomy: `{{#: pattern + step }}`

### 3.1. Padding and Leading Zeros
The number of digits in the starting value defines the minimum width:
- `{{#:1}}` ➔ `1`, `2`, `3` ... `9`, `10` (no padding)
- `{{#:01}}` ➔ `01`, `02`, `03` ... `99`, `100` (minimum 2 digits)
- `{{#:001}}` ➔ `001`, `002`, `003` ... `999`, `1000` (minimum 3 digits)
- `{{#:0001}}` ➔ `0001`, `0002` ... `9999`, `10000` (minimum 4 digits)

*Note: When a counter exceeds its initial digit count, it **does not truncate** — it naturally expands (`99` ➔ `100`).*

### 3.2. Custom Start Value
Counters do not have to start at 1 or 0:
- `{{#:100}}` ➔ 1st label `100`, then `101`, `102`...
- `{{#:050}}` ➔ 1st label `050`, then `051`, `052`...
- `{{#:2026-001}}` ➔ 1st label `2026-001`, then `2026-002`...

### 3.3. Step and Direction (+ / +-)
- **Default**: `+1` increment when no operator is specified.
- **Custom Increment (`+N`)**:
  - `{{#:1+5}}` ➔ `1`, `6`, `11`, `16`...
  - `{{#:000+10}}` ➔ `000`, `010`, `020`, `030`...
- **Countdown / Decrement (`+-N`)**:
  - `{{#:100+-1}}` ➔ `100`, `99`, `98`...
  - `{{#:05+-1}}` ➔ `05`, `04`, `03`, `02`, `01`, `00`.
  - **Zero-Guard Print Halt**: When counting down, reaching `< 0` **immediately halts printing**. Thermal printers never produce negative labels.

> [!IMPORTANT]
> Why `+-` instead of a plain minus `-`? A single hyphen `-` is a common text character in part numbers (`SN-001`) and dates (`2026-01`). To eliminate ambiguity between hyphens in names and subtraction, countdown sequences require `+-`.

---

## 4. Reference Table

| Expression | 1st Label | 2nd Label | 3rd Label | Behavior |
|---|---|---|---|---|
| `{{#:1}}` | `1` | `2` | `3` | Start at 1, step +1 |
| `{{#:0001}}` | `0001` | `0002` | `0003` | 4 digits with leading zeros |
| `{{#:100}}` | `100` | `101` | `102` | Start from 100 |
| `{{#:001+5}}` | `001` | `006` | `011` | Start at 001, step +5 |
| `{{#:100+-1}}` | `100` | `99` | `98` | Countdown (halts at 0) |
| `{{#:SN-0001}}` | `SN-0001` | `SN-0002` | `SN-0003` | Fixed `SN-` prefix |
| `{{#:1.01}}` | `1.01` | `1.02` | `1.03` | Hierarchical dot separator (rolls over 1.99 ➔ 2.00) |
| `{{#:1/01}}` | `1/01` | `1/02` | `1/03` | Slash separator (rolls over 1.99 ➔ 2.00) |
| `{{#:Box #01}}` | `Box #01` | `Box #02` | `Box #03` | Spaces and `#` preserved as text |
| `{{#:BOX-001-A}}` | `BOX-001-A` | `BOX-002-A` | `BOX-003-A` | Fixed prefix and suffix |
| `{{#:###}}` | `###1` | `###2` | `###3` | `#` is literal text, not a mask character |

---

## 5. Table Fields (CSV / TSV)

Syntax: **`{{Field name}}`**

Substitutes the runtime value from the matching column header of the loaded file:
- If column is `SKU` ➔ `{{SKU}}`
- If column is `Price` ➔ `{{Price}}`
- If column is `Barcode` ➔ use `{{Barcode}}` inside a Barcode or QR element

### Import Features:
1. **Auto Delimiter Detection**: Sniffs comma (`,`), semicolon (`;`), and tab (`\t`, TSV).
2. **RFC 4180 Escaping**: Full support for quoted fields containing commas or newlines (`"Text, with comma"`).
3. **UTF-8 BOM Stripping**: Excel UTF-8 CSV exports load cleanly without byte-order mark corruption.

---

## 6. Combining Variables

You can freely mix counters, CSV fields, static text, and date variables (`[[DD.MM.YYYY]]`) in any text, barcode, or QR code element:

```text
{{Category}} / #{{#:001}}
SKU: {{SKU}}
Date: [[DD.MM.YYYY]]
Price: {{Price}} EUR
```

Use the status bar `<` / `>` pagination controls to preview actual interpolated values live on canvas before printing.
