function getUsername() {
    let access_token = $.cookie("access_token")
    if (!access_token) {
        lightyear.notify("access_token异常，即将返回登录界面", 'danger', 3000);
        setTimeout(() => {
            window.location.href = "/"
        }, 3000);
        return null;
    }
    //从jwt中获取用户名
    return JSON.parse(decodeURIComponent(window.atob(access_token.split('.')[1]))).sub
}

function generateInviteCode() {
    let username = getUsername();
    if (!username) {
        lightyear.notify("用户登录异常，生成邀请码失败", 'danger', 3000, "", 'top', 'right');
        return null;
    }
    $.ajax({
        url: "/api/v1/invcode",
        type: "post",
        dataType: "json",
        data: JSON.stringify({
            "username": username,
        }),
        success: function (r) {
            if (r.code == 0) {
                lightyear.notify(r.data.msg, 'success', 3000, "", 'top', 'right');
                return r.data.invite_code;
            }
        },
        error: function (xhr) {
            lightyear.notify("网络异常，邀请码生成失败", 'danger', 3000, "", 'top', 'right');
            return null;
        }
    })
}

document.addEventListener('DOMContentLoaded', function () {
    const inviteBtn = document.getElementById('inviteBtn');
    const codeContainer = document.getElementById('codeContainer');
    const codeBox = document.getElementById('codeBox');
    const codeValue = document.getElementById('codeValue');
    const loading = document.getElementById('loading');

    inviteBtn.addEventListener('click', function () {
        inviteBtn.style.display = 'none';
        loading.style.display = 'block';
        const code = generateInviteCode();
        loading.style.display = 'none';
        if (!code) {
            inviteBtn.style.removeProperty('display');
            return;
        }
        codeValue.textContent = code;
        codeContainer.style.display = 'block';
    });

    codeBox.addEventListener('click', function () {
        // 创建临时textarea用于复制
        const textarea = document.createElement('textarea');
        textarea.value = codeValue.textContent;
        textarea.style.display = 'none';
        document.body.appendChild(textarea);
        textarea.select();
        // 尝试使用Clipboard API复制
        try {
            navigator.clipboard.writeText(textarea.value).then(() => {
            }).catch((err) => {
                lightyear.notify("自动复制失败，请手动复制", 'danger', 3000);
                return;
            });
        } catch (err) {
            document.execCommand('copy');
        }
        lightyear.notify("邀请码已复制", 'success', 3000);
        document.body.removeChild(textarea);
    });
});