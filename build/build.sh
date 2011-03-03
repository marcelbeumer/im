#!/bin/sh
files="im.core.js im.dom.js im.events.js im.css.js im.selector.js im.scan.js im.boot.js"
cat $(printf "../src/%s " $files) | sed "s/{{IM_VERSION}}/$(cat ../VERSION)/g" | tee ../dist/im.js | python lib/jsmin.py > ../dist/im.min.js
cp -r ../src/* ../doc/im