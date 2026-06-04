# Steam Distiller

Create game servers easily on web

## Depend

- 由于官方不在支持通过anonymous匿名方式下载L4D2的服务器，所以该软件暂不考虑支持游戏一键安装部署，需要用户自行安装L4D2服务器，然后在该软件中指定安装目录

```
./steamcmd.sh +@sSteamCmdForcePlatformType windows +login anonymous +app_update 222860 +quit

安装steamcmd
"https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz"
or:
"https://media.st.dl.bscstorage.net/client/installer/steamcmd_linux.tar.gz"
curl -sqL "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz" | tar zxvf - -C /home/steam/steamcmd/ && rm -f steamcmd_linux.tar.gz

安装l4d2
/home/steam/steamcmd/steamcmd.sh +force_install_dir /home/steam/L4D2Server/ +login anonymous +app_update 222860 +quit
```

## Debug

1. `git clone` to your local path

2. `cd steam-distiller/`

3. `go mod download`

4. `go run .`

> Recommend: by using air
> - `go install github.com/air-verse/air@latest`
> - `air`

- default port: `8088`

## Thanks
* [lyear](http://lyear.itshubao.com/index.html) - used for the front-end template.
