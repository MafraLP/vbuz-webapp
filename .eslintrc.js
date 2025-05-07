module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 'latest',
  },
  env: {
    node: true,
    browser: true,
  },
  extends: [
    'plugin:vue/vue3-strongly-recommended',
    'prettier',
  ],
  plugins: ['vue'],
  rules: {
    // Desativar regras de tipagem TypeScript
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'prefer-promise-reject-errors': 'off',
    'vue/no-v-text-v-html-on-component': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
  },
}
