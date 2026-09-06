import JsBarcode from "jsbarcode";

let isEanPatched = false;
export function patchJsBarcodeEan13() {
  if (isEanPatched) return;
  try {
    const EAN13 = (JsBarcode as any).getModule?.("EAN13");
    if (!EAN13 || !EAN13.prototype) return;

    const EanProto = Object.getPrototypeOf(EAN13.prototype);
    if (EanProto && EanProto.encodeGuarded) {
      const origEan = EanProto.encodeGuarded;
      EanProto.encodeGuarded = function () {
        if (!this.options.flat && this.options.fontSize) {
          this.fontSize = Math.min(this.options.fontSize, Math.round(this.options.width * 12.5));
        }
        this.guardHeight =
          this.options.guardHeight ??
          (this.options.height + (this.fontSize - Math.round(this.fontSize * 0.15)) + (this.options.textMargin || 0));
        return origEan.call(this);
      };
    }

    const orig13 = EAN13.prototype.encodeGuarded;
    EAN13.prototype.encodeGuarded = function () {
      const data = orig13.call(this);
      if (
        this.options.displayValue &&
        Array.isArray(data) &&
        data.length > 0 &&
        data[0].text === this.text.substr(0, 1)
      ) {
        data[0].data = "000000";
        data[0].options = { textAlign: "center", fontSize: this.fontSize };
      }
      return data;
    };
    isEanPatched = true;
  } catch {}
}

patchJsBarcodeEan13();

export function calculateEanChecksum(digits12: string): number {
  const sum = digits12
    .slice(0, 12)
    .split("")
    .map(Number)
    .reduce((s, d, i) => s + (i % 2 === 1 ? d * 3 : d), 0);
  return (10 - (sum % 10)) % 10;
}

export function calculateEan8Checksum(digits7: string): number {
  const sum = digits7
    .slice(0, 7)
    .split("")
    .map(Number)
    .reduce((s, d, i) => s + (i % 2 === 0 ? d * 3 : d), 0);
  return (10 - (sum % 10)) % 10;
}

export function calculateUpcChecksum(digits11: string): number {
  const sum = digits11
    .slice(0, 11)
    .split("")
    .map(Number)
    .reduce((s, d, i) => s + (i % 2 === 0 ? d * 3 : d), 0);
  return (10 - (sum % 10)) % 10;
}

export function calculateItf14Checksum(digits13: string): number {
  const sum = digits13
    .slice(0, 13)
    .split("")
    .map(Number)
    .reduce((s, d, i) => s + (i % 2 === 0 ? d * 3 : d), 0);
  return (10 - (sum % 10)) % 10;
}

export function normalizeBarcodeContent(content: string, format: string): string {
  const raw = String(content ?? "").trim();
  const digits = raw.replace(/\D/g, "");

  switch (format) {
    case "EAN13": {
      const d = (digits || "123456789012").slice(0, 12).padEnd(12, "0");
      return d + calculateEanChecksum(d);
    }
    case "EAN8": {
      const d = (digits || "1234567").slice(0, 7).padEnd(7, "0");
      return d + calculateEan8Checksum(d);
    }
    case "UPC": {
      const d = (digits || "01234567890").slice(0, 11).padEnd(11, "0");
      return d + calculateUpcChecksum(d);
    }
    case "ITF14": {
      const d = (digits || "1234567890123").slice(0, 13).padEnd(13, "0");
      return d + calculateItf14Checksum(d);
    }
    case "ITF": {
      let d = digits || "1234567890";
      if (d.length % 2 !== 0) d = "0" + d;
      return d;
    }
    case "CODE39": {
      const cleaned = raw.toUpperCase().replace(/[^0-9A-Z \-\.\$\/\+\%]/g, "");
      return cleaned || "1234567890";
    }
    case "CODE128":
    default:
      return raw || "1234567890";
  }
}

export function isValidBarcodeContent(content: string, format: string): boolean {
  const raw = String(content ?? "").trim();

  switch (format) {
    case "EAN13":
      return /^\d{12,13}$/.test(raw);
    case "EAN8":
      return /^\d{7,8}$/.test(raw);
    case "UPC":
      return /^\d{11,12}$/.test(raw);
    case "ITF14":
      return /^\d{13,14}$/.test(raw);
    case "ITF":
      return /^\d+$/.test(raw) && raw.length % 2 === 0;
    case "CODE39":
      return /^[0-9A-Z \-\.\$\/\+\%]+$/i.test(raw);
    case "CODE128":
    default:
      return /^[\x00-\x7F]+$/.test(raw);
  }
}

export function getBarcodeFormatTooltip(format: string): string {
  switch (format) {
    case "EAN13":
      return "12 of 13 digits (last checksum digit is calculated automatically)";
    case "EAN8":
      return "7 of 8 digits (last checksum digit is calculated automatically)";
    case "UPC":
      return "11 of 12 digits (last checksum digit is calculated automatically)";
    case "ITF14":
      return "13 of 14 digits (last checksum digit is calculated automatically)";
    case "ITF":
      return "Numeric digits only (even number of digits)";
    case "CODE39":
      return "Uppercase letters, digits, and - . $ / + %";
    case "CODE128":
    default:
      return "ASCII characters (letters, digits, symbols)";
  }
}

export function getBarcodeFormatHint(format: string): string {
  switch (format) {
    case "EAN13":
      return "12 digits (+1 auto)";
    case "EAN8":
      return "7 digits (+1 auto)";
    case "UPC":
      return "11 digits (+1 auto)";
    case "ITF14":
      return "13 digits (+1 auto)";
    case "ITF":
      return "Digits only (even count)";
    case "CODE39":
      return "A–Z, 0–9, and - . $ / + %";
    case "CODE128":
    default:
      return "Any text or numbers";
  }
}

export const BARCODE_FORMAT_OPTIONS = [
  { value: "CODE128", label: "CODE 128" },
  { value: "EAN13", label: "EAN-13" },
  { value: "EAN8", label: "EAN-8" },
  { value: "UPC", label: "UPC-A" },
  { value: "CODE39", label: "CODE 39" },
  { value: "ITF", label: "ITF" },
  { value: "ITF14", label: "ITF-14" },
];
