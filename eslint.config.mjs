import stylistic from '@stylistic/eslint-plugin'
import { FlatCompat } from '@eslint/eslintrc'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname
})

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**']
  },
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  {
    files: ['**/*.ts'],
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/member-delimiter-style': ['error', {
        multiline: {
          delimiter: 'none'
        }
      }]
    }
  }
] 