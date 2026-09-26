import { useEffect, useRef, useState } from "react";
import { Bluetooth, X } from "lucide-react";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { usePrinterStore } from "../../store/printer-store.ts";
import { useWebBluetooth } from "../../hooks/use-web-bluetooth.ts";
import { getDevice } from "@thermoprint/core";
import { DebugLogSection } from "./debug-log-section.tsx";

function PixelBattery({ battery, className }: { battery: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, battery));
  // 9px max fill width inside (x=2..11)
  const fillW = Math.max(pct > 0 ? 1.5 : 0, Math.round((pct / 100) * 9 * 2) / 2);

  return (
    <svg
      width="15"
      height="9"
      viewBox="0 0 15 9"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block" }}
    >
      {/* Shell: 1px stroke centered on 0.5 for crisp 1px borders */}
      <rect
        x="0.5"
        y="0.5"
        width="12"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1"
      />
      {/* Nub: 1px crisp filled block */}
      <rect
        x="13"
        y="3"
        width="1"
        height="3"
        rx="0.5"
        fill="currentColor"
      />
      {/* Charge fill */}
      {fillW > 0 && (
        <rect
          x="2"
          y="2"
          width={fillW}
          height="5"
          rx="0.5"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-400">{label}</span>
      <span className="text-ink-200 font-mono">{value}</span>
    </div>
  );
}

export function PrinterChip() {
  const printer = useEditorV2Store((s) => s.printer);
  const printFlyoutOpen = useEditorV2Store((s) => s.printFlyoutOpen);
  const battery = usePrinterStore((s) => s.battery);
  const peripheral = usePrinterStore((s) => s.peripheral);
  const isConnected = usePrinterStore((s) => s.isConnected);
  const isConnecting = usePrinterStore((s) => s.isConnecting);
  const isScanning = usePrinterStore((s) => s.isScanning);
  const error = usePrinterStore((s) => s.error);
  const deviceInfo = usePrinterStore((s) => s.deviceInfo);
  const modelId = usePrinterStore((s) => s.modelId);
  const { scanAndConnect, connect, disconnect } = useWebBluetooth();

  const [isManualOpen, setIsManualOpen] = useState(false);

  const profile = modelId ? getDevice(modelId) : null;
  const fullName = profile ? profile.name : (peripheral?.name || printer.name || "Printer");

  const ref = useRef<HTMLDivElement>(null);

  // Close flyout on outside click
  useEffect(() => {
    if (!printFlyoutOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsManualOpen(false);
        useEditorV2Store.setState({ printFlyoutOpen: false });
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [printFlyoutOpen]);

  // When neither connected nor connecting: show Connect button
  if (!peripheral && !isConnecting) {
    return (
      <button
        onClick={scanAndConnect}
        disabled={isScanning}
        className={`flex items-center gap-2 h-8 px-2 md:px-3 rounded-md border text-ui-sm font-semibold transition-colors ${
          isScanning
            ? "border-accent/40 bg-accent/15 text-accent animate-pulse cursor-wait"
            : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/15 hover-fade"
        }`}
      >
        <Bluetooth size={15} className={isScanning ? "animate-pulse" : ""} />
        <span className="hidden md:inline">
          {isScanning ? "Select printer..." : "Connect printer"}
        </span>
      </button>
    );
  }

  const isStandby = !isConnected && !isConnecting;
  const showBattery = profile?.hasBattery !== false && isConnected && battery >= 0 && battery <= 100;

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center rounded-md bg-ink-800 hover:bg-ink-750 border border-white/5 hover-fade">
        <button
          onClick={() => {
            setIsManualOpen(true);
            useEditorV2Store.setState((s) => ({
              printFlyoutOpen: !s.printFlyoutOpen,
            }));
          }}
          className="group flex items-center gap-2 px-2.5 h-8"
        >
          <span className="relative flex items-center justify-center w-3 h-3 shrink-0">
            {isConnecting ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </>
            ) : isStandby ? (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </>
            )}
          </span>
          {/* Mobile: just the name */}
          <span className="md:hidden text-ui-xs text-ink-100 font-medium truncate max-w-[80px]">
            {fullName}
          </span>
          {/* Desktop: full info */}
          <div className="hidden md:flex flex-col items-start leading-tight">
            <span
              className={`text-[10px] font-mono uppercase tracking-wider ${
                isConnecting
                  ? "text-accent animate-pulse"
                  : isStandby
                  ? "text-amber-400/70"
                  : "text-ink-400"
              }`}
            >
              {isConnecting ? "Connecting" : isStandby ? "Standby" : "Connected"}
            </span>
            <span className="text-ui-sm text-ink-100 font-medium leading-none mt-0.5">
              {fullName}
            </span>
          </div>
          {showBattery && (() => {
            const color =
              battery > 60
                ? "text-emerald-400"
                : battery > 20
                ? "text-yellow-400"
                : "text-red-400";
            return (
              <div className="hidden md:flex flex-col items-start justify-center pl-2 border-l border-white/10 leading-tight">
                <PixelBattery battery={battery} className={color} />
                <span className={`text-ui-xs font-mono leading-none mt-1 ${color}`}>
                  {battery}%
                </span>
              </div>
            );
          })()}
        </button>
        {(isConnected || isStandby) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              disconnect();
            }}
            className="flex items-center justify-center h-8 px-2 text-ink-400 hover:text-ink-100 border-l border-white/5 cursor-pointer"
            title="Disconnect printer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {printFlyoutOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed inset-x-2 top-14 max-h-[85vh] overflow-y-auto md:max-h-none md:overflow-visible md:inset-auto md:absolute md:left-0 md:top-10 md:w-80 bg-ink-850 border border-white/8 rounded-lg shadow-panel p-3.5 z-[60]"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-ink-50">
                {fullName}
              </div>
              <div className="text-ui-sm text-ink-400 mt-0.5 font-mono">
                {profile?.protocolId || "detecting..."} &middot; ID {peripheral?.id ? peripheral.id.slice(0, 8) : "—"}
              </div>
            </div>
            <button
              onClick={() => {
                setIsManualOpen(false);
                useEditorV2Store.setState({ printFlyoutOpen: false });
              }}
              className="text-ink-400 hover:text-ink-100 p-0.5"
            >
              <X size={16} />
            </button>
          </div>

          {error ? (
            <div className="flex items-center mb-3 px-2.5 py-1.5 rounded-md border text-ui-sm font-medium bg-red-400/10 border-red-400/20 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          ) : isConnecting ? (
            <div className="flex items-center mb-3 px-2.5 py-1.5 rounded-md border text-ui-sm font-medium bg-accent/10 border-accent/20 text-accent animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mr-2 shrink-0" />
              Connecting to printer...
            </div>
          ) : isStandby ? (
            <div className="flex items-center mb-3 px-2.5 py-1.5 rounded-md border text-ui-sm font-medium bg-amber-400/10 border-amber-400/20 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2 shrink-0" />
              Standby
            </div>
          ) : (
            <div className="flex items-center justify-between mb-3 px-2.5 py-1.5 rounded-md border text-ui-sm font-medium bg-emerald-400/10 border-emerald-400/20 text-emerald-400">
              <div className="flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 shrink-0" />
                Ready
              </div>
              {showBattery && (
                <div className="flex items-center pl-2 border-l border-emerald-400/20">
                  <PixelBattery battery={battery} className="mr-1.5" />
                  <span>{battery}%</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5 text-ui-sm mb-3">
            <MiniRow label="Firmware" value={deviceInfo.firmware || "—"} />
            <MiniRow label="Serial" value={deviceInfo.serial || "—"} />
          </div>

          <DebugLogSection hideActions={!isManualOpen || isConnecting} />

          <div className="mt-3 pt-3 border-t border-white/5">
            {isConnecting ? (
              <button
                onClick={disconnect}
                className="w-full h-7 rounded-md bg-ink-800 hover:bg-ink-750 border border-white/5 text-ui-sm text-ink-300 hover:text-ink-100"
              >
                Cancel
              </button>
            ) : isStandby ? (
              <div className="flex gap-2">
                <button
                  onClick={() => peripheral && connect(peripheral)}
                  className="flex-1 h-7 rounded-md bg-accent/15 hover:bg-accent/25 border border-accent/30 text-ui-sm font-medium text-accent"
                >
                  Reconnect
                </button>
                <button
                  onClick={disconnect}
                  className="h-7 px-3 rounded-md bg-ink-800 hover:bg-ink-750 border border-white/5 text-ui-sm text-ink-400 hover:text-ink-100"
                >
                  Forget
                </button>
              </div>
            ) : (
              <button
                onClick={disconnect}
                className="w-full h-7 rounded-md bg-ink-800 hover:bg-ink-750 border border-white/5 text-ui-sm text-ink-300 hover:text-ink-100"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
