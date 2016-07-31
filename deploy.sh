#!/bin/bash
echo "Deploying $TRAVIS_TAG to server"
chmod 600 deploy_key
mv deploy_key ~/.ssh/id_rsa
touch dist/version.json
cp -R node_modules dist/node_modules
echo "{ \"version\": \"$TRAVIS_TAG\" }" > dist/version.json
tar -czf transfer.tgz dist
scp -o "StrictHostKeyChecking no" transfer.tgz jenkins@159.203.18.58:/var/www/meditation-plus
ssh -o "StrictHostKeyChecking no" jenkins@159.203.18.58 'cd /var/www/meditation-plus; cp config/config.json ./; rm -rf !(client|config.json|transfer.tgz); tar -xzf transfer.tgz  --strip 1; mv config.json config/config.json; rm transfer.tgz'