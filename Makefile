install:
	npm install

install-local:
	npm link

publish:
	npm publish --dry-run

lint:
	npx eslint .

test:
	npm test

test-debug-nock:
	DEBUG=nock.* npm test
test-debug-axios:
	DEBUG=axios npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8