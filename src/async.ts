import { resolvePath, requireSync } from './sync'
import { Metadata, getAsync, set } from './cache'
import { lstat, readFile, Stats } from 'fs'
import { extname, isAbsolute } from 'path'
import { Module } from 'module'
import { getTranspiler } from './transpiler'
import debug from 'debug'
import { IRequireOptions } from './interface'

const log = debug('src-to-module:async')

function lstatP(filepath: string): Promise<Stats> {
  return new Promise((s, j) => {
    lstat(filepath, (e, st) => e ? j(e) : s(st))
  })
}

function readFileP(filepath: string): Promise<string> {
  return new Promise((s, j) => {
    readFile(filepath, 'utf8', (e, d) => e ? j(e) : s(d))
  })
}

export async function requireAsync<T>(filepath: string, options: IRequireOptions = {}): Promise<T | undefined> {
  const { cacheLevel = 'module', maxAge } = options

  // resolve file path
  filepath = resolvePath(filepath)

  // check file exists
  const stat = await lstatP(filepath)
  if (!stat.isFile()) throw new Error(`'${filepath}' is not a file`)

  // from cache
  let metadata = await getAsync(filepath)

  // create metadata
  if (!metadata) {
    set(filepath, metadata = new Metadata(filepath, stat.mtime.getTime(), maxAge))
  }

  // is cached
  if (cacheLevel === 'module' && metadata.module && !await metadata.isDependencyModifiedAsync()) {
    return metadata.module
  }

  // get code
  const code = cacheLevel === 'none' || !metadata.sourceCode ? await readFileP(filepath) : metadata.sourceCode

  // run the code
  return runAsync_(true, code, filepath, options)
}

export async function runAsync<T>(code: string, filepath: string, options: IRequireOptions = {}): Promise<T | undefined> {
  return await runAsync_(false, code, filepath, options)
}

async function runAsync_<T>(noCache: boolean, code: string, filepath: string, options: IRequireOptions = {}): Promise<T | undefined> {
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
    let metadata = await getAsync(filepath)

    // get last modified time
    let mtime = 0
    try {
      const stat = await lstatP(filepath)
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
    if (!noCache && cacheLevel === 'module' && metadata.module && !await metadata.isDependencyModifiedAsync()) {
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
    const module = await transpiler.runAsync<T>(filepath, code, newRequire, {
      ...baseContext,
      requireAsync: async function<R>(filepath: string): Promise<R | undefined> {
        // from node_modules
        if (!isAbsolute(filepath) && !filepath.startsWith('.')) {
          return require(filepath)
        }

        // from file system
        (metadata as Metadata).depend(filepath = newRequire.resolve(filepath))
        return await requireAsync<R>(filepath, baseContext)
      },
    })
    if (cacheLevel === 'module') metadata.module = module

    return module
  }
  finally {
    log('run "%s" elapsed: %d ms', filepath, Date.now() - start)
  }
}

global.requireAsync = requireAsync
