import LruCache, { Options } from 'lru-cache'
import { lstat, lstatSync, Stats } from 'fs'

let enabled = true

export function enableCache() {
  enabled = true
}

export function disableCache(clear = false) {
  enabled = false
  if (clear) cache.reset()
}

export function invalidateCache() {
  cache.reset()
}

let cache: LruCache<string, Metadata>

const DEFAULT_MAX_AGE = 30 * 60 * 1000

export class Metadata {
  private transpiled = false
  private processed = false
  // transpiled = false, processed = false -> source code
  // transpiled = true, processed = false -> transpiled code
  // transpiled = true, processed = true -> module
  private cache: any

  private createdAt = Date.now()

  private dependencies: string[] = []

  constructor(public readonly path: string, private readonly lastModified: number, private readonly maxAge = -1) {
  }

  public set(type: 'source' | 'transpiled' | 'module', cache: any) {
    switch (type) {
      case 'source':
        this.transpiled = false
        this.processed = false
        break
      case 'transpiled':
        this.transpiled = true
        this.processed = false
        break
      case 'module':
        this.transpiled = true
        this.processed = true
        break
    }
    this.cache = cache
  }

  public sourceCode(): string | undefined {
    return !this.transpiled && !this.processed && typeof this.cache === 'string' ? this.cache : undefined
  }

  public transpiledCode(): string | undefined {
    return this.transpiled && !this.processed && typeof this.cache === 'string' ? this.cache : undefined
  }

  public module<T>(): T | undefined {
    return this.transpiled && this.processed && typeof this.cache === 'object' ? this.cache : undefined
  }

  public isModifiedSync(): boolean {
    try {
      // cahce expired
      if (this.maxAge !== -1) throw new Error('FALLBACK')

      // file modified
      const lastModified = lstatSync(this.path).mtime.getDate()
      if (lastModified !== this.lastModified) return true
    }
    catch (e) {
      // virtual file
      const maxAge = this.maxAge === -1 ? DEFAULT_MAX_AGE : this.maxAge
      if (Date.now() > this.createdAt + maxAge) return true
    }

    return false
  }

  public async isModifiedAsync(): Promise<boolean> {
    function lstatP(path: string): Promise<Stats> {
      return new Promise((s, j) => {
        lstat(path, (e, r) => e ? j(e) : s(r))
      })
    }

    try {
      // cache expired
      if (this.maxAge !== -1) throw new Error('FALLBACK')

      // file modified
      const lastModified = (await lstatP(this.path)).mtime.getDate()
      if (lastModified !== this.lastModified) return true
    }
    catch (e) {
      // virtual file
      const maxAge = this.maxAge === -1 ? DEFAULT_MAX_AGE : this.maxAge
      if (Date.now() > this.createdAt + maxAge) return true
    }

    return false
  }

  public isDependencyModifiedSync(): boolean {
    for (const p of this.dependencies) {
      if (!getSync(p)) return true
    }
    return false
  }

  public async isDependencyModifiedAsync(): Promise<boolean> {
    for (const p of this.dependencies) {
      if (!await getAsync(p)) return true
    }
    return false
  }

  public depend(path: string) {
    if (this.dependencies.indexOf(path) === -1) {
      this.dependencies.push(path)
    }
  }

  public get length(): number {
    let length = 1 /* tranpiled */ + 1 /* processed */ + 8 /* lastModified */ + 8 /* createdAt */ + 8 /* maxAge */ + this.path.length
    if (this.cache) length += typeof this.cache === 'string' ? this.cache.length : 16000 // 16KB
    length += this.dependencies.reduce((r, p) => r + p.length, 0)
    return length
  }
}

export function setCacheOptions(options: Options<string, Metadata>, clear = false) {
  const newCache = new LruCache(options)
  if (!clear) newCache.load(cache.dump())
  cache = newCache
}

export function getSync(path: string): Metadata | undefined {
  if (!enabled) return undefined
  const metadata = cache.get(path)
  return !metadata || metadata.isModifiedSync() ? undefined : metadata
}

export async function getAsync(path: string): Promise<Metadata | undefined> {
  if (!enabled) return undefined
  const metadata = cache.get(path)
  return !metadata || await metadata.isModifiedAsync() ? undefined : metadata
}

export function set(path: string, metadata: Metadata) {
  if (enabled) cache.set(path, metadata)
}

// default cache
setCacheOptions({
  max: 64000000, // 64MB
  length: (metadata, key = '') => {
    return metadata.length + key.length
  }
})