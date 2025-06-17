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
let wsUrl = `ws://localhost:8735/api/v1/ws/steamcmd`; //(`ws://${window.location.host}/api/v1/ws/steamcmd`); 
let socket = null
let isConnected = false; // 跟踪连接状态;
function connectWebSocket() {
    term.writeln('\r\n\x1b[32m正在连接服务器...\x1b[0m');

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            term.writeln('\x1b[32m连接成功！\x1b[0m');
            command = ''; // 清空命令
            term.write('\x1b[33m$\x1b[0m ');
            term.focus();
            updateConnectionStatus(true);
        };
        socket.onmessage = (event) => {
            // 将服务器返回的数据写入终端
            term.writeln(event.data); // 在终端显示服务器的消息
            term.write('\x1b[33m$\x1b[0m '); // 重新显示命令提示符
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

// 发送命令
function sendCommand(command) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        term.writeln('\x1b[31m未连接到服务器\x1b[0m');
        updateConnectionStatus(false);
        return false;
    }
    try {
        socket.send(command);
        return true;
    } catch (error) {
        term.write(`\r\n\x1b[31m发送失败: ${error.message}\x1b[0m\r\n`);
        setTimeout(connectWebSocket, 1000);
        return false;
    }
}

term.onKey((event) => {
    switch (event.key) {
        case '\r': // 按下Enter键
            term.writeln('');
            term.write('\x1b[33m$\x1b[0m '); // 重新显示命令提示符
            if (command.length > 0) {
                console.log([command]);
                sendCommand(command)
                command = '';
            }
            return;
        case '\x7F': // 按下Backspace键
            if (command.length > 0) {
                command = command.slice(0, -1); // 删除最后一个字符
                term.write('\b \b'); // 删除终端显示的字符
            }
            return;
        case '\x03': // 按下Ctrl+C键
            command = ''; // 清空命令
            term.writeln('');
            term.writeln('\x1b[31m^C\x1b[0m'); // 显示Ctrl+C
            term.write('\x1b[33m$\x1b[0m '); // 重新显示命令提示符
            sendCommand(event.key);
            return;

        default:
            command += event.key; // 记录输入的字符
            term.write(event.key); // 在终端显示输入的字符
            return;
    }
})

term.writeln('\x1b[33m$\x1b[0m \x1b[32m欢迎使用steamCMD终端界面\x1b[0m ');
connectWebSocket();

// 窗口调整大小时重新适配终端
window.addEventListener('resize', () => {
    fitAddon.fit();
});

// 清除终端按钮
document.getElementById('clear-btn').addEventListener('click', () => {
    term.clear();
});

// 重置终端按钮
document.getElementById('reset-btn').addEventListener('click', () => {
    term.reset();
    term.writeln('\x1b[36m终端已重置\x1b[0m');
    term.write('\x1b[33m$\x1b[0m ');
});
// 页面关闭时清理
window.addEventListener("beforeunload", () => {
    client.close();
});

function updateConnectionStatus(connected) {
    isConnected = connected;
    if (connected) {
        document.getElementById("statusIndicator").classList.add("connected")
        document.getElementById("statusText").innerText = "已连接";
    } else {
        document.getElementById("statusIndicator").classList.remove("connected")
        document.getElementById("statusText").innerText = "正在连接服务器...";
    }
}