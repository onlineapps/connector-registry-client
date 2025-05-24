// .eslintrc.js
// ESLint configuration using Airbnb style guide and Prettier integration

module.exports = {
    root: true,
    env: {
      node: true,
      jest: true,
      es6: true
    },
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'script'
    },
    extends: [
      'airbnb-base',              // základní pravidla Airbnb pro JavaScript
      'plugin:prettier/recommended' // propojení s Prettier pro formátování
    ],
    plugins: [
      'import'                    // kontrola import/export syntaxe
    ],
    rules: {
      // Povolit console.log pro jednoduché logování
      'no-console': 'off',
  
      // Ukončení souboru novým řádkem
      'eol-last': ['error', 'always'],
  
      // Povolit vulnerabilní require v testech a konfiguracích
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: ['**/test/**/*.js', '**/*.spec.js', 'examples/**', 'docs/**']
      }],
  
      // Mírnější pravidlo pro maximální délku řádku, Prettier se o to postará
      'max-len': ['warn', { code: 100 }]
    }
  };
  