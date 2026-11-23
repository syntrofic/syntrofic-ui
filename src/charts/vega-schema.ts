export type VegaSchemaLibrary = 'vega' | 'vega-lite'
export type VegaSchemaResult = { ok: true; library: VegaSchemaLibrary; version: string } | { ok: false; error: string }

export function parseVegaSchema(schema: unknown): VegaSchemaResult {
  if (schema == null) return { ok: false, error: 'Add a Vega or Vega-Lite $schema to the specification.' }
  if (typeof schema !== 'string') return { ok: false, error: 'The Vega $schema must be a string.' }
  const match = /(?:^|\/)schema\/([\w-]+)\/([\w.-]+)\.json$/.exec(schema)
  if (!match) return { ok: false, error: 'Expected a schema URL ending in /schema/vega/{version}.json or /schema/vega-lite/{version}.json.' }
  const [, library, version] = match
  if (library !== 'vega' && library !== 'vega-lite') return { ok: false, error: `Unknown Vega schema library ${library}.` }
  return { ok: true, library, version }
}
