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

package picnic

import ()

// Basic user session info
type SessionInfo struct {
	UserName string `json:"username"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	IsAdmin  bool   `json:"isAdmin"`
	LoggedIn bool   `json:"loggedIn"`
}

// newSessionInfo() is used in handlers login, logout, getSessionInfo and signup
func newSessionInfo(user userIf) *SessionInfo {
	if nil == user || false == user.isValidForSession() {
		return &SessionInfo{}
	}

	return &SessionInfo{
		UserName: user.getUserName(),
		Name:     user.getName(),
		Email:    user.getEmail(),
		IsAdmin:  user.isAdmin(),
		LoggedIn: true,
	}
}
