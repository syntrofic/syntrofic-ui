export function streamBuffer<Item>(capacity: number, seed: readonly Item[] = []) {
  const values = new Array<Item>(capacity)
  let head = 0
  let length = 0
  function push(item: Item) {
    values[head] = item
    head = (head + 1) % capacity
    length = Math.min(capacity, length + 1)
  }
  seed.slice(-capacity).forEach(push)
  return {
    push,
    items() {
      const start = (head - length + capacity) % capacity
      return Array.from({ length }, (_, index) => values[(start + index) % capacity])
    },
  }
}
