import debug from 'debug'
import { readFileSync, lstatSync } from 'fs'
import { Module } from 'module'
import { extname, isAbsolute } from 'path'
import {
  clearDependency, getSync, setDependency, setSync,
} from './cache'
import { getTranspiler, processors, resolvePath } from './common'

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

        let resolved: string
        try {
          resolved = target.resolve(requirePath)
        } catch (e) {
          resolved = require.resolve(requirePath)
        }
        log('resolve "%s"', resolved)
        resolved = processors.reduce((r, f) => f(r), resolved)

        // from node_modules
        if (!isAbsolute(requirePath) && !requirePath.startsWith('.')) {
          // eslint-disable-next-line global-require
          return require(resolved.indexOf('node_modules/') === -1 ? resolved : requirePath)
        }

        setDependency(filepath, requirePath = resolved)

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

  // check cache
  const cached = getSync<T>(filepath)
  if (cached) return cached
  clearDependency(filepath)

  // get code
  const code = readFileSync(filepath, 'utf8')

  // run the code
  const module = baseRun<T, C>(code, filepath, context)
  setSync(filepath, module)
  return module
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
