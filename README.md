# src-to-module

[![npm version](https://badge.fury.io/js/src-to-module.svg)](https://badge.fury.io/js/src-to-module)

This is a library to load NodeJS script in runtime, either in a file or in plain text. 

----

`enableLastModifiedCheck(value: boolean)`

Whether to enable last modified check on module cache. Enabled by default. If disabled, will always return cached module. 

----

`requireSync(filepath: string, context: any = {})`  
`requireAsync(filepath: string, context: any = {})`

Load modules from file.  
In case you are using `requireAsync`, there will be a `requireAsync` function in global context of the processed file.  
Note that using `await` without `async` will result to syntax error.  
Please check the [example](test/async.js). 

----

`runSync(code: string, filepath: string, context: any = {})`  
`runAsync(code: string, filepath: string, context: any = {})`

Load modules from plain text. A actual/virtual file path should be provided.  
In case this is a virtual file path, by default the cache will be expired after 30 mins if a positive `maxAge` is not provided

----

`registerTranspiler(transpiler: Transpiler)`

Register a transpier to transpile and run script.  
By default `JsTranspiler` and `JsonTranspiler` are registered. 

----

`Transpiler`

```js
interface Transpiler {
  // check from the file path if the file is valid for this transpiler
  check(path: string): boolean

  // transpile the code to, possibly, JavaScript
  transpile(path: string, code: string): string

  // run the transpiled code
  // you should use the one declared in JsTranspiler
  run<T>(path: string, code: string, require: NodeRequire, baseContext: any): T | undefined

  // run the transpiled code in async context
  // you should use the one declared in JsTranspiler
  runAsync<T>(path: string, code: string, require: NodeRequire, baseContext: any): Promise<T | undefined>
}
```