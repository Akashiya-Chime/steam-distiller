package mod

import (
	"encoding/json"
	"errors"
	"os"
	"steam-distiller/def"
	log "steam-distiller/logger"
	"sync"
	"time"
)

var (
	ErrDuplicateTagOrFile = errors.New("mod tag or file name already exists")
	ErrTagNotFound        = errors.New("mod tag not found")
)

var modsMutex sync.RWMutex

type Mod struct {
	Tag  string `json:"tag"`
	File string `json:"file"`
	Time string `json:"time"`
	User string `json:"user"`
}

func GetMod(tag string) (*Mod, error) {
	mods, err := readMods()
	if err != nil {
		return nil, err
	}

	for _, mod := range mods {
		if mod.Tag == tag {
			foundMod := mod
			return &foundMod, nil
		}
	}

	return nil, ErrTagNotFound
}

func readMods() ([]Mod, error) {
	file, err := os.ReadFile("mods.json")
	if err != nil {
		log.L.Warnf("Read mods.json failed, %v.", err)
		return nil, err
	}

	var mods []Mod
	if err := json.Unmarshal(file, &mods); err != nil {
		log.L.Warnf("Unmarshal mods.json failed, %v.", err)
		return nil, err
	}

	return mods, nil
}

func ReadMods() ([]Mod, error) {
	modsMutex.RLock()
	defer modsMutex.RUnlock()

	return readMods()
}

func WriteMod(tag, file, user string) error {
	modsMutex.Lock()
	defer modsMutex.Unlock()

	mods, err := readMods()
	if err != nil {
		log.L.Warnf("Read mods failed, %v.", err)
		return err
	}

	for _, mod := range mods {
		if mod.Tag == tag || mod.File == file {
			return ErrDuplicateTagOrFile
		}
	}

	newMod := Mod{
		Tag:  tag,
		File: file,
		Time: time.Now().Format("2006-01-02 15:04:05"),
		User: user,
	}
	mods = append(mods, newMod)

	newData, err := json.MarshalIndent(mods, "", "    ")
	if err != nil {
		log.L.Warnf("Marshel mods failed, %v.", err)
		return err
	}

	return os.WriteFile("mods.json", newData, def.Permission)
}

func DeleteMod(tag string) error {
	modsMutex.Lock()
	defer modsMutex.Unlock()

	mods, err := readMods()
	if err != nil {
		log.L.Warnf("Read mods failed, %v.", err)
		return err
	}

	found := false
	newMods := make([]Mod, 0, len(mods))
	for _, mod := range mods {
		if mod.Tag == tag {
			found = true
			continue
		}
		newMods = append(newMods, mod)
	}

	if !found {
		return ErrTagNotFound
	}

	newData, err := json.MarshalIndent(newMods, "", "    ")
	if err != nil {
		log.L.Warnf("Marshel mods failed, %v.", err)
		return err
	}

	return os.WriteFile("mods.json", newData, def.Permission)
}
