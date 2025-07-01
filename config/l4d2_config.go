package config

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"reflect"
	"strconv"
	"strings"
)

type L4D2Config struct {
	Map         string `json:"map"`
	Cheats      uint32 `cfg:"sv_cheats" json:"sv_cheats"`
	Consistency uint32 `cfg:"sv_consistency" json:"sv_consistency"`
	Hostport    uint32 `cfg:"hostport" json:"hostport"`
	Hostname    string `cfg:"hostname" json:"hostname"`
	Region      uint32 `cfg:"sv_region" json:"sv_region"`
	LobbyOnly   uint32 `cfg:"sv_allow_lobby_connect_only" json:"sv_allow_lobby_connect_only"`
	Steamgroup  uint32 `cfg:"sv_steamgroup" json:"sv_steamgroup"`
	GameTypes   string `cfg:"sv_gametypes" json:"sv_gametypes"`
	GameMode    string `cfg:"mp_gamemode" json:"mp_gamemode"`
	Difficulty  string `cfg:"z_difficulty" json:"z_difficulty"`
	Sm_SbStop   uint32 `cfg:"sm_cvar sb_stop" json:"sm_cvar sb_stop"`
}

// 配置文件权限 -rw-r-----
const PERMISSION = 0640

func (c *L4D2Config) Read(filePath string) error {
	file, err := os.OpenFile(filePath, os.O_CREATE|os.O_RDWR, PERMISSION)
	if err != nil {
		return fmt.Errorf("failed to open config file: %v", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	configMap, err := getConfigMap(scanner)
	if err != nil {
		return err
	}

	val := reflect.ValueOf(c).Elem()
	typ := val.Type()

	for i := 0; i < val.NumField(); i++ {
		field := val.Field(i)
		fieldType := typ.Field(i)
		tag := fieldType.Tag.Get("cfg")

		if value, ok := configMap[tag]; ok {
			switch field.Kind() {
			case reflect.String:
				field.SetString(strings.Trim(value, `"`))
			case reflect.Uint32:
				// 按照10机制32位转换
				if intValue, err := strconv.ParseUint(value, 10, 32); err == nil {
					field.SetUint(intValue)
				}
			}
		}
	}

	return nil
}

func (c *L4D2Config) Update(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	configMap, err := getConfigMap(scanner)
	if err != nil {
		return err
	}

	val := reflect.ValueOf(c).Elem()
	typ := val.Type()

	for i := 0; i < val.NumField(); i++ {
		field := typ.Field(i)
		tag := field.Tag.Get("cfg")
		if tag == "" {
			continue
		}

		fieldVal := val.Field(i)
		var valueStr string

		switch fieldVal.Kind() {
		case reflect.String:
			valueStr = fmt.Sprintf(`"%s"`, fieldVal.String())
		case reflect.Uint32:
			valueStr = strconv.FormatUint(fieldVal.Uint(), 10) // 10进制
		default:
			continue
		}

		configMap[tag] = valueStr
	}

	var newContent bytes.Buffer
	for key, val := range configMap {
		newContent.WriteString(key + " " + val + "\n")
	}

	return os.WriteFile(filePath, newContent.Bytes(), PERMISSION)
}

// 获取文件中配置键值对，不保序
func getConfigMap(scanner *bufio.Scanner) (map[string]string, error) {
	configMap := make(map[string]string)

	for scanner.Scan() {
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)

		if trimmed == "" || strings.HasPrefix(trimmed, "//") {
			continue
		}

		// 处理行内注释
		if commentIdx := strings.Index(trimmed, "//"); commentIdx > 0 {
			trimmed = strings.TrimSpace(trimmed[:commentIdx])
		}

		lastSpace := strings.LastIndex(trimmed, " ")
		if lastSpace == -1 {
			continue
		}
		key := trimmed[:lastSpace]
		configMap[key] = trimmed[lastSpace+1:]
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading config file: %v", err)
	}

	return configMap, nil
}
