import { Metadata, getSync, set } from './cache'
import { lstatSync, readFileSync } from 'fs'
import { extname, isAbsolute, resolve } from 'path'
import { Module } from 'module'
import { getTranspiler } from './transpiler'

export function requireSync<T>(filepath: string, baseContext: any = {}): T {
  // resolve file path
  filepath = resolvePath(filepath)

  // check file exists
  const stat = lstatSync(filepath)
  if (!stat.isFile()) throw new Error(`'${filepath}' is not a file`)

  // from cache
  let metadata = getSync(filepath)

  // create metadata
  if (!metadata) {
    set(filepath, metadata = new Metadata(filepath, stat.mtime.getDate()))
  }

  // no cache, or dependency modified
  if (!metadata.module() || metadata.isDependencyModifiedSync()) {
    // no source code
    if (!metadata.sourceCode()) {
      metadata.set('source', readFileSync(filepath, 'utf8'))
    }

    // run code
    const code = metadata.sourceCode() as string
    metadata.set('module', runSync_(true, code, filepath, baseContext))
  }

  // return cache
  return metadata.module() as T
}

export function runSync<T>(code: string, filepath: string, baseContext: any = {}): T {
  return runSync_(false, code, filepath, baseContext)
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

function runSync_<T>(noCache: boolean, code: string, filepath: string, baseContext: any): T {
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
  if (noCache || !metadata.module() || metadata.isDependencyModifiedSync()) {
    // no transpiled code
    if (!metadata.transpiledCode()) {
      metadata.set('transpiled', transpiler.transpile(code))
    }

    // run code
    code = metadata.transpiledCode() as string
    const newRequire = new Proxy(Module.createRequire(filepath), {
      apply(target: NodeRequire, thisArg: any, argArray: any[]) {
        let filepath = argArray[0] as string
        
        // from node_modules
        if (!isAbsolute(filepath) && !filepath.startsWith('.')) {
          return require(filepath)
        }

        // from file system
        (metadata as Metadata).depend(filepath = target.resolve(filepath))
        return requireSync(filepath, baseContext)
      },
    })
    metadata.set('module', transpiler.run<T>(filepath, code, newRequire, { ...baseContext }))
  }

  // return cache
  return metadata.module() as T
}