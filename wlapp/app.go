// Copyright (C) Cyrill@Schumacher.fm @SchumacherFM Twitter/GitHub
// Wanderlust - a cache warmer for your web app with priorities
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

package wlapp

import (
	"github.com/SchumacherFM/wanderlust/github.com/codegangsta/cli"
	log "github.com/SchumacherFM/wanderlust/github.com/segmentio/go-log"
	"github.com/SchumacherFM/wanderlust/picnic"
	"github.com/SchumacherFM/wanderlust/rucksack"
	rdb "github.com/SchumacherFM/wanderlust/rucksack/api"
	"os"
	"os/signal"
	"runtime"
	"sync"
	"syscall"
)

var (
	CliContext *cli.Context
	waitGroup  sync.WaitGroup
	logger     *log.Logger
	db         rdb.RDBIF
)

func Boot() {
	initLogger()
	BootRucksack()
	BootPicnic() // depends on the rucksack
	BootBrotzeit()
	BootWanderer()
	Finalizer()
}

func initLogger() {
	logFile := CliContext.String("logFile")
	logLevel := CliContext.String("logLevel")
	if "" != logFile {
		logFilePointer, err := os.OpenFile(logFile, os.O_WRONLY|os.O_CREATE, 0600)
		if err != nil {
			panic(err)
		}
		logger = log.New(logFilePointer, log.DEBUG, "[WL] ")
	} else {
		logger = log.New(os.Stderr, log.DEBUG, "[WL] ")
	}
	if "" == logLevel {
		logLevel = "debug"
	}
	if lerr := logger.SetLevelString(logLevel); nil != lerr {
		panic(lerr)
	}
}

// BootRucksack inits the rucksack database and starts the background jobs
func BootRucksack() {

	rucksackApp, err := rucksack.NewRucksackApp(
		CliContext.String("rucksack-dir"),
		logger,
	)
	logger.Check(err)

	db = rucksackApp.GetDb()
	waitGroup.Add(1)
	// here should be added more services
	go func() {
		defer waitGroup.Done()
		db.Writer()
	}()
	logger.Notice("DB Background Services started")

}

// starts the HTTP server for the picnic web interface and runs it in a goroutine
func BootPicnic() {

	picnicApp, err := picnic.NewPicnicApp(
		CliContext.String("picnic-listen-address"),
		CliContext.String("picnic-pem-dir"),
		logger,
		db,
	)

	if nil != err {
		logger.Check(err)
	}

	if "" != picnicApp.GetListenAddress() { // don't start if empty
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			logger.Check(picnicApp.Execute())
		}()
		logger.Notice("Picnic Running https://%s", picnicApp.GetListenAddress())
	}
}

func BootBrotzeit() {
	//	if "" != rucksackApp.ListenAddress {
	//		waitGroup.Add(1)
	//		go func() {
	//			defer waitGroup.Done()
	//			rucksackApp.StartHttp()
	//		}()
	//	}
	logger.Notice("Booting Brotzeit ... @todo")
}

func BootWanderer() {
	logger.Notice("Booting Wanderer ... @todo")
}

// final method to wait on all the goroutines which are running mostly the HTTP server or other daemons
func Finalizer() {
	logger.Notice("GOMAXPROCS is set to %d", runtime.NumCPU())
	catchSysCall()
	waitGroup.Wait()
}

// catchSysCall ends the program correctly when receiving a sys call
// @todo add things like remove PEM dir, DB dir when no CLI value has been provided
func catchSysCall() {
	signalChannel := make(chan os.Signal, 1)
	signal.Notify(
		signalChannel,
		syscall.SIGHUP,
		syscall.SIGINT,
		syscall.SIGTERM,
		syscall.SIGQUIT,
	)
	go func() {
		for sig := range signalChannel {
			logger.Notice("Received signal: %s. Closing database ...", sig.String())
			if err := db.Close(); nil != err {
				logger.Check(err)
			} else {
				logger.Notice("Database successful closed!")
			}
			os.Exit(0)
		}
	}()
}
