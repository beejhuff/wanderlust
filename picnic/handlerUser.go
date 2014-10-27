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
	"github.com/SchumacherFM/wanderlust/helpers"
	. "github.com/SchumacherFM/wanderlust/picnic/api"
	"net/http"
)

func (p *PicnicApp) initRoutesUsers(r *mux.Router) error {
	sr := r.PathPrefix("/users/").Subrouter()

	sr.HandleFunc("/", p.handler(userCollectionHandler, AUTH_LEVEL_LOGIN_WAIT)).Methods("GET")
	//	user.HandleFunc("/", p.handler(userCreateHandler, AUTH_LEVEL_LOGIN)).Methods("POST")
	//	user.HandleFunc("/{id:[0-9]+}", p.handler(userGetHandler, AUTH_LEVEL_LOGIN)).Methods("GET")
	//	user.HandleFunc("/{id:[0-9]+}", p.handler(userUpdateHandler, AUTH_LEVEL_LOGIN)).Methods("PUT")
	//	user.HandleFunc("/{id:[0-9]+}", p.handler(userDeleteHandler, AUTH_LEVEL_LOGIN)).Methods("DELETE")

	return nil
}

func userCollectionHandler(rc RequestContextIf, w http.ResponseWriter, r *http.Request) error {
	uc := NewUserModelCollection(backpacker)
	err := uc.FindAllUsers()
	if nil != err {
		return err
	}
	return helpers.RenderFFJSON(w, uc, http.StatusOK)
}
