import { dirname, extname } from 'path'
import { Script, createContext } from 'vm'

const transpilers: Transpiler[] = []

export interface Transpiler {
  check(path: string): boolean
  transpile(code: string): string
  run<T>(path: string, code: string, baseContext: any): T
}

export function registerTranspiler(transpiler: Transpiler) {
  if (!transpilers.find(t => t.constructor === transpiler.constructor)) {
    transpilers.push(transpiler)
  }
}

export function getTranspiler(path: string) {
  return transpilers.find(t => t.check(path))
}

export class JsonTranspiler implements Transpiler {
  public check(path: string): boolean {
    return extname(path).toLocaleLowerCase() === '.json'
  }

  public transpile(code: string): string {
    return code
  }

  public run<T>(code: string): T {
    return JSON.parse(code)
  }
}

export class JsTranspiler implements Transpiler {
  public check(path: string): boolean {
    return extname(path).toLocaleLowerCase() === '.js'
  }

  public transpile(code: string): string {
    return code
  }

  public run<T>(path: string, code: string, baseContext: any = {}): T {
    const context = createContext(
      Object.assign({}, baseContext, {
        __dirname: dirname(path),
        __filename: path,
        console,
        process,
        exports: {},
      })
    )
    new Script(code, { filename: path }).runInContext(context)
    return context.exports
  }
}

registerTranspiler(new JsonTranspiler())
registerTranspiler(new JsTranspiler())