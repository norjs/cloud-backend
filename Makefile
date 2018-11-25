all: build
build:
	npm run -s compile
install:
	npm install -g .
clean:
	rm -rf ./dist/
