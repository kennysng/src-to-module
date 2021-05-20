import { registerTranspiler } from './common'
import { JsTranspiler } from './transpiler/js'
import { JsonTranspiler } from './transpiler/json'

declare global {
  function requireAsync<T = void>(filepath: string): Promise<T>
}

registerTranspiler(new JsonTranspiler())
registerTranspiler(new JsTranspiler())

export { registerTranspiler, registerProcessor, enableFallbackRequire } from './common'
export { Transpiler } from './interface'
export { JsTranspiler } from './transpiler/js'
export { JsonTranspiler } from './transpiler/json'
export { requireSync, runSync } from './sync'
export { requireAsync, runAsync } from './async'
export { enableLastModifiedCheck } from './cache'
