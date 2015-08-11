#!/bin/sh

mkdir -p resources

if [ ! -d "node_modules/babel-core" ]; then
    npm install --save-dev babel-core
fi
