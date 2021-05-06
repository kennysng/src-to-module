import { Module } from 'module'
import { extname, isAbsolute, resolve } from 'path'
import { Transpiler } from './interface'

// Registered transpilers
const transpilers: Transpiler[] = []

/**
 * Check whether the given value is null or undefined
 * @param v {any}
 * @returns {boolean} whether the value is null or undefined
 */
export function isNullOrUndefined(v: any): boolean {
  return v === null || v === undefined
}

/**
 * Resolve module path
 * @param {string} filepath
 * @returns {string} resolved path
 */
export function resolvePath(filepath: string): string {
  // resolve relative path
  if (!isAbsolute(filepath)) filepath = resolve(__dirname, filepath)

  // resolve extension
  if (!extname(filepath)) {
    const newRequire = Module.createRequire(filepath)
    filepath = newRequire.resolve(filepath)
  }

  return filepath
}

/**
 * Register transpiler. Can be overwritten
 * @param {Transpiler} transpiler
 */
export function registerTranspiler(transpiler: Transpiler) {
  transpilers.push(transpiler)
}

/**
 * Get the target transpiler with the given file path
 * @param {string} path
 * @returns {(Transpiler|undefined)} available transpiler
 */
export function getTranspiler(path: string) {
  return transpilers.find((t) => t.check(path))
}

// Registered path processors
export const processors: ((value: string) => string)[] = []

/**
 * Register path processor
 * @param {(value: string) => string} func
 */
export function registerProcessor(func: (value: string) => string) {
  processors.push(func)
}
