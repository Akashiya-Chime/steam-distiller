package sql

import (
	"crypto/md5"
	"encoding/hex"
	"errors"
	"steam-distiller/env"
	log "steam-distiller/logger"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type DbError uint

const (
	DB_OK DbError = iota
	DB_ERROR
	DB_NOT_FOUND
	DB_DATA_ALREADY_EXIST
	DB_CREATE_FAILED
	DB_DELETE_FAILED
	DB_UPDATE_FAILED
)

var g_gormDB *gorm.DB

type User struct {
	gorm.Model
	Username string
	Password string
	IsAdmin  bool
}

func Connect() {
	db, err := gorm.Open(sqlite.Open("db/app.db"), &gorm.Config{})
	if err != nil {
		log.L.Panicf("Failed to connect database, %v.", err)
	}
	log.L.Infoln("Connect database successfully.")

	db.AutoMigrate(&User{})
	g_gormDB = db
}

func Close() {
	sqlDB, err := g_gormDB.DB()
	if err != nil {
		log.L.Panicf("Failed to get sqlDB, %v.", err)
	}
	sqlDB.Close()
}

func IsUserExists(username string) bool {
	var count int64
	g_gormDB.Model(&User{}).Where("username = ?", username).Count(&count)
	return count > 0
}

func GetUser(user User) (*User, DbError) {
	var dbUser User
	res := g_gormDB.Where("username = ?", user.Username).First(&dbUser)
	if res.Error != nil {
		if errors.Is(res.Error, gorm.ErrRecordNotFound) {
			log.L.Infoln("Record not found.")
			return nil, DB_NOT_FOUND
		} else {
			log.L.Warnf("Search record error, %v.", res.Error)
			return nil, DB_ERROR
		}
	}
	return &dbUser, DB_OK
}

func CreateUser(user User) DbError {
	if IsUserExists(user.Username) {
		return DB_DATA_ALREADY_EXIST
	}

	res := g_gormDB.Create(&user)
	if res.Error != nil {
		log.L.Warnf("Create user failed, %v.", res.Error)
		return DB_CREATE_FAILED
	}

	return DB_OK
}

func DeleteUser(user User) DbError {
	res := g_gormDB.Where("username = ?", user.Username).Delete(&user)
	if res.Error != nil {
		log.L.Warnf("Delete user failed, %v.", res.Error)
		return DB_DELETE_FAILED
	}

	return DB_OK
}

func UpdateUserPassWord(user User) DbError {
	if !IsUserExists(user.Username) {
		return DB_NOT_FOUND
	}

	res := g_gormDB.Model(&User{}).
		Where("username = ?", user.Username).
		Update("password", user.Password)
	if res.Error != nil {
		log.L.Warnf("Update user failed, %v.", res.Error)
		return DB_UPDATE_FAILED
	}

	return DB_OK
}

func SetAdmin() DbError {
	adminConfig := env.GetAdminConfig()
	hash := md5.Sum([]byte(adminConfig.Password))
	md5Password := hex.EncodeToString(hash[:])

	res := g_gormDB.Model(&User{}).
		Where("is_admin = ?", true).
		Updates(map[string]any{
			"username": adminConfig.Username,
			"password": md5Password,
		})
	if res.Error != nil {
		log.L.Warnf("Search admin record error, %v.", res.Error)
		return DB_ERROR
	}

	if res.RowsAffected == 0 {
		log.L.Infoln("No admin, create one.")
		return CreateUser(User{
			Username: adminConfig.Username,
			Password: md5Password,
			IsAdmin:  true,
		})
	}

	log.L.Info("Update admin setting successfully.")
	return DB_OK
}
