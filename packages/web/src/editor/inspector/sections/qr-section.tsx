import { useState, useRef } from "react";
import { CalendarClock, Hash } from "lucide-react";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { Section, Field, TextInput, Select } from "../fields.tsx";
import { DateDropdown } from "../dropdowns/date-dropdown.tsx";
import { FieldsDropdown } from "../dropdowns/fields-dropdown.tsx";

interface Props {
  element: BaseElement;
}

export function QrSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [fieldsMenuOpen, setFieldsMenuOpen] = useState(false);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const fieldsBtnRef = useRef<HTMLButtonElement>(null);

  const p = element.props as {
    content?: string;
    errorCorrectionLevel?: string;
  };

  const update = (patch: Record<string, unknown>) =>
    updateElement(element.id, { props: patch });

  const insertToken = (token: string) => {
    update({ content: (p.content || "") + token });
  };

  const eccLevel = p.errorCorrectionLevel || "M";
  const eccWidth =
    eccLevel === "H"
      ? "100%"
      : eccLevel === "Q"
        ? "75%"
        : eccLevel === "M"
          ? "50%"
          : "25%";

  return (
    <Section
      title="QR Code"
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
        <TextInput
          value={p.content || ""}
          onChange={(v) => update({ content: v })}
        />
      </Field>
      <div className="mt-1.5">
        <Field label="ECC">
          <Select
            value={eccLevel}
            onChange={(v) => update({ errorCorrectionLevel: v })}
            options={[
              { value: "L", label: "Low (7%)" },
              { value: "M", label: "Medium (15%)" },
              { value: "Q", label: "Quartile (25%)" },
              { value: "H", label: "High (30%)" },
            ]}
          />
        </Field>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-ui-xs text-ink-400">
        <div className="flex-1 h-1 rounded-full bg-ink-800 overflow-hidden">
          <div className="h-full bg-accent" style={{ width: eccWidth }} />
        </div>
        <span className="font-mono">{(p.content || "").length} chars</span>
      </div>
    </Section>
  );
}
