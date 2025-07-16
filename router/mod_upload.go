package router

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"steam-distiller/env"
	log "steam-distiller/logger"
	"steam-distiller/mod"
	"strconv"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

var (
	ErrInvalidFileType     = errors.New("invalid file type")
	ErrInvalidTag          = errors.New("invalid tag")
	ErrInvalidChunk        = errors.New("invalid chunk")
	ErrChunkUploaded       = errors.New("chunk has been uploaded")
	ErrSaveChunkFailed     = errors.New("save chunk failed")
	ErrMkdirFailed         = errors.New("create temp directory failed")
	ErrCreateModFileFailed = errors.New("create mod file failed")
	ErrReadChunkFailed     = errors.New("read chunk failed")
	ErrWriteChunkFailed    = errors.New("write chunk failed")
	ErrRemoveChunkFailed   = errors.New("remove chunk failed")
	ErrDelTempDirFailed    = errors.New("delete temp directory failed")
)

var (
	g_TempDir        = "./upload/temp"
	g_ChunkStatus    = make(map[string]map[int]bool) // tag -> chunkIndex -> bool
	g_ChunkMutex     sync.RWMutex
	g_CleanCounter   = 0
	g_ChunkCleanSize = 1000
)

type RequestInfo struct {
	Data        multipart.File
	Filename    string
	Tag         string
	User        string
	ChunkIndex  int
	TotalChunks int
}

func l4d2UploadModByChunk(c *gin.Context) {
	req, err := getRequestInfo(c)
	if err != nil {
		log.L.Warnf("Invalid param, %v.", err)
		c.Abort()
		return
	}

	if mod.IsModExists(req.Tag) {
		SendJsonMsg(c, CODE_FILE_EXISTS, "mod文件已存在", nil)
		c.Abort()
		return
	}

	// 单文件
	if req.ChunkIndex == 0 && req.TotalChunks == 1 {
		if err := singleFileUpload(req); err != nil {
			SendJsonMsg(c, CODE_INNER_ERROR, "保存文件失败", nil)
			c.Abort()
			return
		}
		log.L.Infof("Upload mod file tag[%s] name[%s] successfully.", req.Tag, req.Filename)
		SendJsonMsg(c, CODE_FILE_UPLOAD_OK, "文件上传完成", nil)
		return
	}

	// 分片
	if err := chunkFileUpload(req); err != nil {
		if errors.Is(err, ErrChunkUploaded) {
			SendJsonMsg(c, CODE_CHUNK_EXISTS, "分片已存在", nil)
			c.Abort()
			return
		}
		log.L.Warnf("Save chunk failed, tag:[%s] index:[%d].", req.Tag, req.ChunkIndex)
		SendJsonMsg(c, CODE_INNER_ERROR, "保存分片失败", nil)
		c.Abort()
		return
	}

	markChunkUploaded(req.Tag, req.ChunkIndex)

	completed := getCompletedChunks(req.Tag, req.TotalChunks)
	fmt.Println(completed)
	if len(completed) == req.TotalChunks {
		if err := mergeChunks(req.Tag, req.Filename); err != nil {
			log.L.Warnf("Merge chunks failed, %v.", err)
			SendJsonMsg(c, CODE_INNER_ERROR, "合并分片失败", nil)
			c.Abort()
			return
		}

		if err := mod.WriteMod(req.Tag, req.Filename, req.User); err != nil {
			log.L.Warnf("Write mod failed, %v.", err)
			SendJsonMsg(c, CODE_INNER_ERROR, "保存文件失败", nil)
			c.Abort()
			return
		}

		log.L.Infof("Upload mod file tag[%s] name[%s] successfully.", req.Tag, req.Filename)
		SendJsonMsg(c, CODE_FILE_UPLOAD_OK, "文件上传完成", nil)
		return
	}

	SendJsonMsg(c, CODE_CHUNK_UPLOAD_OK, "分片上传完成", nil)
}

func getRequestInfo(c *gin.Context) (*RequestInfo, error) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		SendJsonMsg(c, CODE_PARAM_ERROR, "获取文件失败", nil)
		return nil, err
	}

	tag := c.PostForm("tag")
	user := c.PostForm("user")
	chunkIndex := c.PostForm("chunkIndex")
	totalChunks := c.PostForm("totalChunks")
	filename := c.PostForm("filename")
	if (tag == "") || (user == "") || (chunkIndex == "") || (totalChunks == "") ||
		strings.Contains(tag, "..") || strings.HasPrefix(tag, "/") ||
		(filepath.Ext(filename) != ".vpk") {
		SendJsonMsg(c, CODE_PARAM_ERROR, "无效参数", nil)
		return nil, err
	}

	idx, err := strconv.Atoi(chunkIndex)
	if (err != nil) || (idx < 0) {
		SendJsonMsg(c, CODE_PARAM_ERROR, "无效参数", nil)
		return nil, err
	}

	total, err := strconv.Atoi(totalChunks)
	if (err != nil) || (total <= 0) {
		SendJsonMsg(c, CODE_PARAM_ERROR, "无效参数", nil)
		return nil, err
	}

	return &RequestInfo{
		Data:        file,
		Filename:    filename,
		Tag:         tag,
		User:        user,
		ChunkIndex:  idx,
		TotalChunks: total,
	}, nil
}

