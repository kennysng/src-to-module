/**
 * Transpiler for loading, transpiling and running code
 */
export interface Transpiler {
  /**
   * Check whether the given file can be transpiled by this transpiler
   * @param path {string}
   * @returns {boolean} whether the given path can be transpiled
   */
  check(path: string): boolean

  /**
   * Transpile the given code
   * @param path {string}
   * @param code {string}
   */
  transpile(path: string, code: string): string

  /**
   * Run the given code sychronously
   * @param path {string}
   * @param code {string}
   * @param require {NodeRequire}
   * @param context {any}
   * @returns {T} exported module
   */
  run<T = void>(path: string, code: string, require: NodeRequire, context: any): T

  /**
   * Run the given code asychronously
   * @param path {string}
   * @param code {string}
   * @param require {NodeRequire}
   * @param context {any}
   * @returns {Promise<T>} await exported module
   */
  runAsync<T = void>(path: string, code: string, require: NodeRequire, context: any): Promise<T>
}
