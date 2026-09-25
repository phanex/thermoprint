import type { DeviceProfile } from "./types.js";
import { markP15Profile } from "./profiles/mark-p15.js";
import { markP12Profile } from "./profiles/mark-p12.js";
import { markM60Profile } from "./profiles/mark-m60.js";
import { phoP12Profile } from "./profiles/pho-p12.js";

const devices: DeviceProfile[] = [];

export function registerDevice(profile: DeviceProfile): void {
  devices.push(profile);
}

export function findDeviceByName(name: string): DeviceProfile | null {
  const upperName = name.toUpperCase();
  let bestMatch: { profile: DeviceProfile; prefixLen: number } | null = null;

  for (const profile of devices) {
    for (const prefix of profile.namePrefixes) {
      const upperPrefix = prefix.toUpperCase();
      if (upperName.startsWith(upperPrefix)) {
        if (!bestMatch || upperPrefix.length > bestMatch.prefixLen) {
          bestMatch = { profile, prefixLen: upperPrefix.length };
        }
      }
    }
  }

  return bestMatch ? bestMatch.profile : null;
}

export function getDevice(modelId: string): DeviceProfile | null {
  return devices.find((d) => d.modelId === modelId) ?? null;
}

export function getRegisteredDevices(): DeviceProfile[] {
  return [...devices];
}

// Register built-in devices
registerDevice(markP15Profile);
registerDevice(markP12Profile);
registerDevice(markM60Profile);
registerDevice(phoP12Profile);


