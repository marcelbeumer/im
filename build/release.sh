#!/bin/sh

#grap version
read version < ../VERSION
zipname=im-$version.zip

# create tmp dir
test ! -d /tmp/im-build && mkdir /tmp/im-build || rm -rf /tmp/im-build/*

# make source dir and copy files
mkdir /tmp/im-build/im && cp -r ../* /tmp/im-build/im

# make zip
cd /tmp/im-build && zip -r $zipname im

printf "Created %s in /tmp\n" $zipname