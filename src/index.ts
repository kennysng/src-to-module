import { registerTranspiler } from './common'
import { JsTranspiler } from './transpiler/js'
import { JsonTranspiler } from './transpiler/json'

registerTranspiler(new JsonTranspiler())
registerTranspiler(new JsTranspiler())

export { registerTranspiler } from './common'
export { Transpiler } from './interface'
export { requireSync, runSync } from './sync'
export { requireAsync, runAsync } from './async'
