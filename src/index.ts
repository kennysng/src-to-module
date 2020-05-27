declare global {
  function requireAsync<T>(filepath: string): Promise<T>
}

export { enableCache, disableCache, invalidateCache, setCacheOptions } from './cache'
export { requireAsync, runAsync } from './async'
export { requireSync, runSync } from './sync'
export { Transpiler, JsTranspiler, JsonTranspiler, registerTranspiler } from './transpiler'