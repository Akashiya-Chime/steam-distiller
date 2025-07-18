package def

type GameType int

const (
	L4D2 GameType = iota + 1
	Baro
)

// 配置文件权限 -rw-r-----
const Permission = 0640
