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

// Wanderlust uses go.rice package for serving static web content
//

package picnic

import (
	"github.com/SchumacherFM/wanderlust/github.com/gorilla/mux"
	"net/http"
)

func (p *PicnicApp) initRoutesUsers(router *mux.Router) error {
	user := router.PathPrefix("/users/").Subrouter()

	user.HandleFunc("/", p.handler(userCollectionHandler, AUTH_LEVEL_CHECK)).Methods("GET")
	//	user.HandleFunc("/", p.handler(userCreateHandler, AUTH_LEVEL_CHECK)).Methods("POST")
	//	user.HandleFunc("/{id:[0-9]+}", p.handler(userGetHandler, AUTH_LEVEL_CHECK)).Methods("GET")
	//	user.HandleFunc("/{id:[0-9]+}", p.handler(userUpdateHandler, AUTH_LEVEL_CHECK)).Methods("PUT")
	//	user.HandleFunc("/{id:[0-9]+}", p.handler(userDeleteHandler, AUTH_LEVEL_CHECK)).Methods("DELETE")

	return nil
}

func userCollectionHandler(rc requestContextI, w http.ResponseWriter, r *http.Request) error {
	users, err := GetAllUsers()
	if nil != err {
		return err
	}
	return renderFFJSON(w, users, http.StatusOK)
}