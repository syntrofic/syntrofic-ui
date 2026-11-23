export interface DiffLine { type: 'context' | 'remove' | 'add'; text: string; oldLine?: number; newLine?: number }
export interface DiffHunk { header?: string; lines: readonly DiffLine[]; replaced?: boolean }
export interface DiffFile {
  oldPath?: string
  newPath?: string
  status?: 'added' | 'deleted' | 'renamed' | 'modified'
  binary?: boolean
  hunks: readonly DiffHunk[]
}
export interface DiffLineReference { side: 'old' | 'new'; lineNumber: number }

function compareLines(before: string, after: string) {
  const left = before ? before.replaceAll('\r\n', '\n').split('\n') : []
  const right = after ? after.replaceAll('\r\n', '\n').split('\n') : []
  let start = 0
  let leftEnd = left.length
  let rightEnd = right.length
  while (start < leftEnd && start < rightEnd && left[start] === right[start]) start++
  while (leftEnd > start && rightEnd > start && left[leftEnd - 1] === right[rightEnd - 1]) { leftEnd--; rightEnd-- }

  const result: DiffLine[] = []
  const context = (i: number, j: number) => result.push({ type: 'context', text: left[i], oldLine: i + 1, newLine: j + 1 })
  for (let index = 0; index < start; index++) context(index, index)
  const width = rightEnd - start
  const height = leftEnd - start
  let i = 0
  let j = 0

  // Bound the memory of the exact line diff. A very large changed block can
  // still be displayed as a replacement with its shared edges preserved.
  const stride = width + 1
  const exact = width > 0 && height > 0 && stride * (height + 1) <= 2_000_000
  const scores = exact ? new Uint32Array(stride * (height + 1)) : undefined
  if (scores) {
    for (let row = height - 1; row >= 0; row--) {
      for (let col = width - 1; col >= 0; col--) {
        const cell = row * stride + col
        scores[cell] = left[row + start] === right[col + start] ? 1 + scores[cell + stride + 1]
          : Math.max(scores[cell + stride], scores[cell + 1])
      }
    }
  }
  while (i < height || j < width) {
    if (scores && i < height && j < width && left[i + start] === right[j + start]) {
      context(start + i, start + j)
      i++
      j++
    } else if (i < height && (!scores || j === width || scores[(i + 1) * stride + j] >= scores[i * stride + j + 1])) {
      result.push({ type: 'remove', text: left[start + i], oldLine: start + ++i })
    } else {
      result.push({ type: 'add', text: right[start + j], newLine: start + ++j })
    }
  }
  for (let index = 0; leftEnd + index < left.length; index++) context(leftEnd + index, rightEnd + index)
  return { lines: result, replaced: width > 0 && height > 0 && !exact }
}

export function createDiffFile({ oldValue, newValue, path, oldPath, newPath }: {
  oldValue: string
  newValue: string
  path?: string
  oldPath?: string
  newPath?: string
}): DiffFile {
  const from = oldPath ?? path
  const to = newPath ?? path
  const status = from && to && from !== to ? 'renamed' : !oldValue && newValue ? 'added' : oldValue && !newValue ? 'deleted' : 'modified'
  return { oldPath: from, newPath: to, status, hunks: [compareLines(oldValue, newValue)] }
}

