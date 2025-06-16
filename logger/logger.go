package logger

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/sirupsen/logrus"
)

var log *logrus.Logger

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
	log = logrus.New()
	log.SetReportCaller(true)
	log.SetFormatter(&customFormatter{
		ModuleName: moduleName,
	})
	log.SetLevel(logrus.InfoLevel)
	log.SetOutput(os.Stdout)

	log.Infoln("Init logger successfully.")
}

func Info(args ...any) { log.Info(args...) }

func Infof(format string, args ...any) { log.Infof(format, args...) }

func Infoln(args ...any) { log.Infoln(args...) }

func Warn(args ...any) { log.Warn(args...) }

func Warnf(format string, args ...any) { log.Warnf(format, args...) }

func Warnln(args ...any) { log.Warnln(args...) }

func Debug(args ...any) { log.Debug(args...) }

func Debugf(format string, args ...any) { log.Debugf(format, args...) }

func Debugln(args ...any) { log.Debugln(args...) }

func Error(args ...any) { log.Error(args...) }

func Errorf(format string, args ...any) { log.Errorf(format, args...) }

func Errorln(args ...any) { log.Errorln(args...) }

func Panic(args ...any) { log.Panic(args...) }

func Panicf(format string, args ...any) { log.Panicf(format, args...) }

func Panicln(args ...any) { log.Panicln(args...) }

func Fatal(args ...any) { log.Fatal(args...) }

func Fatalf(format string, args ...any) { log.Fatalf(format, args...) }

func Fatalln(args ...any) { log.Fatalln(args...) }
