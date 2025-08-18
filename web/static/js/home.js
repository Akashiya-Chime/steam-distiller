class ws_terminal {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.term = null;
        this.socket = null;
        this.isConnected = false;
        this.isGameStarted = false;
        this.fitAddon = new FitAddon.FitAddon();
        this.init();
    }
    init() {
        this.createTerminal();
        this.connectWebSocket();
        this.setupEventListeners();
    }

    createTerminal() {
        this.term = new Terminal({
            theme: {
                background: "rgba(30, 30, 30, 0.4)",
                foreground: "#e0e0e0",
                cursor: "#aeafad",
                cursorAccent: "#d4d4d4",
                selection: "rgba(51, 153, 255, 0.3)",
                black: "#1e1e1e",
                red: "#f44747",
                green: "#608b4e",
                yellow: "#dcdcaa",
            },
            fontSize: 18,
            fontFamily: "'Source Code Pro', Menlo, Monaco, 'Courier New', monospace",
            letterSpacing: 0.5,
            lineHeight: 1.2,
            cursorBlink: true,
            cursorStyle: "block",
            scrollback: 1000, // 增加回滚行数
            windowsMode: true
        });
        this.term.loadAddon(this.fitAddon);
        this.fitAddon.fit();
    }

    connectWebSocket() {
        this.info("正在连接服务器...")
        try {
            this.socket = new WebSocket(this.wsUrl);

            this.socket.onopen = () => {
                this.info("连接成功！")
                this.updateConnectionStatus(true);
            };
            this.socket.onmessage = (event) => {
                this.term.writeln(event.data);
            };

            this.socket.onerror = (error) => {
                this.error("连接错误:" + (error.message || "未知错误"));
                this.updateConnectionStatus(false);
            };

            this.socket.onclose = (event) => {
                this.warn(`连接已关闭，代码: ${event.code}`);
                this.updateConnectionStatus(false);

                if (event.code !== 2000) {
                    this.warn("连接已断开，2秒后尝试重连...");
                    setTimeout(() => { this.connectWebSocket() }, 2000);
                }
            };

        } catch (error) {
            this.error("连接失败:" + (error.message || "未知错误"));
            this.updateConnectionStatus(false);
        }
    }

    info(text) {
        this.term.write(`\r\n\x1b[32m${text}\x1b[0m\r\n`);
    }

    error(text) {
        this.term.write(`\r\n\x1b[31m${text}\x1b[0m\r\n`);
    }

    warn(text) {
        this.term.write(`\r\n\x1b[33m${text}\x1b[0m\r\n`);
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
    }

    setupEventListeners() {
        window.addEventListener("resize", () => {
            this.fitAddon.fit();
        });
    }
}

function exit() {
    $.cookie("access_token", null, { expires: -1 }) // 删除access_token
    lightyear.notify("退出登录成功", "success", 1000);
    setTimeout(() => {
        window.location.href = "/"
    }, 2000)
}

function switch_tab(obj) {
    $(".navbar-page-title")[0].innerText = obj.innerText
    $(".nav-item").each(function () {
        $(this).removeClass("active")
    })
    obj.parentNode.classList.add("active")
    // 切换iframe
    iframe_data = {
        "首页": "checkHealth",
        "left4Dead2": "left4dead2",
        "Barotrauma": "barotrauma",
        "管理": "admin",
        "关于": "about",
    }
    $("#main_iframe").attr("src", iframe_data[obj.innerText.replace(/\s/g, "")])
}

function get_user_info() {
    let access_token = $.cookie("access_token")
    if (access_token == null) {
        lightyear.notify("access_token异常，用户信息获取失败", "danger", 3000);
        setTimeout(() => {
            window.location.href = "/"
        }, 3000);
        return
    }
    let user_info_from_cookie = JSON.parse(decodeURIComponent(escape(window.atob(access_token.split(".")[1])))).sub
    $.ajax({
        url: "api/v1/users",
        type: "get",
        data: {
            "username": user_info_from_cookie
        },
        dataType: "json",
        success: function (r) {
            if (r.code == 0) {
                $("#top_user_info")[0].innerText = r.data.username
                if (r.data.is_admin) {
                    $("#sidebar_admin_tab")[0].style.display = "block"
                }
            } else {
                lightyear.notify(r.msg, "danger", 3000);
            }
        },
        error: function (xhr) {
            lightyear.notify("网络异常，用户信息获取失败", "danger", 3000);
        }
    })
}

get_user_info()
const wsUrl_l4d2 = "ws://" + window.location.host + "/api/v1/l4d2/log";
var term_l4d2 = new ws_terminal(wsUrl_l4d2);
let check_expire_time=30 * 60 * 1e3 // 间隔30分钟检查一次cookie
let listen_cookie_expire = setInterval(() => {
    let token_expire = $.cookie("expiredAt")
    if (token_expire <= Date.now()+2*check_expire_time) {
        clearInterval(listen_cookie_expire)
        $.confirm({
            title: '登录过期警告',
            content: '登录即将过期，需要重新登录',
            type: 'orange',
            typeAnimated: false,
            buttons: {
                omg: {
                    text: '返回登录页',
                    btnClass: 'btn-orange',
                    action: function () {
                        window.location.href = "/"
                    }
                },
            }
        });
    }
}, check_expire_time)