import { requireSync, requireAsync } from '.'

test('sync', () => {
  const message = requireSync<string>('../test/sync')
  expect(message).toBe('Hello, World')
})

test('async', async () => {
  const message = await requireAsync<string>('../test/async')
  expect(message).toBe('Hello, World')
})

test('process', () => {
  const message = requireSync<string>('../test/process')
  expect(message).toBe('test')
})

test('extra', () => {
  const message = requireSync<string>('../test/extra', { global: { message: 'hi' } })
  expect(message).toBe('hi')
})
