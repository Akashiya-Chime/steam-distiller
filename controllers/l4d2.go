package controllers

import (
	"bufio"
	"os"
	"os/exec"
	log "steam-distiller/logger"
	"strings"

	"github.com/creack/pty"
)

var startCmd = "/home/lighthouse/l4d2-server/run.sh\n"
var stopCmd = "quit\n"

type L4D2Contoller struct {
	Ptmx *os.File
	Logs chan []byte
}

func (c *L4D2Contoller) Init() {
	c.Logs = make(chan []byte)
	startServer := exec.Command("bash")
	var err error

	c.Ptmx, err = pty.Start(startServer)
	if err != nil {
		log.L.Warnf("Ptmx error, %v.\n", err)
	}
	defer func() { _ = c.Ptmx.Close() }()
}

func (c *L4D2Contoller) IsRunning() bool {
	cmd := exec.Command("pgrep", "-f", startCmd)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return false
	}

	return len(strings.TrimSpace(string(output))) > 0
}

func (c *L4D2Contoller) StartGame() {
	if c.IsRunning() {
		return
	}
	_, err := c.Ptmx.Write([]byte(startCmd))
	if err != nil {
		log.L.Warnf("Ptmx error, %v.\n", err)
	}
}

func (c *L4D2Contoller) StopGame() {
	if c.IsRunning() {
		return
	}
	_, err := c.Ptmx.Write([]byte(stopCmd))
	if err != nil {
		log.L.Warnf("Ptmx error, %v.\n", err)
	}
}

func (c *L4D2Contoller) ReadLogs() {
	go func() {
		scanner := bufio.NewScanner(c.Ptmx)
		for scanner.Scan() {
			c.Logs <- scanner.Bytes()
			log.L.Infoln(scanner.Bytes())
		}
	}()
}
