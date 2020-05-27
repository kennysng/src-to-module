import { dirname, extname } from 'path'
import { Script, createContext } from 'vm'
import Module from 'module'

const transpilers: Transpiler[] = []

export interface Transpiler {
  check(path: string): boolean
  transpile(path: string, code: string): string
  run<T>(path: string, code: string, require: NodeRequire, baseContext: any): T | undefined
  runAsync<T>(path: string, code: string, require: NodeRequire, baseContext: any): Promise<T | undefined>
}

export function registerTranspiler(transpiler: Transpiler) {
  transpilers.push(transpiler)
}

export function unregisterTranspiler(name: string) {
  const index = transpilers.findIndex(t => t.constructor.name === name)
  if (index > -1) transpilers.splice(index, -1)
}

export function getTranspiler(path: string) {
  return transpilers.find(t => t.check(path))
}

export class JsonTranspiler implements Transpiler {
  public check(path: string): boolean {
    return extname(path).toLocaleLowerCase() === '.json'
  }

  public transpile(path: string, code: string): string {
    return code
  }

  public run<T>(path: string, code: string): T {
    return JSON.parse(code)
  }

  public async runAsync<T>(path: string, code: string): Promise<T> {
    return this.run<T>(path, code)
  }
}

export class JsTranspiler implements Transpiler {
  public check(path: string): boolean {
    return extname(path).toLocaleLowerCase() === '.js'
  }

  public transpile(path: string, code: string): string {
    return code
  }

  public run<T>(path: string, code: string, require: NodeRequire, baseContext: any = {}): T | undefined {
    code = Module.wrap(code)
    const context = createContext(Object.assign({}, baseContext, { console, process }))
    const func = new Script(code, { filename: path }).runInContext(context)
    let hasExports = false
    const module_ = {
      exports: new Proxy({}, {
        set: (t, p, v) => {
          hasExports = true
          t[p] = v
          return true
        },
      })
    }
    const module = new Proxy(module_, {
      set: (t, p, v) => {
        if (p === 'exports') hasExports = true
        t[p] = v
        return true
      }
    })
    func(module.exports, require, module, path, dirname(path))
    return hasExports ? module.exports as T : undefined
  }

  public async runAsync<T>(path: string, code: string, require: NodeRequire, baseContext: any = {}): Promise<T | undefined> {
    code = '(async ' + Module.wrap(code).substr(1)
    const context = createContext(Object.assign({}, baseContext, { console, process }))
    const func = new Script(code, { filename: path }).runInContext(context)
    let hasExports = false
    const module_ = {
      exports: new Proxy({}, {
        set: (t, p, v) => {
          hasExports = true
          t[p] = v
          return true
        },
      })
    }
    const module = new Proxy(module_, {
      set: (t, p, v) => {
        if (p === 'exports') hasExports = true
        t[p] = v
        return true
      }
    })
    await func(module.exports, require, module, path, dirname(path))
    return hasExports ? module.exports as T : undefined
  }
}

registerTranspiler(new JsonTranspiler())
registerTranspiler(new JsTranspiler())