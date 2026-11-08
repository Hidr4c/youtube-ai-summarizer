/**
 * Greedy Batch Packer for High-Throughput AI Prompts (Bin Packing Strategy)
 * Minimizes network round-trips by packing maximum data into each message payload.
 */
export class BatchPacker {
  /**
   * Packs items greedily into the minimal number of batches
   * @template T
   * @param {Array<T>} items - List of items to pack
   * @param {function(T): number} getWeight - Weight calculator (character or token count)
   * @param {number} maxBudget - Maximum allowed capacity per batch
   * @returns {Array<Array<T>>} Minimal batches filled to capacity
   */
  static packGreedy(items, getWeight, maxBudget) {
    if (!Array.isArray(items) || items.length === 0) return [];
    if (typeof getWeight !== 'function' || !maxBudget || maxBudget <= 0) {
      return [items.slice()];
    }

    const batches = [];
    let currentBatch = [];
    let currentWeight = 0;

    for (const item of items) {
      const weight = Math.max(1, getWeight(item) || 0);

      // If an oversized item exceeds total budget on its own, isolate it in a dedicated batch
      if (weight >= maxBudget) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [];
          currentWeight = 0;
        }
        batches.push([item]);
        continue;
      }

      // If adding item overflows current batch budget, seal current batch and open a new one
      if (currentWeight + weight > maxBudget && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [item];
        currentWeight = weight;
      } else {
        currentBatch.push(item);
        currentWeight += weight;
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }
}

export default BatchPacker;
