#!/bin/sh
MAP=$(cat currentMap.txt)
echo "[run_server.sh] Set map: ${MAP}"
/home/lighthouse/l4d2-server/srcds_run -nomaster -insecure -game left4dead2 +maxplayers 8 +map ${MAP} -tickrate 100 +exec server.cfg -console +log on