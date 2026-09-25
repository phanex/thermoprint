import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as cmd from "../../src/protocol/pho-p12/commands.js";
import { PhoP12Protocol } from "../../src/protocol/pho-p12/protocol.js";
import { findDeviceByName, getDevice } from "../../src/device/registry.js";
import { FlowController } from "../../src/transport/flow-control.js";
import type { ImageBitmap1bpp } from "../../src/protocol/types.js";
import type { BleCharacteristic } from "../../src/transport/types.js";

describe("Phomemo P12 Commands", () => {
  it("initSequence returns 6 packets matching soburi protocol", () => {
    const seq = cmd.initSequence();
    assert.equal(seq.length, 6);
    assert.deepEqual(Array.from(seq[0].data), [0x1f, 0x11, 0x38]);
    assert.deepEqual(Array.from(seq[1].data), [
      0x1f, 0x11, 0x11, 0x1f, 0x11, 0x12, 0x1f, 0x11, 0x09, 0x1f, 0x11, 0x13,
    ]);
    assert.deepEqual(Array.from(seq[2].data), [0x1f, 0x11, 0x09]);
    assert.deepEqual(Array.from(seq[3].data), [
      0x1f, 0x11, 0x19, 0x1f, 0x11, 0x11,
    ]);
    assert.deepEqual(Array.from(seq[4].data), [0x1f, 0x11, 0x19]);
    assert.deepEqual(Array.from(seq[5].data), [0x1f, 0x11, 0x07]);
  });

  it("printBitmap builds ESC @ + GS v 0 0 + 16-bit LE dimensions + pixels", () => {
    const pixels = new Uint8Array([0xaa, 0x55, 0xff, 0x00]);
    const image: ImageBitmap1bpp = {
      data: pixels,
      width: 16,
      height: 2,
      bytesPerRow: 2,
    };

    const command = cmd.printBitmap(image);
    assert.equal(command.label, "print-bitmap");
    assert.equal(command.bulk, true);

    const header = Array.from(command.data.subarray(0, 10));
    assert.deepEqual(header, [
      0x1b, 0x40,           // ESC @
      0x1d, 0x76, 0x30, 0x00, // GS v 0 0
      0x02, 0x00,           // widthBytes = 2 (LE)
      0x02, 0x00,           // height = 2 (LE)
    ]);

    const payload = Array.from(command.data.subarray(10));
    assert.deepEqual(payload, [0xaa, 0x55, 0xff, 0x00]);
  });

  it("feed command is ESC d 13 (1B 64 0D) marked bulk", () => {
    const f = cmd.feed();
    assert.deepEqual(Array.from(f.data), [0x1b, 0x64, 0x0d]);
    assert.equal(f.bulk, true);
  });
});

