import { unwatchFile, watchFile } from 'node:fs'

export async function watchThemeBuild(compile, report) {
  const watched = new Set()
  let timer
  let running = Promise.resolve()
  let stopped = false
  let stop
  const interrupted = new Promise(resolve => { stop = resolve })

  function schedule(current, previous) {
    if (stopped || (current.mtimeMs === previous.mtimeMs && current.ctimeMs === previous.ctimeMs
      && current.ino === previous.ino && current.size === previous.size)) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      running = running.then(() => stopped ? undefined : rebuild())
    }, 80)
  }

  async function rebuild() {
    const inputs = new Set()
    try {
      const result = await compile(file => {
        inputs.add(file)
        if (stopped || watched.has(file)) return
        watchFile(file, { interval: 180 }, schedule)
        watched.add(file)
      })
      for (const file of watched) {
        if (inputs.has(file)) continue
        unwatchFile(file, schedule)
        watched.delete(file)
      }
      report(result)
    } catch (error) {
      if (!watched.size) throw error
      console.error(error instanceof Error ? error.message : String(error))
    }
  }

  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  try {
    await rebuild()
    await interrupted
  } finally {
    stopped = true
    clearTimeout(timer)
    for (const file of watched) unwatchFile(file, schedule)
    process.removeListener('SIGINT', stop)
    process.removeListener('SIGTERM', stop)
    await running
  }
}
