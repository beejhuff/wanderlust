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

package helpers

import "os"

// returns the OS default temp dir with trailing slash
func GetTempDir() string {
	dir := os.TempDir()
	pathSep := string(os.PathSeparator)
	if pathSep != dir[len(dir)-1:] {
		dir = dir + pathSep
	}
	return dir
}

func PathExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func CreateDirectoryIfNotExists(path string) {
	isDir, _ := PathExists(path)
	if false == isDir {
		err := os.Mkdir(path, 0700)
		if nil != err {
			panic("Cannot create directory: " + path)
		}
	}
}
