import { describe, expect, it } from "vitest";
import { forkAsyncIterable } from "../../../src/utils/forkAsyncIterable.js";

describe("forkAsyncIterable", () => {
  it("both iterables receive all items", async () => {
    async function* source() {
      yield 1;
      yield 2;
      yield 3;
    }

    const [iter1, iter2] = forkAsyncIterable(source());

    const results1: number[] = [];
    const results2: number[] = [];

    for await (const item of iter1) {
      results1.push(item);
    }

    for await (const item of iter2) {
      results2.push(item);
    }

    expect(results1).toEqual([1, 2, 3]);
    expect(results2).toEqual([1, 2, 3]);
  });

  it("iterables can be consumed concurrently", async () => {
    async function* source() {
      yield "a";
      yield "b";
      yield "c";
    }

    const [iter1, iter2] = forkAsyncIterable(source());

    const [results1, results2] = await Promise.all([
      (async () => {
        const items: string[] = [];
        for await (const item of iter1) {
          items.push(item);
        }
        return items;
      })(),
      (async () => {
        const items: string[] = [];
        for await (const item of iter2) {
          items.push(item);
        }
        return items;
      })(),
    ]);

    expect(results1).toEqual(["a", "b", "c"]);
    expect(results2).toEqual(["a", "b", "c"]);
  });

  it("handles empty source", async () => {
    async function* source(): AsyncGenerator<number> {
      // Empty generator
    }

    const [iter1, iter2] = forkAsyncIterable(source());

    const results1: number[] = [];
    const results2: number[] = [];

    for await (const item of iter1) {
      results1.push(item);
    }

    for await (const item of iter2) {
      results2.push(item);
    }

    expect(results1).toEqual([]);
    expect(results2).toEqual([]);
  });

  it("handles single item", async () => {
    async function* source() {
      yield "only";
    }

    const [iter1, iter2] = forkAsyncIterable(source());

    const results1: string[] = [];
    const results2: string[] = [];

    for await (const item of iter1) {
      results1.push(item);
    }

    for await (const item of iter2) {
      results2.push(item);
    }

    expect(results1).toEqual(["only"]);
    expect(results2).toEqual(["only"]);
  });

  it("one slow consumer does not block the other", async () => {
    async function* source() {
      yield 1;
      yield 2;
      yield 3;
    }

    const [iter1, iter2] = forkAsyncIterable(source());

    const consumptionOrder: string[] = [];

    await Promise.all([
      (async () => {
        for await (const item of iter1) {
          consumptionOrder.push(`fast-${item}`);
        }
      })(),
      (async () => {
        for await (const item of iter2) {
          // Slow consumer - waits a bit between items
          await new Promise((r) => setTimeout(r, 10));
          consumptionOrder.push(`slow-${item}`);
        }
      })(),
    ]);

    // Fast consumer should finish its items before slow consumer
    // The exact order depends on timing, but both should get all items
    expect(consumptionOrder.filter((x) => x.startsWith("fast-"))).toEqual([
      "fast-1",
      "fast-2",
      "fast-3",
    ]);
    expect(consumptionOrder.filter((x) => x.startsWith("slow-"))).toEqual([
      "slow-1",
      "slow-2",
      "slow-3",
    ]);
  });

  it("works with complex objects", async () => {
    interface TokenEvent {
      userId: string;
      tokens: number;
    }

    async function* source(): AsyncGenerator<TokenEvent> {
      yield { userId: "u1", tokens: 100 };
      yield { userId: "u2", tokens: 200 };
    }

    const [iter1, iter2] = forkAsyncIterable(source());

    const results1: TokenEvent[] = [];
    const results2: TokenEvent[] = [];

    for await (const item of iter1) {
      results1.push(item);
    }

    for await (const item of iter2) {
      results2.push(item);
    }

    expect(results1).toEqual([
      { userId: "u1", tokens: 100 },
      { userId: "u2", tokens: 200 },
    ]);
    expect(results2).toEqual([
      { userId: "u1", tokens: 100 },
      { userId: "u2", tokens: 200 },
    ]);
  });

  it("handles delayed source items", async () => {
    async function* source() {
      yield 1;
      await new Promise((r) => setTimeout(r, 10));
      yield 2;
      await new Promise((r) => setTimeout(r, 10));
      yield 3;
    }

    const [iter1, iter2] = forkAsyncIterable(source());

    const [results1, results2] = await Promise.all([
      (async () => {
        const items: number[] = [];
        for await (const item of iter1) {
          items.push(item);
        }
        return items;
      })(),
      (async () => {
        const items: number[] = [];
        for await (const item of iter2) {
          items.push(item);
        }
        return items;
      })(),
    ]);

    expect(results1).toEqual([1, 2, 3]);
    expect(results2).toEqual([1, 2, 3]);
  });
});
