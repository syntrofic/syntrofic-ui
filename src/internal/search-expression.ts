import type { SearchField, SearchFilter, SearchOperator } from '../components/SPowerSearch.vue'
import { foldSearch, matchesSearch, searchOperators } from './search-filters'
import { readSearchDate, searchDateZone } from './search-dates'

type Reader = (field: string) => unknown
type Predicate = (read: Reader, text: string, now: Date) => boolean
type CompiledExpression = { match: Predicate; error?: never } | { error: 'invalid' | 'field' | 'operator' | 'value'; match?: never }

const comparisons = new Map<string, SearchOperator>([
  ['=', 'is'], ['!=', 'is-not'], [':', 'contains'], ['^=', 'starts-with'],
  ['>', 'gt'], ['>=', 'gte'], ['<', 'lt'], ['<=', 'lte'],
  ['in', 'in'], ['not-in', 'not-in'], ['exists', 'exists'], ['missing', 'missing'],
])

export function compileSearchExpression(source: string, fields: readonly SearchField[], timeZone?: string): CompiledExpression {
  if (!source.trim()) return { match: () => true }
  if (source.length > 2048) return { error: 'invalid' }
  const tokens = source.match(/"(?:\\["\\]|[^"\\])*"|>=|<=|!=|\^=|[(),=:<>]|[^\s"(),=:<>!^]+|[^\s]/gu) ?? []
  const names = new Map(fields.flatMap(field => [field.key, field.label, ...(field.typeaheadAliases ?? [])].map(name => [foldSearch(name), field])))
  let index = 0
  const fail = (error: NonNullable<CompiledExpression['error']>): never => { throw error }
  const peek = () => tokens[index]?.toLowerCase()
  function take(value: string) {
    if (peek() !== value) return false
    index++
    return true
  }
  function expect(value: string) {
    if (!take(value)) fail('invalid')
  }
  function value(): string {
    const token = tokens[index++]
    if (!token || /^[(),=:<>!^]/u.test(token) || /^(?:and|or|not)$/i.test(token)) return fail('invalid')
    if (token.startsWith('"')) return token.length > 1 && token.endsWith('"') ? JSON.parse(token) : fail('invalid')
    return token
  }
  function validate(field: SearchField, input: string, operator: ReturnType<typeof searchOperators>[number]) {
    const options = operator.options ?? field.options
    const resolved = options?.find(option => [option.value, option.label].some(candidate => foldSearch(candidate) === foldSearch(input)))?.value
    if (options?.length && resolved === undefined) return fail('value')
    const stored = resolved ?? input
    if (!stored.trim() || operator.validate?.(stored) === false) return fail('value')
    if (field.type === 'number' && !Number.isFinite(Number(stored))) return fail('value')
    if (field.type === 'boolean' && !['true', 'false'].includes(stored)) return fail('value')
    if (field.type === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/u.test(stored)) return fail('value')
    if (field.type === 'date' && !readSearchDate(stored, searchDateZone(timeZone, field.dateOnly !== false), field.dateOnly !== false)) return fail('value')
    return stored
  }
  function condition(): Predicate {
    const name = value()
    const comparison = comparisons.get(peek() ?? '')
    if (!comparison) return (_, text) => foldSearch(text).includes(foldSearch(name))
    index++
    const field = names.get(foldSearch(name))
    if (!field) return fail('field')
    const operator = searchOperators(field).find(option => option.key === comparison)
    if (!operator) return fail('operator')
    const filter: SearchFilter = { field: field.key, operator: comparison, value: '' }
    if (comparison === 'in' || comparison === 'not-in') {
      expect('(')
      const choices = [validate(field, value(), operator)]
      while (take(',')) choices.push(validate(field, value(), operator))
      expect(')')
      filter.values = choices
    } else if (comparison !== 'exists' && comparison !== 'missing') {
      filter.value = validate(field, value(), operator)
    }
    return (read, _, now) => matchesSearch(field, read(field.key), filter, { now, timeZone })
  }
  function term(): Predicate {
    if (take('not')) {
      const next = term()
      return (...args) => !next(...args)
    }
    if (!take('(')) return condition()
    const group = expression()
    expect(')')
    return group
  }
  function conjunction(): Predicate {
    const terms = [term()]
    while (take('and')) terms.push(term())
    return (...args) => terms.every(check => check(...args))
  }
  function expression(): Predicate {
    const groups = [conjunction()]
    while (take('or')) groups.push(conjunction())
    return (...args) => groups.some(check => check(...args))
  }
  try {
    const match = expression()
    return index === tokens.length ? { match } : { error: 'invalid' }
  } catch (error) {
    if (error === 'field' || error === 'operator' || error === 'value') return { error }
    return { error: 'invalid' }
  }
}
