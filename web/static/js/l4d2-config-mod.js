class UploadController {
    constructor(url, fileItem, user, chunkSize, maxConcurrent, maxRetry) {
        this.url = url;
        this.fileItem = fileItem;
        this.file = fileItem.file;
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
        while ((this.activeUploads < this.maxConcurrent) && (this.chunkQueue.length > 0)) {
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
            formData.append('file', chunkBlob);
            formData.append('tag', this.fileItem.tag);
            formData.append('filename', this.fileItem.fileName);
            formData.append('user', this.user);
            formData.append('chunkIndex', chunk.index);
            formData.append('totalChunks', this.totalChunks);
            await this.sendChunk(formData);
            this.uploadedChunks++;
            this.activeUploads--;
            const progress = Math.floor((this.uploadedChunks / this.totalChunks) * 100);
            this.progressCallbacks.forEach(cb => cb(progress, chunk.index));
            if (this.uploadedChunks === this.totalChunks) {
                this.completeCallbacks.forEach(cb => cb());
            } else {
                this.processQueue();
            }
        } catch (error) {
            if (this.isCancelled) return;
            if (chunk.retryCount < this.maxRetry) {
                chunk.retryCount++;
                this.chunkQueue.unshift(chunk);
                this.activeUploads--;
                this.processQueue();
            } else {
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

var app = new Vue({
    delimiters: ["${", "}"],
    el: "#TabsContent",
    data: {
        config: {},
        formValues: {},
        selectedGroups: {},
        modlist: [],
        modFiles: [],
        errorUploadFiles: [],
        isUploading: false,
        CHUNK_SIZE: 3 * 1024 * 1024,// 单位字节
        MAX_CONCURRENT_UPLOADS: 5,
        MAX_RETRY_COUNT: 3,
        MIN_PROGRESS: 5,// 进度条的最小显示进度为5，以保证能够正常显示文字
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
        isShowUploadArea() {
            if (this.modFiles.length === 0) {
                return true;
            } else if (!this.isUploading) {
                return true;
            }
            return false
        },
        isShowUploadBtn() {
            if (this.modFiles.length === 0) {
                return true;
            } else if (this.isUploading) {
                return true;
            }
            return false
        },
    },
    methods: {
        // 配置界面的函数
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

        // 配置界面的函数
        handleSelectedFiles(files) {
            const MAX_File_once = 5;
            if (files.length === 0) return;
            if (files.length + this.modFiles.length > MAX_File_once) {
                lightyear.notify(`一次最多可上传${MAX_File_once}个文件，请先上传完当前列表文件`, "danger", 3000, "", "top", "right");
            }
            let MAX_File_once_this = Math.min(MAX_File_once - this.modFiles.length, files.length)
            for (let i = 0; i < MAX_File_once_this; i++) {
                this.modFiles.push({
                    file: files[i],
                    fileName: files[i].name,
                    tag: "",
                });
            }
            $("#fileInput").val(""); // 同名文件可再次触发change事件
            this.updateFilePreview();
        },
        listenFileDrop() {
            const dropArea = $('#dropArea');
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
                this.handleSelectedFiles(files);
            });
        },
        updateFilePreview() {
            const filePreview = $('#filePreview');
            const emptyState = $('#emptyState');
            filePreview.empty();
            if (this.modFiles.length === 0) {
                filePreview.append(emptyState.clone().show());
                return;
            }
            // modFiles去重,避免上传相同文件
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
                                oninput="updateModTag('${fileItem.fileName}',this.value)">
                            </div>
                            <div class="file-actions">
                                <button class="btn btn-sm btn-danger" title="删除" onclick="removeUploadFile('${fileItem.fileName}')">
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
        removeUploadFile(filename) {
            $(`[data-filename="${filename}"]`).removeClass('fade-in');
            $(`[data-filename="${filename}"]`).addClass('removing');
            setTimeout(() => {
                this.modFiles = this.modFiles.filter(item => item.fileName !== filename);
                $(`[data-filename="${filename}"]`).remove();
                if (this.modFiles.length == 0) {
                    //所有文件上传成功完成
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
        getModList() {
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
            this.$confirm(`确认删除【${item.tag}】吗？`, '删除mod', {
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
        async uploadByChunk(fileItem) {
            $(`[data-filename="${fileItem.fileName}"]`).find('input').prop('disabled', true);
            $(`[data-filename="${fileItem.fileName}"]`).find('button[title="删除"]').prop('disabled', true);
            let retryBtn = $(`[data-filename="${fileItem.fileName}"]`).find('.btn-secondary');
            this.updateProgress(fileItem.fileName, 0, 'uploading');
            totalChunks = Math.ceil(fileItem.file.size / this.CHUNK_SIZE);
            try {
                uploadController = new UploadController(
                    "/api/v1/l4d2/mod",
                    fileItem,
                    this.getUsername(),
                    this.CHUNK_SIZE,
                    this.MAX_CONCURRENT_UPLOADS,
                    this.MAX_RETRY_COUNT
                );
                // 对单个文件的状态更新进行监听
                uploadController.onProgress((progress, chunkIndex) => {
                    this.updateProgress(fileItem.fileName, progress, 'uploading');
                });
                uploadController.onComplete(() => {
                    this.updateProgress(fileItem.fileName, 100, 'success');
                    this.getModList();
                    this.removeUploadFile(fileItem.fileName);
                    retryBtn.hide();
                });
                uploadController.onError((error) => {
                    console.error(fileItem.fileName, error)
                    this.updateProgress(fileItem.fileName, null, 'error');
                    lightyear.notify("上传失败：" + fileItem.fileName, "danger", 3000, "", "top", "right");
                    retryBtn.show();
                    this.errorUploadFiles.push(fileItem.fileName);
                    if(this.errorUploadFiles.length === this.modFiles.length){
                        // 全部上传完成，但是有失败文件
                        this.isUploading = false
                        $(`[data-filename="${fileItem.fileName}"]`).find('input').prop('disabled', false);
                        $(`[data-filename="${fileItem.fileName}"]`).find('button[title="删除"]').prop('disabled', false);
                    }
                });
                uploadController.onPostsuccess((r) => {
                    if (r.code == 4001 || r.code == 4002 || r.code == 4004) {
                        return true
                    }
                    return false
                })
                await uploadController.start();
            } catch (error) {
                console.error(fileItem.fileName, error)
                lightyear.notify("程序错误，上传失败：" + fileItem.fileName, "danger", 3000, "", "top", "right");
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
            this.errorUploadFiles = []
            user = this.getUsername()
            for (let file of files) {
                this.updateProgress(file.fileName, 0, 'uploading');
                this.uploadByChunk(file)
            }
        },
        updateProgress(filename, num, type) {
            num = Math.max(num, this.MIN_PROGRESS)
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
        this.initConfig();
        if (this.config) {
            this.initializeFormValues();
            this.getServerConfig();
        }
        this.getModList();
        this.listenFileDrop();
        window.updateModTag = this.updateModTag;
        window.removeUploadFile = this.removeUploadFile;
        window.uploadSingleMod = this.uploadSingleMod;
        $('#uploadModal').on('hidden.bs.modal', (e) => {
            if (this.modFiles.length > 0) {
                lightyear.notify("有文件在上传列表中，可再次点击上传按钮查看进度", "warning", 3000, "", "top", "right");
            }
        });
        $("[data-toggle='tooltip']").tooltip();
    }
});