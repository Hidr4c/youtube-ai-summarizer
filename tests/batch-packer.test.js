import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BatchPacker } from '../src/services/implementations/BatchPacker.js';

describe('BatchPacker - Greedy Bin Packing for AI Message Optimization', () => {
  it('packs all items into a single batch if budget allows (1 round-trip)', () => {
    const items = [
      { id: 'v1', text: 'Hello' }, // len 5
      { id: 'v2', text: 'World' }, // len 5
      { id: 'v3', text: '!' }      // len 1
    ];

    const batches = BatchPacker.packGreedy(items, (item) => item.text.length, 50);
    assert.equal(batches.length, 1);
    assert.equal(batches[0].length, 3);
  });

  it('greedily splits into minimal batches when budget is constrained', () => {
    const items = [
      { id: 'v1', size: 10 },
      { id: 'v2', size: 10 },
      { id: 'v3', size: 10 },
      { id: 'v4', size: 10 },
      { id: 'v5', size: 10 }
    ];

    // Budget of 25 -> each batch can hold at most 2 items of size 10 (total 20).
    // Expect 3 batches: [v1, v2], [v3, v4], [v5]
    const batches = BatchPacker.packGreedy(items, (i) => i.size, 25);
    assert.equal(batches.length, 3);
    assert.equal(batches[0].length, 2);
    assert.equal(batches[1].length, 2);
    assert.equal(batches[2].length, 1);
  });

  it('handles empty items array gracefully', () => {
    const batches = BatchPacker.packGreedy([], () => 10, 100);
    assert.deepEqual(batches, []);
  });

  it('isolates oversized item into its own batch', () => {
    const items = [
      { id: 'small1', size: 5 },
      { id: 'giant', size: 120 },
      { id: 'small2', size: 5 }
    ];

    const batches = BatchPacker.packGreedy(items, (i) => i.size, 50);
    assert.equal(batches.length, 3);
    assert.deepEqual(batches[0].map(i => i.id), ['small1']);
    assert.deepEqual(batches[1].map(i => i.id), ['giant']);
    assert.deepEqual(batches[2].map(i => i.id), ['small2']);
  });
});
