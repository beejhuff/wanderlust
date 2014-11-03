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

package textarea

import (
	"github.com/SchumacherFM/wanderlust/helpers"
	picnicApi "github.com/SchumacherFM/wanderlust/picnic/api"
	. "github.com/SchumacherFM/wanderlust/provisioners/api"
	"net/http"
)

func GetProvisioner() *Provisioner {
	t := &ta{
		myRoute: "textarea",
		Data:    &storage{},
	}
	p := NewProvisioner("Textarea", "fa-file-text-o", t)
	return p
}

type (
	ta struct {
		myRoute string
		Data    *storage `json:"data"`
	}
	storage struct {
		TextAreaData string
	}
)

func (t *ta) Route() string {
	return t.myRoute
}

func (t *ta) FormHandler() picnicApi.HandlerFunc {
	rs := helpers.RandomString(10)
	t.Data.TextAreaData = `http://wwww.` + rs + `.com/page1.html
http://wwww.demosite.com/page2.html
http://wwww.demosite.com/page3.html`

	return func(rc picnicApi.RequestContextIf, w http.ResponseWriter, r *http.Request) error {
		return helpers.RenderJSON(w, t, 200)
	}
}

// https://restful-api-design.readthedocs.org/en/latest/methods.html#standard-methods
func (t *ta) SaveHandler() picnicApi.HandlerFunc {
	return func(rc picnicApi.RequestContextIf, w http.ResponseWriter, r *http.Request) error {
		status := http.StatusOK
		return helpers.RenderString(w, status, "")
	}
}

func (t *ta) DeleteHandler() picnicApi.HandlerFunc {
	return func(rc picnicApi.RequestContextIf, w http.ResponseWriter, r *http.Request) error {
		return helpers.RenderString(w, 200, "[\"Deleted Data\"]")
	}
}
