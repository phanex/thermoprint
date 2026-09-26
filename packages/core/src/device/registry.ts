import type { DeviceProfile } from "./types.js";
import { markP15Profile } from "./profiles/mark-p15.js";
import { markP12Profile } from "./profiles/mark-p12.js";
import { markM60Profile } from "./profiles/mark-m60.js";
import { phoP12Profile } from "./profiles/pho-p12.js";

const devices: DeviceProfile[] = [];

export interface DeviceMatchContext {
  hasCx?: boolean;
  hardwareId?: number;
}

export function registerDevice(profile: DeviceProfile): void {
  devices.push(profile);
}

export function findDeviceByName(
  name: string,
  context?: DeviceMatchContext,
): DeviceProfile | null {
  const trimmed = name.trim();

  // 1. Declarative identification via RegExp and hardware/GATT markers
  for (const profile of devices) {
    if (!profile.identification) continue;
    const { namePattern, hasCx, hardwareId } = profile.identification;

    if (!namePattern.test(trimmed)) continue;

    // If GATT context (CX characteristic presence) is provided, verify match
    if (context?.hasCx !== undefined && hasCx !== undefined) {
      if (context.hasCx !== hasCx) continue;
    }

    // If hardware ID is provided, verify match
    if (context?.hardwareId !== undefined && hardwareId !== undefined) {
      if (context.hardwareId !== hardwareId) continue;
    }

    return profile;
  }

  // 2. Fallback prefix-based matching for unmigrated profiles
  const upperName = trimmed.toUpperCase();
  let bestMatch: { profile: DeviceProfile; prefixLen: number } | null = null;

  for (const profile of devices) {
    if (!profile.namePrefixes) continue;
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
registerDevice(phoP12Profile);
registerDevice(markP12Profile);
registerDevice(markP15Profile);
registerDevice(markM60Profile);


