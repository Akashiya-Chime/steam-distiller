package controllers

import (
	"bufio"
	"os"
	"os/exec"
	log "steam-distiller/logger"
	ws "steam-distiller/websocket"
	"strings"

	"github.com/creack/pty"
)

type GameContoller struct {
	StartCmd string
	StopCmd  string
	GameType ws.GameType
	Ptmx     *os.File
	Logs     chan []byte
}

func (c *GameContoller) Init(game ws.GameType, startCmd string, stopCmd string) {
	c.StartCmd = startCmd
	c.StopCmd = stopCmd
	c.GameType = game
	c.Logs = make(chan []byte)
	startServer := exec.Command("bash")
	var err error

	c.Ptmx, err = pty.Start(startServer)
	if err != nil {
		log.L.Warnf("Ptmx error, %v.\n", err)
	}
	log.L.Infof("Init game[%v] controller success.\n", game)

	go func() {
		scanner := bufio.NewScanner(c.Ptmx)
		for scanner.Scan() {
			c.Logs <- scanner.Bytes()
		}
	}()

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

func (c *GameContoller) StartGame() {
	if c.IsRunning() {
		return
	}

	// 使用 \n 模拟回车执行
	_, err := c.Ptmx.Write([]byte(c.StartCmd + "\n"))
	if err != nil {
		log.L.Warnf("Ptmx error, %v.\n", err)
	}
	log.L.Infof("Start game[%v] server successfully.\n", c.GameType)
}

func (c *GameContoller) StopGame() {
	if !c.IsRunning() {
		return
	}

	_, err := c.Ptmx.Write([]byte(c.StopCmd + "\n"))
	if err != nil {
		log.L.Warnf("Ptmx error, %v.\n", err)
	}
	log.L.Infof("Stop game[%v] server successfully.\n", c.GameType)
}
