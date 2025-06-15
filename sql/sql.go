package sql

import (
	"errors"
	"fmt"

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
		fmt.Println(err)
		panic("Failed to connect database.")
	}

	db.AutoMigrate(&User{})
	g_gormDB = db
}

func Close() {
	sqlDB, err := g_gormDB.DB()
	if err != nil {
		fmt.Println(err)
		panic("Failed to get sqlDB.")
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
			fmt.Println("Record not found.")
			return nil, DB_NOT_FOUND
		} else {
			fmt.Println("Search record error:", res.Error)
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
		fmt.Println("Create user failed:", res.Error)
		return DB_CREATE_FAILED
	}

	return DB_OK
}

func DeleteUser(user User) DbError {
	res := g_gormDB.Where("username = ?", user.Username).Delete(&user)
	if res.Error != nil {
		fmt.Println("Delete user failed:", res.Error)
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
		fmt.Println("Update user failed:", res.Error)
		return DB_UPDATE_FAILED
	}

	return DB_OK
}
