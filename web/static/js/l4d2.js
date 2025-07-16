// 上传控制器
class UploadController {
    constructor(url, fileitem, user, chunkSize, maxConcurrent, maxRetry) {
        this.url = url;
        this.fileitem = fileitem;
        this.file = fileitem.file;
        this.user = user;
        this.chunkSize = chunkSize;
        this.maxConcurrent = maxConcurrent;
        this.maxRetry = maxRetry;
        this.totalChunks = Math.ceil(this.file.size / chunkSize);
        this.uploadedChunks = 0;
        this.chunkQueue = [];
        this.activeUploads = 0;
        this.isPaused = false;
        this.isCancelled = false;
        this.progressCallbacks = [];
        this.completeCallbacks = [];
        this.errorCallbacks = [];
        this.postsuccessCallback = () => { };
        // 初始化分片队列
        for (let i = 0; i < this.totalChunks; i++) {
            this.chunkQueue.push({
                index: i,
                retryCount: 0,
                start: i * chunkSize,
                end: Math.min((i + 1) * chunkSize, this.file.size)
            });
        }
    }

    onProgress(callback) {
        this.progressCallbacks.push(callback);
    }

    onPostsuccess(callback) {
        this.postsuccessCallback = callback;
    }
    onComplete(callback) {
        this.completeCallbacks.push(callback);
    }

    onError(callback) {
        this.errorCallbacks.push(callback);
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
        this.processQueue();
    }

    cancel() {
        this.isCancelled = true;
    }

    async start() {
        this.isPaused = false;
        this.isCancelled = false;
        await this.processQueue();
    }

    async processQueue() {
        if (this.isCancelled) return;

        // 达到最大并发数或没有更多分片
        while (this.activeUploads < this.maxConcurrent && this.chunkQueue.length > 0) {
            if (this.isPaused) break;

            const chunk = this.chunkQueue.shift();
            this.activeUploads++;
            this.uploadChunk(chunk);
        }
    }

    async uploadChunk(chunk) {
        if (this.isCancelled) return;

        try {
            const chunkBlob = this.file.slice(chunk.start, chunk.end);
            const formData = new FormData();
            // 将分片包装成 File 对象，保留原始文件名和类型
            const chunkFile = new File([chunkBlob], this.file.name, {
                type: this.file.type,
            });
            formData.append('file', chunkFile);
            formData.append('tag', this.fileitem.tag);
            formData.append('filename', this.fileitem.fileName);
            formData.append('user', this.user);
            formData.append('chunkIndex', chunk.index);
            formData.append('totalChunks', this.totalChunks);

            // 上传分片到服务器
            await this.sendChunk(formData);

            this.uploadedChunks++;
            this.activeUploads--;

            // 更新进度
            const progress = Math.floor((this.uploadedChunks / this.totalChunks) * 100);
            this.progressCallbacks.forEach(cb => cb(progress, chunk.index));

            // 检查是否全部完成
            if (this.uploadedChunks === this.totalChunks) {
                this.completeCallbacks.forEach(cb => cb());
            } else {
                // 继续处理队列
                this.processQueue();
            }
        } catch (error) {
            if (this.isCancelled) return;
            if (chunk.retryCount < this.maxRetry) {
                // 重试上传
                chunk.retryCount++;
                this.chunkQueue.unshift(chunk);
                this.activeUploads--;
                this.processQueue();
            } else {
                // 超过重试次数，上报错误
                this.errorCallbacks.forEach(cb => cb(`分片 ${chunk.index} 上传失败`));
            }
        }
    }

    async sendChunk(formData) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.url,
                type: "post",
                data: formData,
                contentType: "multipart/form-data",
                processData: false,
                contentType: false,
                dataType: "json",
                success: (r) => {
                    if (this.postsuccessCallback(r)) {
                        resolve();
                    } else {
                        reject(`上传失败: ${r.msg}`);
                    }
                },
                error: (r) => {
                    reject(`上传失败:${formData.get('chunkIndex')}`);

                }
            })
        })
    }
}




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

