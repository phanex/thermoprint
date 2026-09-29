import { useState, useRef } from "react";
import { CalendarClock, Hash } from "lucide-react";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { Section, Field, TextInput, Select } from "../fields.tsx";
import {
  BARCODE_FORMAT_OPTIONS,
  normalizeBarcodeContent,
  getBarcodeFormatTooltip,
  getBarcodeFormatHint,
} from "../../../lib/barcode-utils.ts";
import { DateDropdown } from "../dropdowns/date-dropdown.tsx";
import { FieldsDropdown } from "../dropdowns/fields-dropdown.tsx";

interface Props {
  element: BaseElement;
}

export function BarcodeSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [fieldsMenuOpen, setFieldsMenuOpen] = useState(false);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const fieldsBtnRef = useRef<HTMLButtonElement>(null);

  const p = element.props as {
    content?: string;
    format?: string;
    displayValue?: boolean;
    pixelPerfect?: boolean;
  };

  const currentFormat = p.format || "CODE128";
  const currentContent = p.content ?? "1234567890";

  const update = (patch: Record<string, unknown>) =>
    updateElement(element.id, { props: patch });

  const insertToken = (token: string) => {
    update({ content: (p.content || "") + token });
  };

  const handleFormatChange = (newFormat: string) => {
    const newContent = normalizeBarcodeContent(currentContent, newFormat);
    update({ format: newFormat, content: newContent });
  };

  return (
    <Section
      title="Barcode"
      action={
        <div className="flex items-center gap-2">
          <button
            ref={dateBtnRef}
            type="button"
            onClick={() => {
              setDateMenuOpen((o) => !o);
              setFieldsMenuOpen(false);
            }}
            className="text-[11px] font-mono text-accent hover:text-accent-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Date presets & syntax"
          >
            <CalendarClock size={13} />
            <span>Date</span>
          </button>

          <button
            ref={fieldsBtnRef}
            type="button"
            onClick={() => {
              setFieldsMenuOpen((o) => !o);
              setDateMenuOpen(false);
            }}
            className="text-[11px] font-mono text-accent hover:text-accent-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Counters & CSV fields"
          >
            <Hash size={13} />
            <span>Fields</span>
          </button>
        </div>
      }
    >
      {dateMenuOpen && (
        <DateDropdown
          triggerRef={dateBtnRef}
          onClose={() => setDateMenuOpen(false)}
          onSelect={insertToken}
        />
      )}

      {fieldsMenuOpen && (
        <FieldsDropdown
          triggerRef={fieldsBtnRef}
          onClose={() => setFieldsMenuOpen(false)}
          onSelect={insertToken}
        />
      )}
      <Field label="Data">
        <div title={getBarcodeFormatTooltip(currentFormat)}>
          <TextInput
            value={p.content ?? ""}
            onChange={(v) => update({ content: v })}
          />
          <div className="mt-1 px-0.5 text-ui-2xs text-ink-400">
            {getBarcodeFormatHint(currentFormat)}
          </div>
        </div>
      </Field>

      <div className="mt-2">
        <Field label="Format">
          <Select
            value={currentFormat}
            onChange={handleFormatChange}
            options={BARCODE_FORMAT_OPTIONS}
          />
        </Field>
      </div>

      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="barcode-show-value"
            checked={p.displayValue ?? true}
            onChange={(e) => update({ displayValue: e.target.checked })}
            className="accent-accent"
          />
          <label
            htmlFor="barcode-show-value"
            className="text-ui-sm text-ink-300 cursor-pointer select-none"
          >
            Show value below bars
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="barcode-pixel-perfect"
            checked={!!p.pixelPerfect}
            onChange={(e) => update({ pixelPerfect: e.target.checked })}
            className="accent-accent"
          />
          <label
            htmlFor="barcode-pixel-perfect"
            className="text-ui-sm text-ink-300 cursor-pointer select-none"
          >
            Snap to pixel-perfect
          </label>
        </div>
      </div>
    </Section>
  );
}
