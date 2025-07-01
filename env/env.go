package env

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
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
	SteamEnv SteamEnvConfig `toml:"l4d2"`
}

type ServerConfig struct {
	Host      string `toml:"host"`
	Port      string `toml:"port"`
	SecretKey string `toml:"secret_key"`
}

type SteamEnvConfig struct {
	Path string `toml:"path"`
}

func checkRunScript() {
	scriptPath := filepath.Join(env.SteamEnv.Path, "run_server.sh")
	if _, err := os.Stat(scriptPath); err == nil {
		return
	} else if os.IsNotExist(err) {
		cpCmd := exec.Command("cp", "run_server.sh", scriptPath)
		if _, err := cpCmd.CombinedOutput(); err != nil {
			log.L.Panicln("Copy run_server.sh failed.")
			return
		}
		log.L.Infoln("Copy run_server.sh successfully.")
	}
}

func checkServerCfg() {
	cfgPath := filepath.Join(env.SteamEnv.Path, "/left4dead2/cfg/", "server.cfg")
	if _, err := os.Stat(cfgPath); err == nil {
		return
	} else if os.IsNotExist(err) {
		cpCmd := exec.Command("cp", "default_server.cfg", cfgPath)
		if _, err := cpCmd.CombinedOutput(); err != nil {
			log.L.Panicln("Copy default_server.cfg failed.")
			return
		}
		log.L.Infoln("Copy default_server.cfg successfully.")
	}
}

func InitEnv() {
	envOnce.Do(func() {
		if _, err := toml.DecodeFile("config.toml", &env); err != nil {
			log.L.Panicf("Read config.toml failed, %v.\n", err)
		}
	})

	// 方便windows下调试，release版本需删除
	if runtime.GOOS == "windows" {
		return
	}
	checkRunScript()
	checkServerCfg()
}

func GetServerConfig() ServerConfig {
	return env.Server
}

func GetL4D2Env() SteamEnvConfig {
	return env.SteamEnv
}
