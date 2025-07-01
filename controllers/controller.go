package controllers

import (
	"bufio"
	"errors"
	"os"
	"os/exec"
	"runtime"
	"steam-distiller/def"
	log "steam-distiller/logger"
	ws "steam-distiller/websocket"
	"strings"

	"github.com/creack/pty"
)

type GameContoller struct {
	StartCmd string
	StopCmd  string
	GameType def.GameType
	Ptmx     *os.File
	Logs     chan []byte
}

// Init 函数会在后台挂起执行循环，需放最后执行
func (c *GameContoller) Init(game def.GameType, startCmd string, stopCmd string) error {
	// 方便windows下调试，release版本需删除
	if runtime.GOOS == "windows" {
		return nil
	}
	c.StartCmd = startCmd
	c.StopCmd = stopCmd
	c.GameType = game
	c.Logs = make(chan []byte)
	startServer := exec.Command("bash")
	var err error

	c.Ptmx, err = pty.Start(startServer)
	if err != nil {
		log.L.Warnf("Ptmx error, %v.", err)
		return err
	}

	go func() {
		scanner := bufio.NewScanner(c.Ptmx)
		for scanner.Scan() {
			c.Logs <- scanner.Bytes()
		}
	}()

	log.L.Infof("Init game[%v] controller success.\n", game)

	for {
		logs := <-c.Logs
		broadcast := ws.BroadcastType{
			Msg:  logs,
			Game: game,
		}
		ws.Broadcast(broadcast)
	}
}

func (c *GameContoller) Close() {
	c.Ptmx.Close()
}

func (c *GameContoller) IsRunning() bool {
	cmd := exec.Command("pgrep", "-f", c.StartCmd)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return false
	}

	return len(strings.TrimSpace(string(output))) > 0
}

var (
	ErrIsRunning    = errors.New("game server is running")
	ErrIsNotRunning = errors.New("game server is not running")
)

func (c *GameContoller) StartGame() error {
	if c.IsRunning() {
		return ErrIsRunning
	}

	// 使用 \n 模拟回车执行
	_, err := c.Ptmx.Write([]byte(c.StartCmd + "\n"))
	if err != nil {
		log.L.Warnf("Ptmx error, %v.\n", err)
		return err
	}

	log.L.Infof("Start game[%v] server successfully.\n", c.GameType)
	return nil
}

func (c *GameContoller) StopGame() error {
	if !c.IsRunning() {
		return ErrIsNotRunning
	}

	_, err := c.Ptmx.Write([]byte(c.StopCmd + "\n"))
	if err != nil {
		log.L.Warnf("Ptmx error, %v.\n", err)
		return err
	}

	log.L.Infof("Stop game[%v] server successfully.\n", c.GameType)
	return nil
}
