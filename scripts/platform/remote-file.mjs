export async function readResponseBytes(response, limit) {
  if (!response.body) throw new Error('The response has no data')
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) { await reader.cancel(); throw new Error(`The download exceeds ${limit / 1024 / 1024} MiB`) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks)
}
