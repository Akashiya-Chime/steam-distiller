function getGameStatus() {
    is_success = false // 用于判断是否成功连到服务器
    now_status = ""
    $.ajax({
        url: "/api/v1/l4d2/status",
        type: "get",
        async: false,
        dataType: "json",
        success: function (r) {
            is_success = true
            if (r.code == 0) {
                now_status = r.data.status
            } else {
                lightyear.notify(r.msg, "danger", 3000, "", "top", "right");
            }
        },
        error: function (xhr) {
            lightyear.notify("网络异常，获取服务状态失败", "danger", 3000, "", "top", "right");
        }
    })
    return [is_success, now_status]
}
function switchGame(term_class, action) {
    const [status_control, prompt, url] =
        action === "start"
            ? ["running", "启动", "/api/v1/l4d2/start"]
            : ["closed", "关闭", "/api/v1/l4d2/stop"]
    if (!term_class.isConnected) {
        lightyear.notify("与服务器尚未建立连接，请稍后再试", "danger", 3000, "", "top", "right");
        return;
    }
    let [is_success, now_status] = getGameStatus()
    if (is_success == false) {
        return;
    }
    if (now_status == status_control) {
        lightyear.notify("服务已经" + prompt, "success", 3000, "", "top", "right");
        return;
    }
    term_class.term.writeln(`\r\n\x1b[32m正在` + prompt + `游戏服务...\x1b[0m\r\n`);
    $.ajax({
        url: url,
        type: "get",
        dataType: "json",
        success: function (r) {
            if (r.code == 0) {
                term_class.isGameStarted = true;
                lightyear.notify(r.data.msg, "success", 3000, "", "top", "right");
            }
        },
        error: function (xhr) {
            lightyear.notify("网络异常，服务" + prompt + "失败", "danger", 3000, "", "top", "right");
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
term_l4d2.term.open(document.getElementById("terminal"));
document.getElementById("start-btn").addEventListener("click", () => { switchGame(term_l4d2, "start") });
document.getElementById("stop-btn").addEventListener("click", () => { switchGame(term_l4d2, "close") });
document.getElementById("clear-btn").addEventListener("click", () => { term_l4d2.term.clear() });