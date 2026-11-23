import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createConnectors } from '../../scripts/platform/connectors.mjs'

test('Gmail partial sync reads concrete change types and advances after the final page', async () => {
  const initial = '9007199254740993'
  const afterSync = '9007199254741004'
  const historyRequests = []
  const messageRequests = []
  const connectors = createConnectors({
    gmail: { clientId: 'test-app', callback: 'http://localhost:4481/connectors/callback' },
  }, {
    async http(url) {
      if (url.hostname === 'oauth2.googleapis.com') return Response.json({ access_token: 'fixture-token' })
      switch (url.pathname) {
        case '/gmail/v1/users/me/messages':
          return Response.json({ messages: [{ id: 'initial' }] })
        case '/gmail/v1/users/me/history': {
          const start = url.searchParams.get('startHistoryId')
          const page = url.searchParams.get('pageToken')
          historyRequests.push([start, page])
          if (start === afterSync) return Response.json({ historyId: afterSync })
          if (page) return Response.json({
            history: [{ labelsRemoved: [{ message: { id: 'unlabelled' } }] }],
            historyId: afterSync,
          })
          return Response.json({
            history: [{
              messages: [{ id: 'legacy' }, { id: 'added' }, { id: 'removed' }],
              messagesAdded: [{ message: { id: 'added' } }],
              labelsAdded: [{ message: { id: 'labelled' } }],
              messagesDeleted: [{ message: { id: 'removed' } }],
            }],
            historyId: afterSync,
            nextPageToken: 'next',
          })
        }
        default: {
          const id = url.pathname.split('/').pop()
          messageRequests.push(id)
          return Response.json({ id, historyId: initial })
        }
      }
    },
  })
  const claims = { workspace: 'studio', subject: 'reader' }
  const { url } = connectors.start(claims, 'gmail')
  await connectors.complete(new URL(url).searchParams.get('state'), 'fixture-code')

  assert.deepEqual((await connectors.sync(claims, 'gmail')).rows.map(row => row.id), ['initial'])
  const first = await connectors.sync(claims, 'gmail')
  assert.equal(first.more, true)
  assert.deepEqual(first.rows.map(row => row.id), ['legacy', 'added', 'labelled', 'removed'])
  assert.equal(first.rows.at(-1).deleted, true)
  assert.deepEqual((await connectors.sync(claims, 'gmail')).rows.map(row => row.id), ['unlabelled'])
  assert.deepEqual((await connectors.sync(claims, 'gmail')).rows, [])
  assert.deepEqual(historyRequests, [[initial, null], [initial, 'next'], [afterSync, null]])
  assert.deepEqual(messageRequests, ['initial', 'legacy', 'added', 'labelled', 'unlabelled'])
})

test('Granola forwards the note cursor only when another page exists', async () => {
  const requests = []
  const connectors = createConnectors({ granola: {} }, {
    async http(url) {
      assert.equal(url.href.split('?')[0], 'https://public-api.granola.ai/v1/notes')
      requests.push(url.searchParams.get('cursor'))
      return Response.json(requests.length === 1
        ? { notes: [{ id: 'first' }], hasMore: true, cursor: 'notes::next' }
        : { notes: [{ id: 'last' }], hasMore: false, cursor: 'notes::done' })
    },
  })
  const claims = { workspace: 'studio', subject: 'reader' }
  connectors.apiKey(claims, 'granola', 'fixture-granola-key')
  assert.deepEqual(await connectors.sync(claims, 'granola').then(({ rows, more }) => ({ rows, more })),
    { rows: [{ id: 'first' }], more: true })
  assert.equal((await connectors.sync(claims, 'granola')).more, false)
  assert.deepEqual(requests, [null, 'notes::next'])
})

test('Cal.com sends the required version and follows the opaque booking cursor', async () => {
  const requests = []
  const connectors = createConnectors({ cal: {} }, {
    async http(url, options) {
      assert.equal(url.href.split('?')[0], 'https://api.cal.com/v2/bookings')
      assert.equal(options.headers['cal-api-version'], '2026-05-01')
      assert.equal(url.searchParams.has('skip'), false)
      requests.push(url.searchParams.get('cursor'))
      return Response.json(requests.length === 1
        ? { status: 'success', data: [{ uid: 'first' }], pagination: { hasMore: true, nextCursor: 'bookings::next' } }
        : { status: 'success', data: [{ uid: 'last' }], pagination: { hasMore: false, nextCursor: null } })
    },
  })
  const claims = { workspace: 'studio', subject: 'reader' }
  connectors.apiKey(claims, 'cal', 'fixture-cal-key')
  assert.deepEqual(await connectors.sync(claims, 'cal').then(({ rows, more }) => ({ rows, more })),
    { rows: [{ uid: 'first' }], more: true })
  assert.equal((await connectors.sync(claims, 'cal')).more, false)
  assert.deepEqual(requests, [null, 'bookings::next'])
})
