function startGame(term_class) {
    if (!term_class.isConnected) {
        lightyear.notify("与服务器尚未建立连接，请稍后再试", 'danger', 3000, "", 'top', 'right');
        return;
    }
    if (term_class.isGameStarted) {
        lightyear.notify("游戏已经启动，请勿重复操作", 'danger', 3000, "", 'top', 'right');
        return;
    }
    term_class.term.writeln(`\r\n\x1b[32m正在启动游戏...\x1b[0m\r\n`);
    $.ajax({
        url: "/api/v1/l4d2/start",
        type: "get",
        dataType: "json",
        success: function (r) {
            if (r.code == 0) {
                term_class.isGameStarted = true;
                lightyear.notify(r.data.msg, 'success', 3000, "", 'top', 'right');
            }
        },
        error: function (xhr) {
            lightyear.notify("网络异常，游戏启动失败", 'danger', 3000, "", 'top', 'right');
        }
    })
}

function stopGame(term_class) {
    if (!term_class.isConnected) {
        lightyear.notify("与服务器尚未建立连接，请稍后再试", 'danger', 3000, "", 'top', 'right');
        return;
    }
    if (!term_class.isGameStarted) {
        lightyear.notify("游戏还未启动，请勿重复操作", 'danger', 3000, "", 'top', 'right');
        return;
    }
    term_class.term.writeln(`\r\n\x1b[32m正在关闭游戏...\x1b[0m\r\n`);
    $.ajax({
        url: "/api/v1/l4d2/stop",
        type: "get",
        dataType: "json",
        success: function (r) {
            if (r.code == 0) {
                term_class.isGameStarted = false;
                lightyear.notify(r.data.msg, 'success', 3000, "", 'top', 'right');
            }
        },
        error: function (xhr) {
            lightyear.notify("网络异常，游戏关闭失败", 'danger', 3000, "", 'top', 'right');
        }
    })
}

const term_l4d2 = window.parent.term_l4d2
//重写连接状态更新方法，避免找不到元素的问题
term_l4d2.updateConnectionStatus = function (connected) {
    this.isConnected = connected;
    if (connected) {
        document.getElementById("statusIndicator").classList.add("connected")
        document.getElementById("statusText").innerText = "已连接";
    } else {
        document.getElementById("statusIndicator").classList.remove("connected")
        document.getElementById("statusText").innerText = "正在连接服务器...";
    }
}
term_l4d2.updateConnectionStatus(term_l4d2.isConnected) // 重新显示终端时刷新状态
term_l4d2.term.open(document.getElementById('terminal'));
document.getElementById('start-btn').addEventListener('click', () => { startGame(term_l4d2) });
document.getElementById('stop-btn').addEventListener('click', () => { stopGame(term_l4d2) });
document.getElementById('clear-btn').addEventListener('click', () => { term_l4d2.term.clear() });