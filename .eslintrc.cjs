module.exports = {
    root: true,

    env: {
        es6: true,
        node: true,
        amd: true
    },
  
    extends: [
        'eslint:recommended'
    ],

    parser: "@typescript-eslint/parser",

    parserOptions: {
        ecmaVersion: 2018
    },

    rules: {
        'no-console': 0,
        'no-debugger': 0,
        'semi': [2, 'never'],
        'indent': [2, 4],
        'no-use-before-define': [2, { 'functions': false }],
        'padded-blocks': 0,
        'no-undef': 0,
        'no-unused-vars': 0,
        'no-constant-condition': ["error", { "checkLoops": false }]
    },

    ignorePatterns: [
        'build/*',
        'node_modules/*'
    ]
}
