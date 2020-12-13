import { registerTranspiler } from './common'
import { JsTranspiler } from './transpiler/js'
import { JsonTranspiler } from './transpiler/json'

declare global {
  function requireAsync<T = void>(filepath: string): Promise<T>
}

registerTranspiler(new JsonTranspiler())
registerTranspiler(new JsTranspiler())

export { registerTranspiler } from './common'
export { Transpiler } from './interface'
export { requireSync, runSync } from './sync'
export { requireAsync, runAsync } from './async'
