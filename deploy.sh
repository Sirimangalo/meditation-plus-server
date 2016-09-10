#!/bin/bash
set -x

if [ "$TRAVIS_PULL_REQUEST" = "false" ] && [ "$TRAVIS_JOB_NUMBER" = "$TRAVIS_BUILD_NUMBER.1" ]
then
  # Determine folder and version based on tag or branch
  if [ ! -z "$TRAVIS_TAG" ]
  then
    echo "PROD: Deploying $TRAVIS_TAG to server"
    folder="meditation-plus"
    version=$TRAVIS_TAG
  elif [ "$TRAVIS_BRANCH" = "master" ]
  then
    echo "TEST: Deploying master to test server"
    folder="meditation-plus-test"
    version=$TRAVIS_BUILD_NUMBER
  else
    exit
  fi

  chmod 600 deploy_key
  mv deploy_key ~/.ssh/id_rsa
  cp -R node_modules dist/node_modules

  # Update version
  npm --no-git-tag-version version "$version"
  cp package.json dist/package.json

  tar -czf transfer.tgz dist
  scp -o "StrictHostKeyChecking no" transfer.tgz jenkins@159.203.6.130:/var/www/$folder
  ssh -o "StrictHostKeyChecking no" jenkins@159.203.6.130 "cd /var/www/$folder; cp config/config.json ./; rm -rf app .babelrc config server.conf server.js sockets node_modules package.json; tar -xzf transfer.tgz --strip 1; mv config.json config/config.json; rm transfer.tgz"
fi