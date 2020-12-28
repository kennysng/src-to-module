import { requireSync, requireAsync } from '.'

test('sync', () => {
  const message = requireSync<string>('../test/sync')
  expect(message).toBe('Hello, World')
})

test('async', async () => {
  const message = await requireAsync<string>('../test/async')
  expect(message).toBe('Hello, World')
})

test('context', () => {
  const message = requireSync<string>('../test/context')
  expect(message).toBe('test')
})
