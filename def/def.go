package def

import (
	"path/filepath"
	"steam-distiller/env"
)

type GameType int

const (
	L4D2 GameType = iota + 1
	Baro
)

var (
	L4D2Path       string = filepath.Join(env.GetL4D2Env().Path)
	L4D2ConfigPath string = filepath.Join(L4D2Path, "/left4dead2/cfg/")
	L4D2ModPath    string = filepath.Join(L4D2Path, "/left4dead2/addons/workshop/")
)
