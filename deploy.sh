#!/bin/bash
set -x

if [ "$TRAVIS_PULL_REQUEST" = "false" ] && [ "$TRAVIS_JOB_NUMBER" = "$TRAVIS_BUILD_NUMBER.1" ]
then
  # Determine folder and version based on tag or branch
  if [ ! -z "$TRAVIS_TAG" ]
  then
    echo "PROD: Deploying $TRAVIS_TAG to server"
    server="meditation.sirimangalo.org"
    version=$TRAVIS_TAG
  elif [ "$TRAVIS_BRANCH" = "master" ]
  then
    echo "TEST: Deploying master to test server"
    server="meditation-dev.sirimangalo.org"
    version="$TRAVIS_BUILD_NUMBER.0.0"
  else
    exit
  fi

  chmod 600 deploy_key
  rm -f dist/src/config/config.json
  mv deploy_key ~/.ssh/id_rsa
  cp -R node_modules dist/node_modules

  # Update version
  npm --no-git-tag-version version "$version"
  cp package.json dist/package.json

  tar -czf transfer.tgz dist
  scp -o "StrictHostKeyChecking no" transfer.tgz jenkins@$server:/var/www/meditation-plus
  ssh -o "StrictHostKeyChecking no" jenkins@$server "cd /var/www/meditation-plus; cp config/config.json ./; rm -rf app .babelrc config server.conf server.js sockets node_modules package.json; tar -xzf transfer.tgz --strip 1; mv config.json config/config.json; rm transfer.tgz"
fi