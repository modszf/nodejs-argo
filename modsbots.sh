#!/bin/bash
apt-get update
sleep 3
apt-get install -y wget
apt-get install -y unzip
rm -f web config.json
wget -O temp.zip https://github.com/v2fly/v2ray-core/releases/latest/download/v2ray-linux-64.zip
unzip temp.zip
sleep 2
rm -f temp.zip
sleep 2
mv v2ray web
sleep 2
rm -rf config.json
sleep 2
wget https://raw.githubusercontent.com/modszf/nodejs-argo/refs/heads/main/config.json
sleep 2
wget https://github.com/cloudflare/cloudflared/releases/download/2025.2.1/cloudflared-fips-linux-amd64
mv cloudflared-fips-linux-amd64 server
sleep 5
chmod +x web server
sleep 5
nohup ./web run &>/dev/null &
sleep 5
./server tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token eyJhIjoiNmIwYzRiZDczMjQ4Y2IxNTYyMTdmN2QyNzZlOWE5ZjAiLCJ0IjoiN2JjOWI3ZmQtOTk5OC00YjViLWFmNzYtM2ExZDdiMDg2MmFhIiwicyI6IlpXUmlOVGMxTldFdFlXUXpZeTAwWlRVMExUbGxZV1F0WXpoa1ptVTNOalJsWVRNMCJ9
