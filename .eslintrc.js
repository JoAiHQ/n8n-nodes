module.exports = {
	root: true,
	env: {
		browser: true,
		es6: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: 'tsconfig.json',
		sourceType: 'module',
		ecmaVersion: 2019,
	},
	plugins: [
		'n8n-nodes-base',
	],
	extends: [
		'plugin:n8n-nodes-base/community',
	],
	rules: {
		'n8n-nodes-base/node-param-default-missing': 'error',
		'n8n-nodes-base/node-param-description-missing-from-dynamic-multi-options': 'error',
	},
};