var app = new Vue({
    delimiters: ["${", "}"],
    el: "#TabsContent",
    data: {
        config: {},
        formValues: {},
        selectedGroups: {},
        modlist: [],
        modFiles: [],
        isUploading: false,
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
        },
    },
    computed: {
        isshowuploadarea() {
            if (this.modFiles.length === 0) {
                return true;
            } else if (!this.isUploading) {
                return true;
            }
            return false
        },
        isshowuploadbtn() {
            if (this.modFiles.length === 0) {
                return true;
            } else if (this.isUploading) {
                return true;
            }
            return false
        },
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
                        lightyear.notify("游戏配置提交成功！", "success", 3000, "", "top", "right");
                    } else {
                        lightyear.notify(r.msg, "danger", 3000, "", "top", "right");
                    }
                },
                error: (xhr) => {
                    lightyear.notify("网络异常，提交游戏配置失败", "danger", 3000, "", "top", "right");
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
                lightyear.notify("配置结果已成功应用到表单！", "success", 3000, "", "top", "right");
            } catch (e) {
                lightyear.notify("应用配置结果时出错：" + e.message, "danger", 3000, "", "top", "right");
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
                        lightyear.notify(r.msg, "danger", 3000, "", "top", "right");
                    }
                },
                error: (xhr) => {
                    lightyear.notify("网络异常，服务器端游戏配置获取失败", "danger", 3000, "", "top", "right");
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
                    lightyear.notify("网络异常，初始化配置表失败", "danger", 3000, "", "top", "right");
                }
            })
        },
        // mod界面函数
        // 处理选中的文件
        handleFiles(files) {
            if (files.length === 0) return;
            for (let file of files) {
                this.modFiles.push({
                    file: file,
                    fileName: file.name,
                    tag: "",
                });
            }
            $("#fileInput").val(""); //同名文件可再次触发change事件
            this.updateFilePreview();
        },
        listenDrop() {
            const dropArea = $('#dropArea');
            // 拖放事件处理
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropArea.on(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropArea.on(eventName, function () {
                    $(this).addClass('drag-over');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropArea.on(eventName, function () {
                    $(this).removeClass('drag-over');
                });
            });
            dropArea.on('drop', (e) => {
                const files = e.originalEvent.dataTransfer.files;
                this.handleFiles(files);
            });
        },
        // 更新文件预览
        updateFilePreview() {
            const filePreview = $('#filePreview');
            const emptyState = $('#emptyState');
            filePreview.empty();
            if (this.modFiles.length === 0) {
                filePreview.append(emptyState.clone().show());
                return;
            }
            // 显示文件预览
            //modFiles去重,避免上传相同文件
            this.modFiles = this.modFiles.filter((item, index, self) =>
                index === self.findIndex((t) => t.fileName === item.fileName)
            );
            for (let fileItem of this.modFiles) {
                let fileItem_dom = $(
                    `<div class="file_dom" data-filename="${fileItem.fileName}">
                        <div class="file-item">
                            <div class="file-info">
                                <div class="file-name">${fileItem.fileName}</div>
                            </div>
                            <div class="form-group file-tag">
                                <input class="form-control" placeholder="请输入唯一的mod名称"
                                id="modTagInput" oninput="updateModTag('${fileItem.fileName}',this.value)">
                            </div>
                            <div class="file-actions">
                                <button class="btn btn-sm btn-danger" title="移除" onclick="removeFile('${fileItem.fileName}')">
                                    <i class="mdi mdi-close"></i>删除
                                </button>
                                <button class="btn btn-sm btn-secondary" title="重新上传"style="display: none;" onclick="uploadSingleMod('${fileItem.fileName}')">
                                    <i class="mdi mdi-backup-restore"></i>重试
                                </button>
                            </div>
                        </div>
                            <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="0"
                             aria-valuemin="0" aria-valuemax="100">
                            </div>
                        </div>`
                );
                filePreview.append(fileItem_dom);
            }
        },
        removeFile(filename) {
            $(`[data-filename="${filename}"]`).removeClass('fade-in');
            $(`[data-filename="${filename}"]`).addClass('removing');
            setTimeout(() => {
                this.modFiles = this.modFiles.filter(item => item.fileName !== filename);
                $(`[data-filename="${filename}"]`).remove();
                if (this.modFiles.length == 0) {
                    this.isUploading = false
                    $("#uploadModal").modal('hide');
                }
            }, 500);
        },
        updateModTag(filename, val) {
            let fileItem = this.modFiles.find(item => item.fileName === filename);
            if (fileItem) {
                fileItem.tag = val;
            }
        },
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
                        lightyear.notify(r.msg, "danger", 3000, "", "top", "right");
                    }
                },
                error: (xhr) => {
                    lightyear.notify("网络异常，mod列表获取失败", "danger", 3000, "", "top", "right");
                }
            })
        },
        deleteMod(item) {
            //弹出确认模态框
            this.$confirm('确认删除mod吗？', '删除mod', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                $.ajax({
                    url: "/api/v1/l4d2/mod" + "?tag=" + item.tag,
                    type: "delete",
                    async: false,
                    contentType: "application/json",
                    dataType: "json",
                    success: (r) => {
                        if (r.code == 0) {
                            lightyear.notify("删除成功！", "success", 3000, "", "top", "right");
                            this.modlist = this.modlist.filter(mod => mod.tag !== item.tag);
                        } else {
                            lightyear.notify("删除失败：" + r.msg, "danger", 3000, "", "top", "right");
                        }
                    },
                    error: (xhr) => {
                        lightyear.notify("网络异常，删除mod失败", "danger", 3000, "", "top", "right");
                    }
                })
            })
        },
        getUsername() {
            let access_token = window.parent.$.cookie("access_token")
            let username = JSON.parse(decodeURIComponent(escape(window.atob(access_token.split(".")[1])))).sub
            return username
        },
        uploadSingleMod(filename) {
            let fileItem = this.modFiles.find(item => item.fileName === filename);
            if (fileItem) {
                this.uploadMod([fileItem]);
            }
        },
        async uploadByChunk(fileitem) {
            const CHUNK_SIZE = 3 * 1024 * 1024;
            const MAX_CONCURRENT_UPLOADS = 5;
            const MAX_RETRY_COUNT = 3;
            let retryBtn = $(`[data-filename="${fileitem.fileName}"]`).find('.btn-secondary');
            this.updateProgress(fileitem.fileName, 0, 'uploading');
            this.isUploading = true;
            totalChunks = Math.ceil(fileitem.file.size / CHUNK_SIZE);
            try {
                uploadController = new UploadController(
                    "/api/v1/l4d2/modchunk",
                    fileitem,
                    this.getUsername(),
                    CHUNK_SIZE,
                    MAX_CONCURRENT_UPLOADS,
                    MAX_RETRY_COUNT
                );
                uploadController.onProgress((progress, chunkIndex) => {
                    this.updateProgress(fileitem.fileName, progress, 'uploading');
                });
                uploadController.onComplete(() => {
                    this.updateProgress(fileitem.fileName, 100, 'success');
                    this.getmodlist();
                    this.removeFile(fileitem.fileName);
                    retryBtn.hide();
                });
                uploadController.onError((error) => {
                    console.error(fileitem.fileName, error)
                    this.updateProgress(fileitem.fileName, null, 'error');
                    lightyear.notify("上传失败：" + fileitem.fileName, "danger", 3000, "", "top", "right");
                    retryBtn.show();
                });
                uploadController.onPostsuccess((r) => {
                    if (r.code == 4001 || r.code == 4002 || r.code == 4004) {
                        return true
                    }
                    return false
                })
                // 开始上传
                await uploadController.start();
            } catch (error) {
                console.error(fileitem.fileName, error)
                lightyear.notify("程序错误，上传失败：" + fileitem.fileName, "danger", 3000, "", "top", "right");
            }
        },
        uploadMod(files) {
            if (files.length === 0) {
                lightyear.notify("请先选择mod文件", "danger", 3000, "", "top", "right");
                return;
            }
            if (this.isUploading) {
                lightyear.notify("有文件正在上传，请等待", "danger", 3000, "", "top", "right");
                return;
            }
            for (let file of files) {
                if (file.tag === "") {
                    lightyear.notify("mod名称为空:" + file.fileName, "danger", 3000, "", "top", "right");
                    return;
                }
                if (this.modlist.some(item => item.tag === file.tag) || files.some(item => item.tag === file.tag && item.fileName != file.fileName)) {
                    lightyear.notify("上传失败，已存在相同名称的mod:" + file.tag, "danger", 3000, "", "top", "right");
                    return;
                }
                if (this.modlist.some(item => item.fileName === file.fileName)) {
                    lightyear.notify("上传失败，已存在相同名称的vpk文件:" + file.fileName, "danger", 3000, "", "top", "right");
                    return;
                }
            }
            this.isUploading = true
            user = this.getUsername()
            for (let file of files) {
                this.updateProgress(file.fileName, 0, 'uploading');
                this.uploadByChunk(file)
            }
        },
        updateProgress(filename, num, type) {
            const MIN_PROGRESS = 5;//最低显示进度为5，以保证能够显示进度条
            num = Math.max(num, MIN_PROGRESS)
            let progressBar = $(`[data-filename="${filename}"]`).find('.progress-bar');
            for (i of ["uploading", "success", "error"]) {
                if (i != type) {
                    progressBar.removeClass('progress-' + i);
                }
            }
            progressBar.addClass('progress-' + type);
            progressBar.text(num + '%');
            if (num != null) {
                progressBar.css('width', num + '%');
            }
        },
    },
    mounted() {
        this.getmodlist();
        this.initConfig();
        if (this.config) {
            this.initializeFormValues();
            this.getServerConfig();
        }
        this.listenDrop();
        window.updateModTag = this.updateModTag;
        window.removeFile = this.removeFile;
        window.uploadSingleMod = this.uploadSingleMod;
    }
});
$("[data-toggle='tooltip']").tooltip();
// console
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