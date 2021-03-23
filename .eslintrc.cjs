module.exports = {
    root: true,

    env: {
        es6: true,
        node: true,
        amd: true
    },
  
    extends: [
        'plugin:@typescript-eslint/recommended'
    ],

    plugins: ['@typescript-eslint'],

    parser: '@typescript-eslint/parser',

    parserOptions: {
        ecmaVersion: 2018
    },

    rules: {
        'no-console': 0,
        'no-debugger': 0,
        '@typescript-eslint/semi': [2, 'never'],
        '@typescript-eslint/indent': [2, 4, {'SwitchCase': 1}],
        'no-use-before-define': [2, { 'functions': false }],
        'padded-blocks': 0,
        'no-undef': 0,
        '@typescript-eslint/no-unused-vars': 0,
        "@typescript-eslint/explicit-module-boundary-types": 0,
        "@typescript-eslint/no-empty-interface": 0,
        "@typescript-eslint/no-explicit-any": 0,
        'no-constant-condition': ['error', { 'checkLoops': false }],
        'constructor-super': 0
    },

    ignorePatterns: [
        'build/*',
        'node_modules/*'
    ]
}
