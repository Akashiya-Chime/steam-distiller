function getUsername() {
    let access_token = $.cookie("access_token")
    if (!access_token) {
        lightyear.notify("access_token异常，即将返回登录界面", "danger", 3000);
        setTimeout(() => {
            window.location.href = "/"
        }, 3000);
        return null;
    }
    //从jwt中获取用户名
    return JSON.parse(decodeURIComponent(window.atob(access_token.split(".")[1]))).sub
}

function generateInviteCode() {
    let username = getUsername();
    if (!username) {
        lightyear.notify("用户登录异常，生成邀请码失败", "danger", 3000, "", "top", "right");
        return null;
    }
    let result = null
    $.ajax({
        url: "/api/v1/invcode",
        type: "post",
        async: false,
        dataType: "json",
        data: JSON.stringify({
            "username": username,
        }),
        success: (r) => {
            if (r.code == 0) {
                lightyear.notify(r.msg, "success", 3000, "", "top", "right");
                result = r.data.invite_code;
            }
        },
        error: (r) => {
            lightyear.notify("网络异常，邀请码生成失败", "danger", 3000, "", "top", "right");
        }
    })
    return result;

}

document.addEventListener("DOMContentLoaded", function () {
    const inviteBtn = document.getElementById("inviteBtn");
    const codeContainer = document.getElementById("codeContainer");
    const codeBox = document.getElementById("codeBox");
    const codeValue = document.getElementById("codeValue");
    const loading = document.getElementById("loading");

    inviteBtn.addEventListener("click", function () {
        inviteBtn.style.display = "none";
        loading.style.display = "block";
        const code = generateInviteCode();
        loading.style.display = "none";
        if (!code) {
            inviteBtn.style.removeProperty("display");
            return;
        }
        codeValue.textContent = code;
        codeContainer.style.display = "block";
    });

    codeBox.addEventListener("click", function () {
        // 创建临时textarea用于复制
        const textarea = document.createElement("textarea");
        textarea.value = codeValue.textContent;
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        new Promise((resolve, reject) => {
            // 执行复制命令并移除文本框
            document.execCommand("copy") ? resolve() : reject(new Error("出错了"));
            textarea.remove();
        }).then(
            () => {
                lightyear.notify("邀请码已复制", "success", 3000, "", "top", "right");
            },
            () => {
                lightyear.notify("邀请码复制失败", "danger", 3000, "", "top", "right");
            }
        );
    });
});