func mergeChunks(tag string, filename string) error {
	chunkDir := filepath.Join(g_TempDir, tag)
	modPath := filepath.Join(env.L4D2ModPath, filename)

	modFile, err := os.Create(modPath)
	if err != nil {
		return ErrCreateModFileFailed
	}
	defer modFile.Close()

	for i := 0; ; i++ {
		chunkPath := filepath.Join(chunkDir, fmt.Sprintf("%s_%d.tmp", filename, i))
		chunkFile, err := os.Open(chunkPath)
		if os.IsNotExist(err) {
			break
		}
		if err != nil {
			return ErrReadChunkFailed
		}

		if _, err := io.Copy(modFile, chunkFile); err != nil {
			return ErrWriteChunkFailed
		}
		chunkFile.Close()

		if err := os.Remove(chunkPath); err != nil {
			return ErrRemoveChunkFailed
		}
	}

	if err := os.RemoveAll(chunkDir); err != nil {
		return ErrDelTempDirFailed
	}

	g_ChunkMutex.Lock()
	delete(g_ChunkStatus, tag)
	g_ChunkMutex.Unlock()

	return nil
}

func getCompletedChunks(tag string, totalChunks int) []int {
	g_ChunkMutex.RLock()
	defer g_ChunkMutex.RUnlock()

	if g_ChunkStatus[tag] == nil {
		return []int{}
	}

	completed := make([]int, 0)
	for i := range totalChunks {
		if uploaded, exists := g_ChunkStatus[tag][i]; exists && uploaded {
			completed = append(completed, i)
		}
	}

	return completed
}

func markChunkUploaded(tag string, chunkIndex int) {
	g_ChunkMutex.Lock()
	defer g_ChunkMutex.Unlock()

	if g_ChunkStatus[tag] == nil {
		g_ChunkStatus[tag] = make(map[int]bool)
	}

	g_ChunkStatus[tag][chunkIndex] = true
	g_CleanCounter++

	// 清理内存
	if g_CleanCounter > g_ChunkCleanSize {
		cleanChunkStatus()
		g_CleanCounter = 0
	}
}

func cleanChunkStatus() {
	for tag := range g_ChunkStatus {
		chunkDir := filepath.Join(g_TempDir, tag)
		if _, err := os.Stat(chunkDir); os.IsNotExist(err) {
			delete(g_ChunkStatus, tag)
		}
	}
}

func singleFileUpload(req *RequestInfo) error {
	path := filepath.Join(env.L4D2ModPath, req.Filename)
	file, err := os.Create(path)
	if err != nil {
		log.L.Warnf("Create mod file failed, %v.", err)
		return err
	}
	defer file.Close()

	if _, err := io.Copy(file, req.Data); err != nil {
		log.L.Warnf("Save mod failed, %v.", err)
		return err
	}

	return mod.WriteMod(req.Tag, req.Filename, req.User)
}

func chunkFileUpload(req *RequestInfo) error {
	if isChunkUploaded(req.Tag, req.ChunkIndex) {
		return ErrChunkUploaded
	}

	if err := saveChunk(req.Tag, req.ChunkIndex, req.Filename, req.Data); err != nil {
		return ErrSaveChunkFailed
	}

	return nil
}

func saveChunk(tag string, chunkIndex int, filename string, data multipart.File) error {
	chunkDir := filepath.Join(g_TempDir, tag)
	if err := os.MkdirAll(chunkDir, 0755); err != nil {
		return ErrMkdirFailed
	}

	chunkPath := filepath.Join(chunkDir, fmt.Sprintf("%s_%d.tmp", filename, chunkIndex))
	chunkFile, err := os.Create(chunkPath)
	if err != nil {
		log.L.Warnf("Create chunk file failed, %v.", err)
		return err
	}
	defer chunkFile.Close()

	if _, err := io.Copy(chunkFile, data); err != nil {
		log.L.Warnf("Save chunk failed, %v.", err)
		return err
	}

	return nil
}

func isChunkUploaded(tag string, chunkIndex int) bool {
	g_ChunkMutex.RLock()
	defer g_ChunkMutex.RUnlock()

	if g_ChunkStatus[tag] == nil {
		return false
	}

	return g_ChunkStatus[tag][chunkIndex]
}

func l4d2UploadModStatus(c *gin.Context) {
	tag := c.Query("tag")
	totalChunks, _ := strconv.Atoi(c.Query("totalChunks"))

	if (tag == "") || totalChunks <= 0 {
		SendJsonMsg(c, CODE_PARAM_ERROR, "无效参数", nil)
		c.Abort()
		return
	}

	g_ChunkMutex.Lock()
	defer g_ChunkMutex.Unlock()

	if g_ChunkStatus[tag] == nil {
		SendJsonMsg(c, CODE_OK, "ok", gin.H{"completed": []int{}})
		c.Abort()
		return
	}

	completed := make([]int, 0)
	for i := range totalChunks {
		if g_ChunkStatus[tag][i] {
			completed = append(completed, i)
		}
	}

	SendJsonMsg(c, CODE_OK, "ok", gin.H{"completed": completed})
}
