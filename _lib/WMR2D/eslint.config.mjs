import globals from 'globals';
import stylistic from '@stylistic/eslint-plugin';
import parser from '@typescript-eslint/parser';

// TODO: figure out https://typescript-eslint.io/getting-started/typed-linting/

export default [
  {
    languageOptions: {
      parser: parser,
      parserOptions: { project: true },
      globals: globals.browser
    },
    files: [ '**/*.ts' ],
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/array-bracket-spacing': [ 'error', 'always', { 'singleValue': true, 'arraysInArrays': false } ],
      '@stylistic/arrow-parens': [ 'error', 'as-needed', { 'requireForBlockBody': true } ],
      '@stylistic/arrow-spacing': [ 'error', { 'after': true, 'before': true } ],
      '@stylistic/block-spacing': [ 'error', 'always' ],
      '@stylistic/brace-style': [ 'error', '1tbs', { 'allowSingleLine': true } ],
      '@stylistic/comma-dangle': [ 'error', 'always-multiline' ],
      '@stylistic/comma-spacing': [ 'error', { 'before': false, 'after': true } ],
      '@stylistic/comma-style': [ 'error', 'last' ],
      '@stylistic/computed-property-spacing': [ 'error', 'never', { 'enforceForClassMembers': true } ],
      '@stylistic/dot-location': [ 'error', 'property' ],
      '@stylistic/eol-last': 'error',
      '@stylistic/function-call-spacing': [ 'error', 'never' ],
      '@stylistic/indent': [ 'error', 'tab', { 'SwitchCase': 1 } ],
      '@stylistic/key-spacing': [ 'error', { 'afterColon': true, 'beforeColon': false } ],
      '@stylistic/keyword-spacing': [ 'error', { 'after': true, 'before': true } ],
      '@stylistic/lines-between-class-members': [ 'error', 'always', { 'exceptAfterSingleLine': true } ],
      '@stylistic/max-statements-per-line': [ 'error', { 'max': 1 } ],
      '@stylistic/new-parens': 'error',
      '@stylistic/no-extra-parens': [ 'error', 'functions' ],
      '@stylistic/no-extra-semi': 'error',
      '@stylistic/no-floating-decimal': 'error',
      '@stylistic/no-mixed-spaces-and-tabs': 'error',
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': [ 'error', { 'max': 1, 'maxBOF': 0, 'maxEOF': 0 } ],
      '@stylistic/no-trailing-spaces': [ 'error', { 'skipBlankLines': false } ],
      '@stylistic/no-whitespace-before-property': 'error',
      '@stylistic/object-curly-spacing': [ 'error', 'always' ],
      '@stylistic/operator-linebreak': [ 'error', 'before' ],
      '@stylistic/padded-blocks': [ 'error', { 'blocks': 'always', 'switches': 'always', 'classes': 'always' } ],
      '@stylistic/padding-line-between-statements': [ 'error', { 'blankLine': 'always', 'prev': 'block-like', 'next': '*' } ],
      '@stylistic/quote-props': [ 'error', 'consistent' ],
      '@stylistic/quotes': [ 'error', 'single', { 'allowTemplateLiterals': true, 'avoidEscape': false } ],
      '@stylistic/rest-spread-spacing': [ 'error', 'never' ],
      '@stylistic/semi': [ 'error', 'always', { 'omitLastInOneLineBlock': true } ],
      '@stylistic/semi-spacing': [ 'error', { 'after': true, 'before': false } ],
      '@stylistic/space-before-blocks': [ 'error', { 'functions': 'always', 'keywords': 'always', 'classes': 'always' } ],
      '@stylistic/space-before-function-paren': [ 'error', { 'anonymous': 'always', 'named': 'never', 'asyncArrow': 'ignore' } ],
      '@stylistic/space-in-parens': [ 'error', 'always' ],
      '@stylistic/space-infix-ops': [ 'error' ],
      '@stylistic/space-unary-ops': [ 'error', { 'words': true, 'nonwords': true } ],
      '@stylistic/spaced-comment': [ 'error', 'always', { 'block': { 'balanced': true, 'exceptions': [ '*' ], 'markers': [ '!' ] }, 'line': { 'exceptions': [ '/', '#' ], 'markers': [ '/' ] } } ],
      '@stylistic/template-curly-spacing': 'error',
      '@stylistic/template-tag-spacing': [ 'error', 'never' ],
      '@stylistic/type-annotation-spacing': [ 'error', {} ],
      '@stylistic/type-generic-spacing': 'error',
      '@stylistic/type-named-tuple-spacing': 'error',
      '@stylistic/wrap-iife': [ 'error', 'any', { 'functionPrototypeMethods': true } ],
      '@stylistic/yield-star-spacing': [ 'error', 'both' ],
    }
  }
];

// {
//   files: ['**/*.ts'],
//   rules: typedRules,
// },
// {
//   files: ['**/*.js', '**/*.mjs'],
//   ...tseslint.configs.disableTypeChecked,
// },
