#!/bin/bash
# Build PrestaShop module zip for installation

cd "$(dirname "$0")/../packages" || exit 1
zip -r ../ileopardchat.zip ileopardchat -x "ileopardchat/package.json" "ileopardchat/node_modules/*"
echo "Created: ileopardchat.zip"
