
var vm = new Vue({
    el: "#login",
    data: {
        user_info: {},
        remember_password: true,
    },
    methods: {
        to_register: function () {
            window.location.href = "/register"
        },
        change_password_show: function () {
           if ($("#password").attr("type") == "password") {
                $("#password").attr("type", "text")
                $(".password-icon > span").removeClass("mdi-eye-off")
                $(".password-icon > span").addClass("mdi-eye")                
            } else {
                $("#password").attr("type", "password")
                $(".password-icon > span").removeClass("mdi-eye")
                $(".password-icon > span").addClass("mdi-eye-off")
            }
        },
        login: function () {
            if (!this.user_info.user || !this.user_info.pass) {
                lightyear.notify('账号密码不能为空', 'danger', 3000);
                return
            }
            lightyear.loading('show')
            vm.$http.post("/user/login", {
                username: this.user_info.user,
                password: md5(this.user_info.pass)
            }, {
                emulateJSON: false
            }).then(function (r) {
                lightyear.loading('hide')
                content = r.data
                if (content.code == 0) {
                    document.cookie = "access_token=" + content.data.access_token + ";path=/";
                    if (this.remember_password) {
                        localStorage.setItem('username', this.user_info.user);
                        localStorage.setItem('password', this.user_info.pass);
                    } else {
                        localStorage.removeItem('username');
                        localStorage.removeItem('password');
                    }
                    lightyear.notify(content.data.msg, 'success', 1000);
                    setTimeout(function () {
                        window.location.href = "home"
                    }, 1000);
                } else {
                    lightyear.notify(content.data.msg, 'danger', 3000);
                }
            }).catch(error => {
                lightyear.loading('hide')
                lightyear.notify('网络异常，请稍后再试', 'danger', 3000);
            })
        },
    },
    created: function () {
        document.cookie = ''
        const savedUsername = localStorage.getItem('username');
        const savedPassword = localStorage.getItem('password');
        if (savedUsername && savedPassword) {
            this.user_info.user = savedUsername;
            this.user_info.pass = savedPassword;
            this.remember_password = true;
        }
    }
});
document.onkeydown = function (e) {
    const ENTER_CODE = 13; //回车键的键值为13
    var theEvent = window.event || e;
    var code = theEvent.keyCode || theEvent.which;
    if (code == ENTER_CODE) {
        vm.login();
    }
}