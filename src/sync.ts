import { Metadata, getSync, set } from './cache'
import { lstatSync, readFileSync } from 'fs'
import { extname, isAbsolute, resolve } from 'path'
import { Module } from 'module'
import { getTranspiler } from './transpiler'
import debug from 'debug'
import { IRequireOptions } from './interface'

const log = debug('src-to-module:sync')

export function requireSync<T>(filepath: string, options: IRequireOptions = {}): T | undefined {
  const { cacheLevel = 'module', maxAge } = options

  // resolve file path
  filepath = resolvePath(filepath)

  // check file exists
  const stat = lstatSync(filepath)
  if (!stat.isFile()) throw new Error(`'${filepath}' is not a file`)

  // from cache
  let metadata = getSync(filepath)

  // create metadata
  if (!metadata) {
    set(filepath, metadata = new Metadata(filepath, stat.mtime.getTime(), maxAge))
  }

  // is cached
  if (cacheLevel === 'module' && metadata.module && !metadata.isDependencyModifiedSync()) {
    return metadata.module
  }

  // get code
  const code = cacheLevel === 'none' || !metadata.sourceCode ? readFileSync(filepath, 'utf8') : metadata.sourceCode

  // run the code
  return runSync_(true, code, filepath, options) as T
}

export function runSync<T>(code: string, filepath: string, options: IRequireOptions = {}): T | undefined {
  return runSync_(false, code, filepath, options)
}

export function resolvePath(filepath: string): string {
  // resolve relative path
  if (!isAbsolute(filepath)) filepath = resolve(__dirname, filepath)

  // resolve extension
  if (!extname(filepath)) {
    const require_ = Module.createRequire(filepath)
    filepath = require_.resolve(filepath)
  }

  return filepath
}

function runSync_<T>(noCache: boolean, code: string, filepath: string, options: IRequireOptions): T | undefined {
  const start = Date.now()
  try {
    const { baseContext = {}, cacheLevel = 'module', maxAge } = options

    // resolve file path
    filepath = resolvePath(filepath)

    // get transpiler
    const transpiler = getTranspiler(filepath)
    if (!transpiler) {
      const ext = extname(filepath)
      throw new Error(ext ? `'${extname(filepath)}' file not supported` : `file must have extension: '${filepath}'`)
    }

    // from cache
    let metadata = getSync(filepath)

    // get last modified time
    let mtime = 0
    try {
      const stat = lstatSync(filepath)
      if (!stat.isFile()) throw new Error(`'${filepath}' is not a file`)
      mtime = stat.mtime.getTime()
    }
    catch (e) {
      // virtual file
    }

    // create metadata
    if (!metadata) {
      set(filepath, metadata = new Metadata(filepath, mtime, maxAge))
      if (cacheLevel !== 'none') metadata.sourceCode = code
    }

    // is cached
    if (!noCache && cacheLevel === 'module' && metadata.module && !metadata.isDependencyModifiedSync()) {
      log('run "%s" from cache', filepath)
      return metadata.module
    }

    // transpile code
    const cacheTranspiled = ['transpiled', 'module'].indexOf(cacheLevel) > -1
    code = noCache || !cacheTranspiled || !metadata.transpiledCode ? transpiler.transpile(filepath, code) : metadata.transpiledCode
    if (cacheTranspiled) metadata.transpiledCode = code

    // run code
    const newRequire = new Proxy(Module.createRequire(filepath), {
      apply(target: NodeRequire, thisArg: any, argArray: any[]) {
        let filepath = argArray[0] as string
        
        // from node_modules
        if (!isAbsolute(filepath) && !filepath.startsWith('.')) {
          return require(filepath)
        }

        // from file system
        (metadata as Metadata).depend(filepath = target.resolve(filepath))
        return requireSync(filepath, options)
      },
    })
    const module = transpiler.run<T>(filepath, code, newRequire, { ...baseContext })
    if (cacheLevel === 'module') metadata.module = module

    return module
  }
  finally {
    log('run "%s" elapsed: %d ms', filepath, Date.now() - start)
  }
}