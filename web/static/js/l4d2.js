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
    delimiters: ['${', '}'],
    el: '#game_config_tab',
    data: {
        jsonInput: `{
    "map": {
        "name": "游戏地图及章节",
        "type": "select",
        "options": [
            {
                "死亡中心": [
                    {"旅店": "c1m1_hotel"},
                    {"街道": "c1m2_streets"},
                    {"购物中心": "c1m3_mall"},
                    {"中厅": "c1m4_atrium"}
                ]                
            },
            {
                "黑色狂欢节": [
                    {"高速公路": "c2m1_highway"},
                    {"游乐场": "c2m2_fairgrounds"},
                    {"过山车": "c2m3_coaster"},
                    {"谷仓": "c2m4_barns"},
                    {"音乐会": "c2m5_concert"}
                ]
            },
            
            {
                "沼泽激战": [
                    {"乡村": "c3m1_plankcountry"},
                    {"沼泽": "c3m2_swamp"},
                    {"贫民窟": "c3m3_shantytown"},
                    {"种植园": "c3m4_plantation"}
                ]
            },
            {
                "暴风骤雨": [
                    {"密尔城": "c4m1_milltown_a"},
                    {"糖厂": "c4m2_sugarmill_a"},
                    {"逃离工厂": "c4m3_sugarmill_b"},
                    {"重返小镇": "c4m4_milltown_b"},
                    {"逃离小镇": "c4m5_milltown_escape"}
                ]
            },
            {
                "教区": [
                    {"码头": "c5m1_waterfront"},
                    {"公园": "c5m2_park"},
                    {"墓地": "c5m3_cemetery"},
                    {"特区": "c5m4_quarter"},
                    {"桥": "c5m5_bridge"}
                ]
            },
            {
                "短暂时刻": [
                    {"河畔": "c6m1_riverbank"},
                    {"地下通道": "c6m2_bedlam"},
                    {"港口": "c6m3_port"}
                ]
            },
            {
                "牺牲": [
                    {"码头": "c7m1_docks"},
                    {"驳船": "c7m2_barge"},
                    {"港口": "c7m3_port"}
                ]
            },
            {
                "毫不留情": [
                    {"公寓": "c8m1_apartment"},
                    {"地铁": "c8m2_subway"},
                    {"下水道": "c8m3_sewers"},
                    {"医院": "c8m4_interior"},
                    {"屋顶": "c8m5_rooftop"}
                ]
            },
            {
                "坠机险途": [
                    {"小巷": "c9m1_alleys"},
                    {"卡车停车场": "c9m2_lots"}
                ]
            },
            {
                "死亡丧钟": [
                    {"收费公路": "c10m1_caves"},
                    {"水沟": "c10m2_drainage"},
                    {"教堂": "c10m3_ranchhouse"},
                    {"主街道": "c10m4_mainstreet"},
                    {"码头": "c10m5_houseboat"}
                ]
            },
            {
                "寂静时分": [
                    {"花房": "c11m1_greenhouse"},
                    {"起重机": "c11m2_offices"},
                    {"建筑工地": "c11m3_garage"},
                    {"航空机场": "c11m4_terminal"},
                    {"飞机跑道": "c11m5_runway"}
                ]
            },
            {
                "血腥收获":[
                    {"森林": "c12m4_forest"},
                    {"隧道": "c12m2_traintunnel"},
                    {"桥": "c12m3_bridge"},
                    {"火车站": "c12m4_barn"},
                    {"农舍": "c12m5_cornfield"}
                ]
            },
            {
                "刺骨寒溪": [
                    {"高山小溪": "c13m1_alpinecreek"},
                    {"松木之河": "c13m2_southpinestream"},
                    {"纪念大桥": "c13m3_memorialbridge"},
                    {"残酷溪流": "c13m4_cutthroatcreek"}
                ]
            },
            {
                "临死一博": [
                    {"废物场": "c14m1_junkyard"},
                    {"灯塔终章": "c14m2_lighthouse"}
                ]
            }
        ]
    },
    "sv_cheats": {
        "name": "是否允许作弊",
        "type": "select",
        "options": [
            {"允许": 1},
            {"不允许": 0}
        ]
    },
    "hostport": {
        "name": "服务器端口",
        "type": "input_int",
        "value": 27015
    },
    "hostname": {
        "name": "服务器名称",
        "type": "input_str",
        "value": "L4D2 Server"
    },
    "sv_region": {
        "name": "服务器地区",
        "type": "select",
        "options": [
            {"美国东海岸": 0},
            {"美国西海岸": 1},
            {"南美": 2},
            {"欧洲": 3},
            {"亚洲": 4},
            {"澳洲": 5},
            {"中东": 6},
            {"非洲": 7},
            {"全球": 255}
        ]
    },
    "sv_allow_lobby_connect_only": {
        "name": "是否仅允许大厅连接",
        "type": "select",
        "options": [
            {"是": 1},
            {"否": 0}
        ]
    },
    "sv_steamgroup": {
        "name": "关联的Steam组ID（0表示无关联）",
        "type": "input_int",
        "value": 0
    },
    "mp_gamemode":{
        "name": "游戏模式",
        "type": "select",
        "options": [
            {"合作模式": "coop"},
            {"对抗模式": "versus"},
            {"生存模式": "survival"},
            {"清道夫模式": "scavenge"},
            {"写实模式": "realism"},
            {"突变模式": "mutationX"}
        ]
    },
    "z_difficulty":{
        "name": "游戏难度",
        "type": "select",
        "options": [
            {"简单": "easy"},
            {"普通": "normal"},
            {"困难": "hard"},
            {"专家": "impossible"}
        ]
    }
}`,
        config: {},
        formValues: {},
        selectedGroups: {},
        error: null
    },
    computed: {
        formattedResult() {
            return JSON.stringify(this.formValues, null, 4)
                .replace(/"([^"]+)":/g, '$1:')
                .replace(/true/g, 'true')
                .replace(/false/g, 'false');
        }
    },
    watch: {
        jsonInput: {
            immediate: true,
            handler(newValue) {
                try {
                    this.config = JSON.parse(newValue);
                    this.error = null;
                    //this.initializeFormValues();
                } catch (error) {
                    this.error = 'JSON解析错误: ' + error.message;
                    console.error('JSON解析错误:', error);
                }
            }
        },
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
                case 'select': return 'mdi mdi-checkbox-marked-outline';
                case 'input_int': return 'mdi mdi-sort-numeric';
                case 'input_str': return 'mdi mdi-code-string';
                default: return 'mdi mdi-pen';
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
            this.formValues[key] = '';
        },
        initializeFormValues() {
            this.formValues = {};
            this.selectedGroups = {};

            for (const key in this.config) {
                const field = this.config[key];

                if (field.type === 'input_int' || field.type === 'input_str') {
                    this.$set(this.formValues, key, field.value);
                }
                else if (field.type === 'select') {
                    if (this.isSingleLevel(field.options)) {
                        // 单层下拉框：使用第一个选项的值
                        const options = this.flattenOptions(field.options);
                        if (options.length > 0) {
                            // 修复点：直接使用值，无论类型
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
                data: this.formattedResult,
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
                        if (field.type === 'input_int' || field.type === 'input_str') {
                            this.formValues[key] = result[key];
                        }
                        // 设置单层下拉框值
                        else if (field.type === 'select' && this.isSingleLevel(field.options)) {
                            this.formValues[key] = result[key];
                        }
                        // 设置两级下拉框值
                        else if (field.type === 'select') {
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
        }
    },
    mounted() {
        this.initializeFormValues();
        this.getServerConfig();
    }
});