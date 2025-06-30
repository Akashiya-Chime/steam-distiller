package config

import (
	"errors"
	"steam-distiller/def"
)

type ConfigTypes interface {
	L4D2Config | BaroConfig
}

type Config[T ConfigTypes] struct {
	FilePath   string
	GameType   def.GameType
	GameConfig T
}

type ConfigCtl interface {
	Read(filePath string) error
	Update(filePath string) error
}

func NewConfig[T ConfigTypes](path string, gameType def.GameType) *Config[T] {
	return &Config[T]{
		FilePath: path,
		GameType: gameType,
	}
}

func (c *Config[T]) ReadConfigFile() error {
	ctl, ok := any(&c.GameConfig).(ConfigCtl)
	if !ok {
		return errors.New("unsupport config controller")
	}

	return ctl.Read(c.FilePath)
}

func (c *Config[T]) UpdateConfig() error {
	ctl, ok := any(&c.GameConfig).(ConfigCtl)
	if !ok {
		return errors.New("unsupport config controller")
	}

	return ctl.Update(c.FilePath)
}
