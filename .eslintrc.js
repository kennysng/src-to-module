module.exports = {
  root: true,
  env: {
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      './tsconfig.json',
      './tsconfig.test.json'
    ]
  },
  ignorePatterns: [
    '.eslintrc.js'
  ],
  plugins: [
    '@typescript-eslint',
    'jest'
  ],
  extends: [
    'airbnb-typescript/base',
    'plugin:jest/recommended'
  ],
  rules: {
    '@typescript-eslint/semi': ['warn', 'never'],
    'class-methods-use-this': 0,
    'import/no-dynamic-require': 0,
    'import/prefer-default-export': 0,
    'max-len': 0,
    'no-multi-assign': 0,
    'no-param-reassign': 0
  }
}