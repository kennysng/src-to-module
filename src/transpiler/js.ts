import { Module } from 'module'
import { dirname, extname } from 'path'
import { createContext, Script } from 'vm'
import { isNullOrUndefined } from '../common'
import { Transpiler } from '../interface'

export class JsTranspiler implements Transpiler {
  /**
   * @override
   */
  public check(path: string): boolean {
    return extname(path).toLocaleLowerCase() === '.js'
  }

  /**
   * @override
   */
  public transpile(path: string, code: string): string {
    return code
  }

  /**
   * @override
   */
  public run<T>(path: string, code: string, require: NodeRequire, context: any = {}): T {
    // create sandbox
    code = Module.wrap(code)
    context = createContext({ ...context, console, process })
    const func = new Script(code, { filename: path }).runInContext(context)

    // module.exports
    let hasExports = false
    const module = {
      exports: new Proxy({}, {
        set: (t, p, v) => {
          hasExports = true
          t[p] = v
          return true
        },
      }),
    }
    const wrappedModule = new Proxy(module, {
      set: (t, p, v) => {
        if (p === 'exports' && !isNullOrUndefined(v)) hasExports = true
        t[p] = v || {}
        return true
      },
    })

    // run sandbox sychronously
    func(wrappedModule.exports, require, wrappedModule, path, dirname(path))
    return (hasExports ? wrappedModule.exports : undefined) as T
  }

  /**
   * @override
   */
  public async runAsync<T>(path: string, code: string, require: NodeRequire, baseContext: any = {}): Promise<T> {
    // create sandbox
    code = `(async ${Module.wrap(code).substr(1)}`
    const context = createContext({ ...baseContext, console, process })
    const func = new Script(code, { filename: path }).runInContext(context)

    // module.exports
    let hasExports = false
    const module = {
      exports: new Proxy({}, {
        set: (t, p, v) => {
          hasExports = true
          t[p] = v
          return true
        },
      }),
    }
    const wrappedModule = new Proxy(module, {
      set: (t, p, v) => {
        if (p === 'exports' && !isNullOrUndefined(v)) hasExports = true
        t[p] = v || {}
        return true
      },
    })

    // run sandbox asynchronously
    func(wrappedModule.exports, require, wrappedModule, path, dirname(path))
    if (hasExports && wrappedModule.exports instanceof Promise) wrappedModule.exports = await wrappedModule.exports
    return (hasExports ? wrappedModule.exports : undefined) as T
  }
}
