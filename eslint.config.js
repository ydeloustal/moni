// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: [
      'expo-env.d.ts',
      'dist/*',
      'coverage/*',
      '.expo/*',
      'android/*',
      'ios/*',
      'public/sw.js',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Network access is forbidden: Moni is 100% offline.' },
        { name: 'XMLHttpRequest', message: 'Network access is forbidden: Moni is 100% offline.' },
        { name: 'WebSocket', message: 'Network access is forbidden: Moni is 100% offline.' },
        { name: 'EventSource', message: 'Network access is forbidden: Moni is 100% offline.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: 'Network access is forbidden.' },
            { name: 'expo-updates', message: 'OTA updates are disabled.' },
            { name: 'expo-web-browser', message: 'No external browsing from the app.' },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.{js,mjs}', 'public/**/*.js', '*.config.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
      },
    },
    rules: { 'no-console': 'off' },
  },
]);
