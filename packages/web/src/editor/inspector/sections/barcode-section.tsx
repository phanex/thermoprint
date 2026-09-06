import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { Section, Field, TextInput, Select } from "../fields.tsx";
import {
  BARCODE_FORMAT_OPTIONS,
  normalizeBarcodeContent,
  getBarcodeFormatTooltip,
  getBarcodeFormatHint,
} from "../../../lib/barcode-utils.ts";

interface Props {
  element: BaseElement;
}

export function BarcodeSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);

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

  const handleFormatChange = (newFormat: string) => {
    const newContent = normalizeBarcodeContent(currentContent, newFormat);
    update({ format: newFormat, content: newContent });
  };

  return (
    <Section title="Barcode">
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
