import { resolvePath, requireSync } from './sync'
import { Metadata, getAsync, set } from './cache'
import { lstat, readFile, Stats } from 'fs'
import { extname, isAbsolute, resolve } from 'path'
import { Module } from 'module'
import { getTranspiler } from './transpiler'

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

export async function requireAsync<T>(filepath: string, baseContext: any = {}): Promise<T> {
  // resolve file path
  filepath = resolvePath(filepath)

  // check file exists
  const stat = await lstatP(filepath)
  if (!stat.isFile()) throw new Error(`'${filepath}' is not a file`)

  // from cache
  let metadata = await getAsync(filepath)

  // create metadata
  if (!metadata) {
    set(filepath, metadata = new Metadata(filepath, stat.mtime.getDate()))
  }

  // no cache, or dependency modified
  if (!metadata.module() || await metadata.isDependencyModifiedAsync()) {
    // no source code
    if (!metadata.sourceCode()) {
      metadata.set('source', await readFileP(filepath))
    }

    // run code
    const code = metadata.sourceCode() as string
    metadata.set('module', runAsync_(true, code, filepath, baseContext))
  }

  // return cache
  return metadata.module() as T
}

export async function runAsync<T>(code: string, filepath: string, baseContext: any = {}): Promise<T> {
  return await runAsync_(false, code, filepath, baseContext)
}

async function runAsync_<T>(noCache: boolean, code: string, filepath: string, baseContext: any): Promise<T> {
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
    mtime = stat.mtime.getDate()
  }
  catch (e) {
    // virtual file
  }

  // create metadata
  if (!metadata) {
    set(filepath, metadata = new Metadata(filepath, mtime))
    metadata.set('source', code)
  }

  // no cache, or dependency modified
  if (noCache || !metadata.module() || await metadata.isDependencyModifiedAsync()) {
    // no transpiled code
    if (!metadata.transpiledCode()) {
      metadata.set('transpiled', transpiler.transpile(code))
    }

    // run code
    code = metadata.transpiledCode() as string
    const newRequire = Module.createRequire(filepath)
    metadata.set('module', transpiler.run(filepath, code, {
      ...baseContext,
      require: function<R>(filepath: string): R {
        // from node_modules
        if (!isAbsolute(filepath) && !filepath.startsWith('.')) {
          return require(filepath)
        }

        // from file system
        (metadata as Metadata).depend(filepath = newRequire.resolve(filepath))
        return requireSync<R>(filepath, baseContext)
      },
      requireAsync: async function<R>(filepath: string): Promise<R> {
        // from node_modules
        if (!isAbsolute(filepath) && !filepath.startsWith('.')) {
          return require(filepath)
        }

        // from file system
        (metadata as Metadata).depend(filepath = newRequire.resolve(filepath))
        return await requireAsync<R>(filepath, baseContext)
      },
    }))
  }

  // return cache
  return metadata.module() as T
}