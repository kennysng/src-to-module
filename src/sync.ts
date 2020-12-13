import debug from 'debug'
import { readFileSync, lstatSync } from 'fs'
import { Module } from 'module'
import { extname, isAbsolute } from 'path'
import { getTranspiler, resolvePath } from './common'

const log = debug('src-to-module:sync')

function baseRun<T = void, C = any>(code: string, filepath: string, context?: C): T {
  const start = Date.now()
  try {
    // resolve file path
    filepath = resolvePath(filepath)

    // get transpiler
    const transpiler = getTranspiler(filepath)
    if (!transpiler) {
      const ext = extname(filepath)
      throw new Error(ext ? `'${extname(filepath)}' file not supported` : `file must have extension: '${filepath}'`)
    }

    // transpile code
    code = transpiler.transpile(filepath, code)

    // run code
    const newRequire = new Proxy(Module.createRequire(filepath), {
      apply(target: NodeRequire, thisArg: any, argArray: any[]) {
        let requirePath = argArray[0] as string

        // from node_modules
        if (!isAbsolute(requirePath) && !requirePath.startsWith('.')) {
          // eslint-disable-next-line global-require
          return require(requirePath)
        }

        requirePath = target.resolve(requirePath)

        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return requireSync(requirePath, context)
      },
    })
    const module = transpiler.run<T>(filepath, code, newRequire, context)

    return module
  } finally {
    log('run "%s" elapsed: %d ms', filepath, Date.now() - start)
  }
}

/**
 * Run the given script file synchronously
 * @param {string} filepath
 * @param {C} context
 * @returns {T} exported module
 */
export function requireSync<T = void, C = any>(filepath: string, context?: C): T {
  // resolve file path
  filepath = resolvePath(filepath)

  // check file exists
  const stat = lstatSync(filepath)
  if (!stat.isFile()) throw new Error(`'${filepath}' is not a file`)

  // get code
  const code = readFileSync(filepath, 'utf8')

  // run the code
  return baseRun(code, filepath, context)
}

/**
 * Run the given code synchronously
 * @param {string} code
 * @param {string} filepath a path is required for loading any relative dependencies
 * @param {C} context
 * @returns {T} exported module
 */
export function runSync<T = void, C = any>(code: string, filepath: string, context?: C): T {
  return baseRun<T, C>(code, filepath, context)
}
