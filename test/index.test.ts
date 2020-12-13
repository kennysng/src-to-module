import { requireSync, requireAsync } from '../src'

test('sync', () => {
  const message = requireSync<string>('../test/sync')
  expect(message).toBe('Hello, World')
})

test('async', async () => {
  const message = await requireAsync<string>('../test/async')
  expect(message).toBe('Hello, World')
})
