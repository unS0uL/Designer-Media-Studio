import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'output/**', 'input/**', '.playwright-mcp/**'],
  },
  js.configs.recommended,
  {
    // Node-side: CLI scripts, Vite config, tests
    files: ['scripts/**/*.js', 'vite.config.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Deliberate project pattern: optional-feature detection (e.g. `which
      // sips`) and best-effort cleanup swallow errors on purpose.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ['scripts/**/*.ts'],
  })),
  {
    // Node-side TypeScript (currently: scripts/engine.ts)
    files: ['scripts/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Browser-side: the Web UI itself
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Deliberate project pattern: localStorage access is wrapped for
      // private-browsing / storage-blocked environments.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
