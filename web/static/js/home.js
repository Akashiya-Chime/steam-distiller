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
        this.term.writeln("\r\n\x1b[32m正在连接服务器...\x1b[0m");
        try {
            this.socket = new WebSocket(this.wsUrl);

            this.socket.onopen = () => {
                this.term.writeln("\x1b[32m连接成功！\x1b[0m");
                this.updateConnectionStatus(true);
            };
            this.socket.onmessage = (event) => {
                this.term.writeln(event.data);
            };

            this.socket.onerror = (error) => {
                this.term.write(`\r\n\x1b[31m连接错误: ${error.message || "未知错误"}\x1b[0m\r\n`);
                this.updateConnectionStatus(false);
            };

            this.socket.onclose = (event) => {
                this.term.write(`\r\n\x1b[33m连接已关闭，代码: ${event.code}\x1b[0m\r\n`);
                this.updateConnectionStatus(false);

                if (event.code !== 2000) {
                    this.term.writeln("\x1b[33m连接已断开，2秒后尝试重连...\x1b[0m",);
                    setTimeout(() => { this.connectWebSocket() }, 2000);
                }
            };

        } catch (error) {
            this.term.write(`\r\n\x1b[31m连接失败: ${error.message}\x1b[0m\r\n`);
            this.updateConnectionStatus(false);
        }
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
        "steamCMD": "steamCMD",
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
                lightyear.notify(r.data.msg, "danger", 3000);
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