function filePath(input: string, git: boolean) {
  const field = input.split('\t', 1)[0]
  let path = field
  if (field.startsWith('"')) {
    path = field.slice(1, -1).replace(/\\(["\\t])/g, (_, char: string) => char === 't' ? '\t' : char)
  }
  return path === '/dev/null' ? undefined : git ? path.replace(/^[ab]\//, '') : path
}

/** Each input file in a Git or unified patch becomes a separate diff. */
export function parseUnifiedDiff(patch: string): DiffFile[] {
  const result: DiffFile[] = []
  type ParsedFile = Omit<DiffFile, 'hunks'> & { hunks: DiffHunk[] }
  const state: { file?: ParsedFile } = {}
  let hunk: { lines: DiffLine[]; old: number; next: number; left: number; right: number } | undefined
  let git = false
  function begin(gitPatch: boolean) {
    git = gitPatch
    hunk = undefined
    const next: ParsedFile = { hunks: [] }
    state.file = next
    result.push(next)
    return next
  }
  for (const row of patch.replaceAll('\r\n', '\n').split('\n')) {
    if (row.startsWith('diff --git ')) {
      const next = begin(true)
      const paths = row.slice(11).match(/"(?:\\.|[^"\\])*"|\S+/g)
      if (paths?.length === 2) {
        next.oldPath = filePath(paths[0], true)
        next.newPath = filePath(paths[1], true)
      }
      continue
    }
    const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(row)
    if (header) {
      const next = state.file ?? begin(false)
      hunk = { lines: [], old: Number(header[1]), next: Number(header[3]), left: Number(header[2] ?? 1), right: Number(header[4] ?? 1) }
      next.hunks.push({ header: row, lines: hunk.lines })
      continue
    }
    if (hunk && (hunk.left > 0 || hunk.right > 0)) {
      const text = row.slice(1)
      if (row.startsWith(' ')) {
        hunk.lines.push({ type: 'context', text, oldLine: hunk.old++, newLine: hunk.next++ })
        hunk.left--
        hunk.right--
        continue
      }
      if (row.startsWith('-')) {
        hunk.lines.push({ type: 'remove', text, oldLine: hunk.old++ })
        hunk.left--
        continue
      }
      if (row.startsWith('+')) {
        hunk.lines.push({ type: 'add', text, newLine: hunk.next++ })
        hunk.right--
        continue
      }
    }
    if (row.startsWith('--- ')) {
      const next = state.file && (git || !state.file.hunks.length) ? state.file : begin(false)
      next.oldPath = filePath(row.slice(4), git)
      if (!next.oldPath) next.status = 'added'
    } else if (row.startsWith('+++ ')) {
      const next = state.file ?? begin(false)
      next.newPath = filePath(row.slice(4), git)
      if (!next.newPath) next.status = 'deleted'
    } else if (row.startsWith('rename from ') || row.startsWith('rename to ')) {
      const next = state.file ?? begin(true)
      next.status = 'renamed'
      if (row.startsWith('rename from ')) next.oldPath = filePath(row.slice(12), false)
      else next.newPath = filePath(row.slice(10), false)
    } else if (/^(Binary files|GIT binary patch)/.test(row)) {
      const next = state.file ?? begin(false)
      next.binary = true
    } else if (row.startsWith('new file mode ') || row.startsWith('deleted file mode ')) {
      const next = state.file ?? begin(true)
      next.status = row.startsWith('new ') ? 'added' : 'deleted'
    }
  }
  for (const entry of result) entry.status ??= 'modified'
  return result
}

export interface DiffFragment { text: string; changed?: boolean }
export function inlineDiff(before: string, after: string, mode: 'word' | 'char'): [DiffFragment[], DiffFragment[]] {
  const tokenize = (text: string) => mode === 'char' ? Array.from(text) : text.match(/[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu) ?? []
  const a = tokenize(before)
  const b = tokenize(after)
  const fallback: [DiffFragment[], DiffFragment[]] = [[{ text: before }], [{ text: after }]]
  const width = b.length + 1
  if (width * (a.length + 1) > 48_000) return fallback
  const matrix = new Uint16Array(width * (a.length + 1))
  for (let x = a.length - 1; x >= 0; x--) {
    for (let y = b.length - 1; y >= 0; y--) {
      const at = x * width + y
      matrix[at] = a[x] === b[y] ? 1 + matrix[at + width + 1] : Math.max(matrix[at + width], matrix[at + 1])
    }
  }
  const left: DiffFragment[] = []
  const right: DiffFragment[] = []
  function add(into: DiffFragment[], text: string, changed: boolean) {
    const previous = into.at(-1)
    if (previous?.changed === changed) previous.text += text
    else into.push({ text, changed })
  }
  let x = 0
  let y = 0
  let shared = false
  while (x < a.length || y < b.length) {
    if (x < a.length && y < b.length && a[x] === b[y]) {
      shared ||= Boolean(a[x].trim())
      add(left, a[x++], false)
      add(right, b[y++], false)
    } else if (x < a.length && (y === b.length || matrix[(x + 1) * width + y] >= matrix[x * width + y + 1])) {
      add(left, a[x++], true)
    } else add(right, b[y++], true)
  }
  return shared ? [left, right] : fallback
}
