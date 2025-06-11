# Steam Distiller

Create game servers easily on web

## Project Structure

```
steam-distiller/
├── assets/               # 静态资源（可选，如果后端需要提供一些静态文件）
├── build/                # 构建脚本和Docker文件
│   ├── docker/
│   └── scripts/
├── cmd/                  # 应用程序入口
│   └── server/
│       └── main.go       # 主程序入口
├── configs/              # 配置文件
├── deployments/          # 部署相关文件（k8s, compose等）
├── docs/                 # 项目文档
├── internal/             # 私有应用程序代码
│   ├── app/              # 应用程序核心
│   │   ├── controllers/  # 控制器层
│   │   ├── middleware/   # 自定义中间件
│   │   ├── models/       # 数据模型
│   │   ├── repositories/ # 数据访问层
│   │   ├── services/     # 业务逻辑层
│   │   └── routers/      # 路由定义
│   ├── pkg/             # 项目内部共享库
│   └── utils/           # 工具函数
├── migrations/           # 数据库迁移文件
├── pkg/                  # 可公开共享的库代码
├── tests/                # 测试代码
│   ├── integration/     # 集成测试
│   └── unit/            # 单元测试
├── web/                  # 前端项目（可选，如果前后端一起管理）
├── go.mod                # Go 模块文件
├── go.sum                # Go 模块校验文件
└── README.md             # 项目说明
```