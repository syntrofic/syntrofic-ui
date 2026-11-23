export interface FileRejection {
  file: File | null
  name: string
  reason: 'type' | 'size' | 'limit' | 'directory'
}

export const fileKey = (file: File) => JSON.stringify([file.name, file.size, file.lastModified, file.type])

export function filesFromTransfer(transfer: DataTransfer) {
  const files: File[] = []
  const rejected: FileRejection[] = []
  for (const item of Array.from(transfer.items)) {
    if (item.kind !== 'file') continue
    const entry = item.webkitGetAsEntry?.()
    if (entry?.isDirectory) rejected.push({ file: null, name: entry.name, reason: 'directory' })
    else {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  return { files: transfer.items.length ? files : Array.from(transfer.files), rejected }
}

function acceptedType(file: File, rules: readonly string[]) {
  if (!rules.length) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return rules.some(rule => {
    if (rule.startsWith('.')) return name.endsWith(rule)
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))
    return type === rule
  })
}

export function addAcceptedFiles(incoming: readonly File[], current: readonly File[], options: {
  accept?: string
  maxFiles?: number
  maxSize?: number
}) {
  const files = [...current]
  const existing = new Set(files.map(fileKey))
  const rules = options.accept?.toLowerCase().split(',').map(rule => rule.trim()).filter(Boolean) ?? []
  const size = options.maxSize !== undefined && Number.isFinite(options.maxSize) ? Math.max(0, options.maxSize) : Infinity
  const limit = options.maxFiles !== undefined && Number.isFinite(options.maxFiles) ? Math.max(0, Math.floor(options.maxFiles)) : Infinity
  const added: File[] = []
  const rejected: FileRejection[] = []
  for (const file of incoming) {
    const key = fileKey(file)
    if (existing.has(key)) continue
    const reason = !acceptedType(file, rules) ? 'type' : file.size > size ? 'size' : files.length >= limit ? 'limit' : undefined
    if (reason) {
      rejected.push({ file, name: file.name, reason })
      continue
    }
    existing.add(key)
    files.push(file)
    added.push(file)
  }
  return { files, added, rejected }
}
