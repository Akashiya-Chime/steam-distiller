function exit() {
    $.cookie("access_token", null, { expires: -1 }) // 删除access_token
    lightyear.notify("退出登录成功", 'success', 1000);
    setTimeout(() => {
        window.location.href = "/"
    }, 2000)
}

function switch_tab(obj) {
    // 切换标题
    $(".navbar-page-title")[0].innerText = obj.innerText
    // 切换导航栏
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
        lightyear.notify("access_token异常，用户信息获取失败", 'danger', 3000);
        setTimeout(() => {
            window.location.href = "/"
        }, 3000); // 3秒后重定向到登录页面
        return
    }
    let user_info_from_cookie = JSON.parse(decodeURIComponent(escape(window.atob(access_token.split('.')[1])))).sub
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
                lightyear.notify(r.data.msg, 'danger', 3000);
            }
        },
        error: function (xhr) {
            lightyear.notify("网络异常，用户信息获取失败", 'danger', 3000);
        }
    })
}

get_user_info()