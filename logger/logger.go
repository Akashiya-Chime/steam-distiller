package logger

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/sirupsen/logrus"
)

var L *logrus.Logger

type customFormatter struct {
	ModuleName string
}

func (f *customFormatter) Format(entry *logrus.Entry) ([]byte, error) {
	var file string
	var line int
	var function string
	if entry.HasCaller() {
		file = filepath.Base(entry.Caller.File)
		line = entry.Caller.Line
		function = entry.Caller.Function
		// 只保留函数名
		if lastSlash := strings.LastIndex(function, "/"); lastSlash >= 0 {
			function = function[lastSlash+1:]
		}
		if dot := strings.Index(function, "."); dot >= 0 {
			function = function[dot+1:]
		}
	}

	timestamp := entry.Time.Format("2006/01/02 - 15:04:05")

	level := strings.ToUpper(entry.Level.String())
	msg := fmt.Sprintf("[%s] [%s] [%s]", f.ModuleName, level, timestamp)

	if entry.HasCaller() {
		msg += fmt.Sprintf(" [%s:%d] [%s]", file, line, function)
	}

	msg += " " + entry.Message + "\n"

	return []byte(msg), nil
}

func Init(moduleName string) {
	L = logrus.New()
	L.SetReportCaller(true)
	L.SetFormatter(&customFormatter{
		ModuleName: moduleName,
	})
	L.SetLevel(logrus.InfoLevel)
	L.SetOutput(os.Stdout)

	L.Infoln("Init logger successfully.")
}
