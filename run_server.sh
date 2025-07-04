#!/bin/sh
MAP=$(cat currentMap.txt)
echo "[run_server.sh] Set map: ${MAP}"
L4D2_PATH=$1
echo "[run_server.sh] Set path: ${L4D2_PATH}"
${L4D2_PATH}/srcds_run -nomaster -insecure -game left4dead2 +maxplayers 8 +map ${MAP} -tickrate 100 +exec server.cfg -console +log on