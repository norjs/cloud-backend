#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"
require(require("path").join(__dirname, "../dist/main.js"));
