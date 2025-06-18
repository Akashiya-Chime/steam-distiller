package env

import (
	log "steam-distiller/logger"
	"sync"

	"github.com/BurntSushi/toml"
)

var (
	env     Env
	envOnce sync.Once
)

type Env struct {
	Server   ServerConfig   `toml:"server"`
	Steamcmd SteamcmdConfig `toml:"steamcmd"`
}

type ServerConfig struct {
	Host      string `toml:"host"`
	Port      string `toml:"port"`
	SecretKey string `toml:"secret_key"`
}

type SteamcmdConfig struct {
	Path string `toml:"path"`
}

func InitEnv() {
	envOnce.Do(func() {
		if _, err := toml.DecodeFile("config.toml", &env); err != nil {
			log.L.Panicf("Read config.toml failed, %v.\n", err)
		}
	})
}

func GetServerConfig() ServerConfig {
	return env.Server
}

func GetSteamcmdConfig() SteamcmdConfig {
	return env.Steamcmd
}
