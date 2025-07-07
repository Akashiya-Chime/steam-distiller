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
    term_class.info(`正在${prompt}服务...`);
    $.ajax({
        url: url,
        type: "get",
        dataType: "json",
        success: function (r) {
            if (r.code == 0) {
                term_class.isGameStarted = true;
                lightyear.notify(r.msg, "success", 3000, "", "top", "right");
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

//游戏配置部分
var app = new Vue({
    delimiters: ["${", "}"],
    el: "#TabsContent",
    data: {
        config: {},
        formValues: {},
        selectedGroups: {},
        modlist: [],
        modFile: null,
        modTag: "",
    },
    watch: {
        selectedGroups: {
            deep: true,
            handler() {
                for (const key in this.selectedGroups) {
                    if (this.selectedGroups[key] !== null) {
                        const subOptions = this.getSubOptions(key);
                        if (subOptions.length > 0) {
                            this.formValues[key] = this.getOptionValue(subOptions[0]);
                        }
                    }
                }
            }
        }
    },
    methods: {
        getFieldIcon(fieldType) {
            switch (fieldType) {
                case "select": return "mdi mdi-checkbox-marked-outline";
                case "input_int": return "mdi mdi-sort-numeric";
                case "input_str": return "mdi mdi-code-string";
                default: return "mdi mdi-pen";
            }
        },
        isSingleLevel(options) {
            return options.every(option => {
                const value = Object.values(option)[0];
                return !Array.isArray(value);
            });
        },
        flattenOptions(options) {
            return options.map(option => {
                const key = Object.keys(option)[0];
                return {
                    label: key,
                    value: option[key]
                };
            });
        },
        getGroupName(group) {
            return Object.keys(group)[0];
        },
        getOptionLabel(option) {
            return Object.keys(option)[0];
        },
        getOptionValue(option) {
            return Object.values(option)[0];
        },
        getSubOptions(key) {
            if (this.selectedGroups[key] === null || this.selectedGroups[key] === undefined)
                return [];

            const group = this.config[key].options[this.selectedGroups[key]];
            return Object.values(group)[0];
        },
        resetSubSelection(key) {
            this.formValues[key] = "";
        },
        initializeFormValues() {
            this.formValues = {};
            this.selectedGroups = {};

            for (const key in this.config) {
                const field = this.config[key];
                if (field.type === "input_int") {
                    this.$set(this.formValues, key, field.value);
                } else if (field.type === "input_str") {
                    this.$set(this.formValues, key, field.value.replace(/\s+/g, ""));
                }
                else if (field.type === "select") {
                    if (this.isSingleLevel(field.options)) {
                        // 单层下拉框：使用第一个选项的值
                        const options = this.flattenOptions(field.options);
                        if (options.length > 0) {
                            this.$set(this.formValues, key, options[0].value);
                        }
                    } else {
                        // 两级下拉框：初始化组选择
                        this.$set(this.selectedGroups, key, 0);
                        // 获取第一组的第一个选项
                        if (field.options && field.options.length > 0) {
                            const firstGroup = field.options[0];
                            const firstGroupItems = Object.values(firstGroup)[0];
                            if (firstGroupItems.length > 0) {
                                this.$set(this.formValues, key, this.getOptionValue(firstGroupItems[0]));
                            }
                        }
                    }
                }
            }
        },
        submitForm() {
            $.ajax({
                url: "/api/v1/l4d2/config",
                type: "post",
                data: JSON.stringify(this.formValues),
                contentType: "application/json",
                dataType: "json",
                success: (r) => {
                    if (r.code == 0) {
                        lightyear.notify("游戏配置提交成功！", "success", 3000);
                    } else {
                        lightyear.notify(r.msg, "danger", 3000);
                    }
                },
                error: (xhr) => {
                    lightyear.notify("网络异常，提交游戏配置失败", "danger", 3000);
                }
            })
        },
        applyToForm(result) {
            try {
                for (const key in result) {
                    if (this.config[key]) {
                        const field = this.config[key];
                        // 设置输入框值
                        if (field.type === "input_int" || field.type === "input_str") {
                            this.formValues[key] = result[key];
                        }
                        // 设置单层下拉框值
                        else if (field.type === "select" && this.isSingleLevel(field.options)) {
                            this.formValues[key] = result[key];
                        }
                        // 设置两级下拉框值
                        else if (field.type === "select") {
                            const targetValue = result[key];
                            let found = false;

                            // 遍历所有组
                            for (let groupIndex = 0; groupIndex < field.options.length; groupIndex++) {
                                const group = field.options[groupIndex];
                                const subOptions = Object.values(group)[0];

                                // 在子选项中查找匹配的值
                                for (const option of subOptions) {
                                    if (this.getOptionValue(option) === targetValue) {
                                        this.selectedGroups[key] = groupIndex;
                                        this.formValues[key] = targetValue;
                                        found = true;
                                        break;
                                    }
                                }

                                if (found) break;
                            }

                            if (!found) {
                                console.warn(`Value ${targetValue} not found for field ${key}`);
                            }
                        }
                    }
                }
                lightyear.notify("配置结果已成功应用到表单！", "success", 3000);
            } catch (e) {
                lightyear.notify("应用配置结果时出错：" + e.message, "danger", 3000);
            }
        },
        getServerConfig() {
            $.ajax({
                url: "/api/v1/l4d2/config",
                type: "get",
                dataType: "json",
                success: (r) => {
                    if (r.code == 0) {
                        this.applyToForm(r.data)
                    } else {
                        lightyear.notify(r.msg, "danger", 3000);
                    }
                },
                error: (xhr) => {
                    lightyear.notify("网络异常，服务器端游戏配置获取失败", "danger", 3000);
                }
            })
        },
        initConfig() {
            $.ajax({
                url: "/static/config/l4d2_mapping.json",
                type: "get",
                async: false,
                dataType: "json",
                success: (r) => {
                    this.config = r
                },
                error: () => {
                    lightyear.notify("网络异常，初始化配置表失败", "danger", 3000);
                }
            })
        },
        // mod界面函数
        getmodlist() {
            $.ajax({
                url: "/api/v1/l4d2/mods",
                type: "get",
                async: false,
                dataType: "json",
                success: (r) => {
                    if (r.code == 0) {
                        this.modlist = r.data;
                    } else {
                        lightyear.notify(r.msg, "danger", 3000);
                    }
                },
                error: (xhr) => {
                    lightyear.notify("网络异常，mod列表获取失败", "danger", 3000);
                }
            })
        },
        deleteMod(item) {
            $.ajax({
                url: "/api/v1/l4d2/mod"+"?tag=" + item.tag,
                type: "delete",
                async: false,
                contentType: "application/json",
                dataType: "json",
                success: (r) => {
                    if (r.code == 0) {
                        lightyear.notify("删除成功！", "success", 3000);
                        this.modlist = this.modlist.filter(mod => mod.tag !== item.tag);
                    } else {
                        lightyear.notify("删除失败：" + r.msg, "danger", 3000);
                    }
                },
                error: (xhr) => {
                    lightyear.notify("网络异常，删除mod失败", "danger", 3000);
                }
            })
        },
        getUsername() {
            let access_token = window.parent.$.cookie("access_token")
            let username = JSON.parse(decodeURIComponent(escape(window.atob(access_token.split(".")[1])))).sub
            return username
        },
        handleFileChange() {
            this.modFile = $("#fileInput")[0].files[0];
            $("#fileName").text(this.modFile?.name || "未选择任何文件");
        },
        uploadMod() {
            if (this.modTag === "") {
                lightyear.notify("请输入mod名称", "danger", 3000);
                return;
            }
            if (this.modFile === null) {
                lightyear.notify("请选择mod文件", "danger", 3000);
                return;
            }
            //检查是否重复标签
            if (this.modlist.some(item => item.tag === this.modTag)) {
                lightyear.notify("上传失败，已存在相同名称的mod", "danger", 3000);
                return;
            }
            //检查是否重复文件名
            if (this.modlist.some(item => item.file === this.modFile.name)) {
                lightyear.notify("上传失败，已存在相同名称的vpk文件", "danger", 3000);
                return;
            }
            const formData = new FormData();
            formData.append('file', this.modFile);
            formData.append('tag', this.modTag);
            formData.append('user', this.getUsername());

            $.ajax({
                url: "/api/v1/l4d2/mod",
                type: "post",
                data: formData,
                contentType: "multipart/form-data",
                processData: false,
                contentType: false,
                dataType: "json",
                success: (r) => {
                    if (r.code == 0) {
                        lightyear.notify("上传成功！", "success", 3000);
                        this.getmodlist();
                    } else {
                        lightyear.notify("上传失败：" + r.msg, "danger", 3000);
                    }
                },
                error: (xhr) => {
                    lightyear.notify("网络异常，上传mod失败", "danger", 3000);
                }
            })
        },
    },
    mounted() {
        this.initConfig();
        if (this.config) {
            this.initializeFormValues();
            this.getServerConfig();
        }
        this.getmodlist();
    }
});