# src-to-module

[![npm version](https://badge.fury.io/js/src-to-module.svg)](https://badge.fury.io/js/src-to-module)

This is a library to load NodeJS script in runtime, either in a file or in plain text. 

----

`enableCache()`

Enable in-memory cache on source codes, transpiled codes and exported modules. 

----

`disableCache()`

Disable in-memory cache. 

----

`invalidateCache()`

Clear in-memory cache. 

----

`setCacheOptions(options: Options<string, Metadata>, clear = false)`

Set lru-cache options. Please check [lru-cache](https://www.npmjs.com/package/lru-cache).  
When `clear = true`, the existing cache will not be inherited. 

----

`requireSync(filepath: string, baseContext: any = {}, maxAge?: number)`  
`requireAsync(filepath: string, baseContext: any = {}, maxAge?: number)`

Load modules from file.  
When a positive `maxAge` is provided, the cache will be expired after `Date.now() + maxAge`.  
Note that `maxAge` will not be applied if a cache for this file already exists. 

----

`runSync(code: string, filepath: string, baseContext: any = {}, maxAge?: number)`  
`runAsync(code: string, filepath: string, baseContext: any = {}, maxAge?: number)`

Load modules from plain text. A actual/virtual file path should be provided.  
When a positive `maxAge` is provided, the cache will be expired after `Date.now() + maxAge`.  
Note that `maxAge` will not be applied if a cache for this file already exists.  
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