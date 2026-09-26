import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as cmd from "../../src/protocol/mark-l11/commands.js";
import { MarkL11Protocol } from "../../src/protocol/mark-l11/protocol.js";

describe("L11 commands", () => {
  it("wakeup is 15 zero bytes", () => {
    const { data } = cmd.wakeup();
    assert.equal(data.length, 15);
    assert.equal(data.every((b) => b === 0), true);
  });

  it("enable is 10 FF F1 02", () => {
    const { data } = cmd.enable();
    assert.deepEqual(Array.from(data), [0x10, 0xff, 0xf1, 0x02]);
  });

  it("stop is 10 FF F1 45", () => {
    const { data } = cmd.stop();
    assert.deepEqual(Array.from(data), [0x10, 0xff, 0xf1, 0x45]);
  });

  it("setDensity encodes correctly", () => {
    const { data } = cmd.setDensity(2);
    assert.deepEqual(Array.from(data), [0x1f, 0x70, 0x02, 0x02]);
  });

  it("feedDots encodes correctly", () => {
    const { data } = cmd.feedDots(100);
    assert.deepEqual(Array.from(data), [0x1b, 0x4a, 100]);
  });

  it("feedLines encodes correctly", () => {
    const { data } = cmd.feedLines(5);
    assert.deepEqual(Array.from(data), [0x1b, 0x64, 5]);
  });

  it("positionToGap is 1D 0C", () => {
    const { data } = cmd.positionToGap();
    assert.deepEqual(Array.from(data), [0x1d, 0x0c]);
  });

  it("getBattery is 10 FF 50 F1", () => {
    const { data } = cmd.getBattery();
    assert.deepEqual(Array.from(data), [0x10, 0xff, 0x50, 0xf1]);
  });

  it("getStatus is 10 FF 40", () => {
    const { data } = cmd.getStatus();
    assert.deepEqual(Array.from(data), [0x10, 0xff, 0x40]);
  });

  it("printBitmap builds correct header", () => {
    const image = {
      data: new Uint8Array(48), // 48 bytes per row * 1 row
      width: 384,
      height: 1,
      bytesPerRow: 48,
    };
    const { data } = cmd.printBitmap(image);
    // Header: 1D 76 30 00 <wl> <wh> <hl> <hh>
    assert.equal(data[0], 0x1d);
    assert.equal(data[1], 0x76);
    assert.equal(data[2], 0x30);
    assert.equal(data[3], 0x00); // quality
    assert.equal(data[4], 48); // bytesPerRow low
    assert.equal(data[5], 0);  // bytesPerRow high
    assert.equal(data[6], 1);  // height low
    assert.equal(data[7], 0);  // height high
    assert.equal(data.length, 8 + 48); // header + pixel data
  });

  it("printBitmap is marked as bulk", () => {
    const image = { data: new Uint8Array(1), width: 8, height: 1, bytesPerRow: 1 };
    const result = cmd.printBitmap(image);
    assert.equal(result.bulk, true);
  });
});

describe("MarkL11Protocol", () => {
  const proto = new MarkL11Protocol();

  it("id is mark-l11", () => {
    assert.equal(proto.id, "mark-l11");
  });

  it("buildPrintSequence with gap paper type", () => {
    const image = { data: new Uint8Array(1), width: 8, height: 1, bytesPerRow: 1 };
    const commands = proto.buildPrintSequence(image, { paperType: "gap" });
    const labels = commands.map((c) => c.label);
    assert.ok(labels.includes("wakeup"));
    assert.ok(labels.includes("enable"));
    assert.ok(labels.includes("print-bitmap"));
    assert.ok(labels.includes("position-to-gap"));
    assert.ok(labels.includes("stop"));
  });

  it("buildPrintSequence with continuous paper type", () => {
    const image = { data: new Uint8Array(1), width: 8, height: 1, bytesPerRow: 1 };
    const commands = proto.buildPrintSequence(image, { paperType: "continuous" });
    const labels = commands.map((c) => c.label);
    assert.ok(labels.includes("feed-dots"));
    assert.ok(!labels.includes("position-to-gap"));
  });

  it("buildPrintSequence includes density when provided", () => {
    const image = { data: new Uint8Array(1), width: 8, height: 1, bytesPerRow: 1 };
    const commands = proto.buildPrintSequence(image, { density: 3 });
    assert.equal(commands[0].label, "set-density");
  });

  it("parseResponse identifies credit grant", () => {
    const response = proto.parseResponse(Uint8Array.from([0x01, 0x04]));
    assert.equal(response?.type, "credit");
    assert.equal(response?.value, 4);
  });

  it("parseResponse identifies MTU notification", () => {
    // MTU 240: [0x02, 0xF0, 0x00]
    const response = proto.parseResponse(Uint8Array.from([0x02, 0xf0, 0x00]));
    assert.equal(response?.type, "mtu");
    assert.equal(response?.value, 240);
  });

  it("parseResponse identifies status messages", () => {
    const response = proto.parseResponse(Uint8Array.from([0xff, 0x01]));
    assert.equal(response?.type, "status");
    assert.equal(response?.value, "out_of_paper");
  });

  it("parseResponse identifies print success (0xAA)", () => {
    const response = proto.parseResponse(Uint8Array.from([0xaa, 0x00]));
    assert.equal(response?.type, "success");
  });

  it("parseResponse identifies print success (0x4F = 'O')", () => {
    const response = proto.parseResponse(Uint8Array.from([0x4f, 0x4b]));
    assert.equal(response?.type, "success");
  });

  it("parseResponse identifies single-byte success (0xAA)", () => {
    const response = proto.parseResponse(Uint8Array.from([0xaa]));
    assert.equal(response?.type, "success");
  });

  it("parseResponse identifies single-byte success (0x4F)", () => {
    const response = proto.parseResponse(Uint8Array.from([0x4f]));
    assert.equal(response?.type, "success");
  });

  it("parseResponse identifies single-byte success (0x4B)", () => {
    const response = proto.parseResponse(Uint8Array.from([0x4b]));
    assert.equal(response?.type, "success");
  });

  it("parseResponse returns null for unknown data", () => {
    const response = proto.parseResponse(Uint8Array.from([0x00]));
    assert.equal(response, null);
  });
});
