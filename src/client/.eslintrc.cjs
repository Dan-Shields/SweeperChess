module.exports = {
    env: {
        browser: true,
        es6: true
    },
    extends: [
        'plugin:vue/vue3-recommended',
        '@vue/typescript'
    ],
    rules: {
        'vue/v-bind-style': 1,
        'vue/v-on-style': 1,
        'vue/no-v-html': 1,
        'vue/html-self-closing': [2, {
            'html': {
                'component': 'always',
                'normal': 'never'
            }
        }],
        'vue/attribute-hyphenation': 0,
        'vue/html-indent': [2, 4],
        'vue/max-attributes-per-line': [1, {
            'singleline': 3
        }]
    }
}
