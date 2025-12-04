module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react-refresh/recommended', // keep exactly this
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
    // ❌ removed `project: './tsconfig.json'`
  },
  plugins: ['react', '@typescript-eslint', 'react-refresh'],
  rules: {
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-console': 'warn',
    'react-refresh/only-export-components': 'warn'
  },
  settings: {
    react: { version: 'detect' }
  }
};
