import debug from 'debug'
import * as fs from 'fs'
import { Module } from 'module'
import { extname, isAbsolute } from 'path'
import {
  clearDependency, get, set, setDependency,
} from './cache'
import { getTranspiler, resolvePath } from './common'
import { requireSync } from './sync'

const log = debug('src-to-module:async')
const { lstat, readFile } = fs.promises

async function baseRun<T = void, C = any>(code: string, filepath: string, context?: C): Promise<T> {
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

        const resolved = target.resolve(requirePath)
        log('resolve "%s"', resolved)

        // from node_modules
        if (!isAbsolute(requirePath) && !requirePath.startsWith('.')) {
          // eslint-disable-next-line global-require
          return require(requirePath)
        }

        setDependency(filepath, requirePath = resolved)

        // try typescript
        if (extname(requirePath) === '.ts') {
          try { return target(requirePath) } catch (e) { /* do nothing */ }
        }

        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return requireSync(requirePath, context)
      },
    })
    const module = await transpiler.runAsync<T>(filepath, code, newRequire, {
      ...context,
      async requireAsync<R = void>(requirePath: string): Promise<R> {
        // from node_modules
        if (!isAbsolute(requirePath) && !requirePath.startsWith('.')) {
          // eslint-disable-next-line global-require
          return require(requirePath)
        }

        setDependency(filepath, requirePath = newRequire.resolve(requirePath))

        // try typescript
        if (extname(requirePath) === '.ts') {
          try { return newRequire(requirePath) } catch (e) { /* do nothing */ }
        }

        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return requireAsync<R, C>(requirePath, context)
      },
    })

    return module
  } finally {
    log('run "%s" elapsed: %d ms', filepath, Date.now() - start)
  }
}

/**
 * Run the given script file asynchronously
 * @param {string} filepath
 * @param {C} context
 * @returns {Promise<T>} await exported module
 */
export async function requireAsync<T = void, C = any>(filepath: string, context?: C): Promise<T> {
  // resolve file path
  filepath = resolvePath(filepath)

  // check file exists
  const stat = await lstat(filepath)
  if (!stat.isFile()) throw new Error(`'${filepath}' is not a file`)

  // check cache
  const cached = await get(filepath)
  if (cached) return cached
  clearDependency(filepath)

  // get code
  const code = await readFile(filepath, 'utf8')

  // run the code
  const module = await baseRun<T, C>(code, filepath, context)
  await set(filepath, module)
  return module
}

/**
 * Run the given code asynchronously
 * @param {string} code
 * @param {string} filepath a path is required for loading any relative dependencies
 * @param {C} context
 * @returns {Promise<T>} await exported module
 */
export async function runAsync<T = void, C = any>(code: string, filepath: string, context?: C): Promise<T> {
  return baseRun<T, C>(code, filepath, context)
}
