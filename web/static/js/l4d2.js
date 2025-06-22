function connectWebSocket() {
    term.writeln('\r\n\x1b[32m正在连接服务器...\x1b[0m');

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            term.writeln('\x1b[32m连接成功！\x1b[0m');
            command = ''; // 清空命令
            updateConnectionStatus(true);
        };
        socket.onmessage = (event) => {
            // 将服务器返回的数据写入终端
            term.writeln(event.data); // 在终端显示服务器的消息
        };

        socket.onerror = (error) => {
            term.write(`\r\n\x1b[31m连接错误: ${error.message || '未知错误'}\x1b[0m\r\n`);
            updateConnectionStatus(false);
        };

        socket.onclose = (event) => {
            term.write(`\r\n\x1b[33m连接已关闭，代码: ${event.code}\x1b[0m\r\n`);
            updateConnectionStatus(false);

            if (event.code !== 2000) {
                term.writeln('\x1b[33m连接已断开，2秒后尝试重连...\x1b[0m',);
                setTimeout(connectWebSocket, 2000);
            }
        };

    } catch (error) {
        term.write(`\r\n\x1b[31m连接失败: ${error.message}\x1b[0m\r\n`);
        updateConnectionStatus(false);
    }
}

// 断开WebSocket连接
function disconnectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(1000, '用户主动断开');
    }
    updateConnectionStatus(false);
}

function updateConnectionStatus(connected) {
    isConnected = connected;
    if (connected) {
        document.getElementById("statusIndicator").classList.add("connected")
        document.getElementById("statusText").innerText = "已连接";
        document.getElementById("start_game").removeAttribute("disabled");
    } else {
        document.getElementById("statusIndicator").classList.remove("connected")
        document.getElementById("statusText").innerText = "正在连接服务器...";
        document.getElementById("start_game").setAttribute("disabled", true);
    }
}

// 发送启动游戏命令
function startGame() {
    if($("#start_game")[0].innerText !="启动游戏"){
        return
    }
    if (!isConnected) {
        lightyear.notify("与服务器尚未建立连接，请稍后再试", 'danger', 3000,"", 'top', 'right'); 
        return;
    }
    if (isGameStarted) {
        lightyear.notify("游戏已经启动，请勿重复操作", 'danger', 3000,"", 'top', 'right');
        return; 
    }
    term.writeln(`\r\n\x1b[32m正在启动游戏...\x1b[0m\r\n`);
    $.ajax({
        url: "/api/v1/l4d2/start",
        type: "get",
        dataType: "json",
        success: function (r) {
            if (r.code == 0) {
                isGameStarted = true;
                lightyear.notify(r.data.msg, 'success', 3000,"", 'top', 'right'); 
            } 
        },
        error: function (xhr) {
            lightyear.notify("网络异常，游戏启动失败", 'danger', 3000,"", 'top', 'right'); 
        }
    })
}

// 初始化终端
const term = new Terminal({
    theme: {
        background: 'rgba(30, 30, 30, 0.4)',
        foreground: '#e0e0e0',
        cursor: '#aeafad',
        cursorAccent: '#d4d4d4',
        selection: 'rgba(51, 153, 255, 0.3)',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#608b4e',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4',
        brightBlack: '#6e7681',
        brightRed: '#f48771',
        brightGreen: '#b5cea8',
        brightYellow: '#ce9178',
        brightBlue: '#9cdcfe',
        brightMagenta: '#d7ba7d',
        brightCyan: '#d16969',
        brightWhite: '#f0f0f0'
    },
    fontSize: 18,
    fontFamily: "'Source Code Pro', Menlo, Monaco, 'Courier New', monospace",
    letterSpacing: 0.5,
    lineHeight: 1.2,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 1000, // 增加回滚行数
    windowsMode: true
});

// 加载插件
const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById('terminal'));
fitAddon.fit();

// 打开终端
let command = '';
let wsUrl = `ws://${window.location.host}/api/v1/ws/steamcmd`;
let socket = null
let isConnected = false; // 跟踪连接状态;
let isGameStarted = false; // 跟踪游戏启动状态;
const tabBtns = document.querySelectorAll('.btn');
const contents = document.querySelectorAll('.content');

term.writeln('\x1b[32m欢迎使用steamCMD终端界面\x1b[0m ');
connectWebSocket();

// 窗口调整大小时重新适配终端
window.addEventListener('resize', () => {
    fitAddon.fit();
});

// 清除终端按钮
document.getElementById('clear-btn').addEventListener('click', () => {
    term.clear();
});

// 页面关闭时清理
window.addEventListener("beforeunload", () => {
    socket.close();
});
tabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
        // 移除所有按钮和内容的active类
        tabBtns.forEach(b => b.classList.remove('btn-success'));
        tabBtns.forEach(b => b.classList.add('btn-secondary'));
        contents.forEach(c => c.classList.remove('active'));

        // 添加当前按钮的active类
        this.classList.remove('btn-secondary');
        this.classList.add('btn-success');

        // 显示对应内容
        const tabId = this.getAttribute('id');
        const contentId = `${tabId}_content`;
        if (tabId != "start_game") {
            //允许切换至启动游戏页面
            document.getElementById("start_game").removeAttribute('disabled');
            document.getElementById("start_game").innerText = "返回启动页";
        } else {
            //启动游戏页面默认禁用
            document.getElementById("start_game").innerText = "启动游戏";
        }
        document.getElementById(contentId).classList.add('active');
    });
});

