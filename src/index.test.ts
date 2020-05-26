import { requireSync, requireAsync } from '.'

test('sync', () => {
  const message = requireSync<string>('../test/sync')
  expect(message).toBe('Hello, World')
})

test('async', async (done) => {
  const message = await requireAsync<string>('../test/async')
  expect(message).toBe('Hello, World')
  done()
})