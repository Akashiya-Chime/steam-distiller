var vm = new Vue({
    el: "#content",
    data: {
        user_info: {
            user: '',
            pass: '',
            invitation_code: ''
        },
    },
    methods: {
        check: function (target) {
            //检查是否为纯数字和字母的组合
            var reg = /^[0-9A-Za-z]{4,16}$/;
            return reg.test(target);
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
        register: function () {
            if (!this.check(this.user_info.user)) {
                lightyear.notify('用户名必须为4-16位数字和字母的组合', 'danger', 3000);
                return;
            }
            if (!this.check(this.user_info.pass)) {
                lightyear.notify('密码必须为4-16位数字和字母的组合', 'danger', 3000);
                return;
            }
            if (!this.user_info.invitation_code) {
                lightyear.notify('邀请码不能为空', 'danger', 3000);
                return
            }
            lightyear.loading('show')
            vm.$http.post("/user/register", {
                username: this.user_info.user,
                password: md5(this.user_info.pass),
                invitation_code: this.user_info.invitation_code
            }, {
                emulateJSON: false
            }).then(function (r) {
                lightyear.loading('hide')
                content = r.data;
                if (content.code == 0) {
                    lightyear.notify(content.data.msg, 'success', 1000);
                    setTimeout(function () {
                        window.location.href = "/"
                    }, 1000);
                } else {
                    lightyear.notify(content.data.msg, 'danger', 3000);
                }
            }).catch(error => {
                lightyear.loading('hide')
                lightyear.notify('网络异常，请稍后再试', 'danger', 3000);
            })
        },
        expand_collapse: function (event) {
            target = "#" + event.target.id + "_require"
            $(target)[0].setAttribute('aria-expanded', true);
            $(target)[0].classList.add("in");
        },
        collapse: function (event) {
            target = "#" + event.target.id + "_require"
            $(target)[0].setAttribute('aria-expanded', false);
            $(target)[0].classList.remove("in");
        },
        change_status: function (event) {
            target = "#" + event.target.id + "_require > div > p > span";
            if (this.check(event.target.value)) {
                $(target)[0].classList.remove("text-warning", "mdi-alert-circle");
                $(target)[0].classList.add("text-success", "mdi-check-circle");
            } else {
                $(target)[0].classList.remove("text-success", "mdi-check-circle");
                $(target)[0].classList.add("text-warning", "mdi-alert-circle");
            }
        }
    },
});