import { lstatSync } from 'fs'
import * as fs from 'fs'

const { lstat } = fs.promises

const MAX_CACHE = +(process.env.SRC_TO_MODULE_MAX_CACHE || 128)
const cached: any = new Proxy({} as any, {
  set: (obj, prop, value) => {
    const keys: Array<string|symbol> = obj.keys = obj.keys || []
    const isCached = keys.indexOf(prop) > -1
    if (!isCached && keys.length >= MAX_CACHE) keys.shift()
    obj[prop] = value
    if (!isCached) keys.push(prop)
    return true
  },
})
const dependenciesByFile: { [key: string]: string[] } = {}
const lastModified: { [key: string]: number } = {}

let lastModifiedCheck = true

/**
 * Get cached module asynchronously
 * @param {string} filepath
 * @returns {Promise<T|undefined>} await cached module
 */
export async function get<T = void>(filepath: string, checked: string[] = []): Promise<T | undefined> {
  if (lastModifiedCheck) {
    try {
      const stat = await lstat(filepath)
      if (lastModified[filepath] < stat.mtime.getTime()) {
        return undefined
      }

      // check dependencies
      const dependencies = dependenciesByFile[filepath] || []
      if (!dependencies.every(async (dependency) => checked.indexOf(dependency) === -1 && !!await get(dependency, [...checked, filepath]))) {
        return undefined
      }
    } catch (e) {
      return undefined
    }
  }
  return cached[filepath]
}

/**
 * Set cached module asynchronously
 * @param {string} filepath
 * @param {T} value
 */
export async function set<T = void>(filepath: string, value: T): Promise<void> {
  try {
    const stat = await lstat(filepath)
    lastModified[filepath] = stat.mtime.getTime()
  } catch (e) {
    // do nothing
  }
  cached[filepath] = value
}

/**
 * Get cached module synchronously
 * @param {string} filepath
 * @returns {T|undefined} cached module
 */
export function getSync<T = void>(filepath: string, checked: string[] = []): T | undefined {
  if (lastModifiedCheck) {
    try {
      const stat = lstatSync(filepath)
      if (lastModified[filepath] < stat.mtime.getTime()) {
        return undefined
      }

      // check dependencies
      const dependencies = dependenciesByFile[filepath] || []
      for (let i = 0; i < dependencies.length; i += 1) {
        if (checked.indexOf(dependencies[i]) === -1 && !getSync(dependencies[i], [...checked, filepath])) {
          return undefined
        }
      }
    } catch (e) {
      return undefined
    }
  }
  return cached[filepath]
}

/**
 * Set cached module synchronously
 * @param {string} filepath
 * @param {T} value
 */
export function setSync<T = void>(filepath: string, value: T) {
  try {
    const stat = lstatSync(filepath)
    lastModified[filepath] = stat.mtime.getTime()
  } catch (e) {
    // do nothing
  }
  cached[filepath] = value
}

/**
 * Record dependency between files
 * @param {string} filepath
 * @param {string} dependency
 */
export function setDependency(filepath: string, dependency: string) {
  if (!dependenciesByFile[filepath]) dependenciesByFile[filepath] = []
  const dependencies = dependenciesByFile[filepath]
  if (dependencies.indexOf(dependency) === -1) dependencies.push(dependency)
}

/**
 * Reset dependencies of the given file
 * @param {string} filepath
 */
export function clearDependency(filepath: string) {
  delete dependenciesByFile[filepath]
}

/**
 * @returns {boolean} whether last modified check is enabled
 */
export function isLastModifiedCheckEnabled() {
  return lastModifiedCheck
}

/**
 * Enable or disable last modified check. Enabled by default
 * @param value {boolean}
 */
export function enableLastModifiedCheck(value: boolean) {
  lastModifiedCheck = value
}
