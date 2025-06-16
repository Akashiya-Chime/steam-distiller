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
    fontSize: 14,
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

// 打开终端
term.open(document.getElementById('terminal'));
fitAddon.fit();
const socket = new WebSocket(`ws://${window.location.host}/webterminal`); // 创建WebSocket连接
// 添加欢迎信息
term.writeln('\x1b[33m$\x1b[0m \x1b[32m欢迎使用steamCMD终端界面\x1b[0m ');;
term.writeln('');
term.write('\x1b[33m$\x1b[0m ');

// 添加简单的交互
let command = '';
term.onData(e => {
    switch (e) {
        case '\x03': // Ctrl+C
            term.write('\r\n');
            term.write('^C\r\n');
            break;
        case '\r':
            term.write('\r\n');
            term.write('\x1b[33m$\x1b[0m '); // 添加新的命令提示符
            break;
        case '\x7f': // Backspace
            term.write('\b \b');
            break;
        default:
            term.write(e);
            break;
    }
    socket.send(data); // 通过WebSocket发送给服务器
});
socket.onmessage = (event) => { // 收到来自服务器的WebSocket消息
    console.log('socket.onmessage:', event.data);
    term.write(event.data); // 向xterm对象写入数据
};

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