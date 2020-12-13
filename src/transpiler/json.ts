import { extname } from 'path'
import { Transpiler } from '../interface'

/**
 * Transpiler loading .json files
 */
export class JsonTranspiler implements Transpiler {
  /**
   * @override
   */
  public check(path: string): boolean {
    return extname(path).toLocaleLowerCase() === '.json'
  }

  /**
   * @override
   */
  public transpile(path: string, code: string): string {
    return code
  }

  /**
   * @override
   */
  public run<T>(path: string, code: string): T {
    return JSON.parse(code)
  }

  /**
   * @override
   */
  public async runAsync<T>(path: string, code: string): Promise<T> {
    return this.run<T>(path, code)
  }
}
