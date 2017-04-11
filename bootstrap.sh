#!/bin/bash
rm -r furipota 2> /dev/null
cp -R source furipota
./node_modules/.bin/ometajs2js --beautify < furipota/parser.ometajs > furipota/parser.js