describe("Phomemo P12 Protocol", () => {
  const protocol = new PhoP12Protocol();

  it("has id 'pho-p12' and expectsAck = false", () => {
    assert.equal(protocol.id, "pho-p12");
    assert.equal(protocol.expectsAck, false);
  });

  it("buildPrintSequence includes init sequence, raster data, and 2x feed", () => {
    const image: ImageBitmap1bpp = {
      data: new Uint8Array(12),
      width: 96,
      height: 1,
      bytesPerRow: 12,
    };

    const commands = protocol.buildPrintSequence(image, { density: 3 });
    // 6 init + 1 density + 1 bitmap + 2 feeds = 10 commands
    assert.equal(commands.length, 10);
    assert.equal(commands[0].label, "init-1");
    assert.equal(commands[5].label, "init-6");
    assert.equal(commands[6].label, "set-density");
    assert.equal(commands[7].label, "print-bitmap");
    assert.equal(commands[8].label, "feed");
    assert.equal(commands[9].label, "feed");
  });

  it("parseResponse decodes battery levels", () => {
    const full = protocol.parseResponse(new Uint8Array([0x1a, 0x04, 0xa1]));
    assert.equal(full?.type, "battery");
    assert.equal(full?.value, 100);

    const half = protocol.parseResponse(new Uint8Array([0x1a, 0x04, 0xa2]));
    assert.equal(half?.value, 50);

    const low = protocol.parseResponse(new Uint8Array([0x1a, 0x04, 0xa3]));
    assert.equal(low?.value, 30);

    const critical = protocol.parseResponse(new Uint8Array([0x1a, 0x04, 0xa4]));
    assert.equal(critical?.value, 10);
  });

  it("parseResponse decodes cover status", () => {
    const open = protocol.parseResponse(new Uint8Array([0x1a, 0x05, 0x98]));
    assert.equal(open?.type, "status");
    assert.equal(open?.value, "cover_open");

    const closed = protocol.parseResponse(new Uint8Array([0x1a, 0x05, 0x99]));
    assert.equal(closed?.type, "status");
    assert.equal(closed?.value, "cover_closed");
  });

  it("parseResponse decodes paper status", () => {
    const out = protocol.parseResponse(new Uint8Array([0x1a, 0x06, 0x88]));
    assert.equal(out?.type, "status");
    assert.equal(out?.value, "out_of_paper");

    const ok = protocol.parseResponse(new Uint8Array([0x1a, 0x06, 0x00]));
    assert.equal(ok?.type, "status");
    assert.equal(ok?.value, "paper_ok");
  });

  it("parseResponse decodes firmware string", () => {
    const fw = protocol.parseResponse(new Uint8Array([0x1a, 0x07, 0x01, 0x00, 0x05]));
    assert.equal(fw?.type, "firmware");
    assert.equal(fw?.value, "1.0.5");
  });
});

describe("Device Registry & Matching", () => {
  it("matches Phomemo P12 by name prefixes", () => {
    const p1 = findDeviceByName("P12 PRO 3412");
    assert.ok(p1);
    assert.equal(p1?.modelId, "pho-p12");
    assert.equal(p1?.name, "Phomemo P12");

    const p2 = findDeviceByName("p12pro");
    assert.equal(p2?.modelId, "pho-p12");

    const p3 = findDeviceByName("Phomemo P12");
    assert.equal(p3?.modelId, "pho-p12");
  });

  it("matches Marklife models with mark- prefix", () => {
    const p15 = findDeviceByName("p15_3549_BLE");
    assert.ok(p15);
    assert.equal(p15?.modelId, "mark-p15");
    assert.equal(p15?.name, "Marklife P15");

    const p12 = findDeviceByName("p12_3549_BLE");
    assert.ok(p12);
    assert.equal(p12?.modelId, "mark-p12");
    assert.equal(p12?.name, "Marklife P12");

    const m60 = findDeviceByName("M60_ABC");
    assert.ok(m60);
    assert.equal(m60?.modelId, "mark-m60");
    assert.equal(m60?.name, "Marklife M60");
  });

  it("can retrieve profiles by new modelId standard", () => {
    assert.ok(getDevice("pho-p12"));
    assert.ok(getDevice("mark-p15"));
    assert.ok(getDevice("mark-p12"));
    assert.ok(getDevice("mark-m60"));
  });
});

describe("Unmetered Flow Control", () => {
  it("initializes with Infinity credits and sends without stalling", async () => {
    const writes: Uint8Array[] = [];
    const mockTx: BleCharacteristic = {
      uuid: "0000ff02-0000-1000-8000-00805f9b34fb",
      write: async (data) => {
        writes.push(data);
      },
      subscribe: async () => {},
      unsubscribe: async () => {},
    };

    const fc = new FlowController(mockTx, 128, {
      unmetered: true,
      packetDelayMs: 1,
    });

    assert.equal(fc.availableCredits, Infinity);

    const testData = new Uint8Array(256);
    testData.fill(0x42);
    await fc.send(testData);

    assert.equal(writes.length, 2);
    assert.equal(writes[0].length, 128);
    assert.equal(writes[1].length, 128);
    assert.equal(fc.availableCredits, Infinity);
  });
});
