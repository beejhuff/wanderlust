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
	"errors"
	"github.com/SchumacherFM/wanderlust/picnicApi"
	. "github.com/SchumacherFM/wanderlust/provisioners/api"
	"strings"
)

func GetProvisioner() *Provisioner {
	t := &ta{
		myRoute: "textarea",
		config:  []string{"TextArea"}, // used in the html input field names
	}
	p := NewProvisioner("Textarea", "fa-file-text-o", t)
	return p
}

type (
	ta struct {
		myRoute string
		config  []string
	}
)

var (
	ErrValidate    = errors.New("Failed to validate the value")
	ErrTooManyURLs = errors.New("Too many URLs detected! Maximum is 20.")
)

func (t *ta) Route() string {
	return t.myRoute
}

func (t *ta) FormHandler() picnicApi.HandlerFunc {
	return FormGenerate(t.Route(), t.config)
}

func (t *ta) IsValid(p *PostData) error {
	if "" == p.Value {
		return nil
	}

	valueSlice := strings.Split(strings.TrimSpace(p.Value), "\n")
	if len(valueSlice) > 20 {
		return ErrTooManyURLs
	}

	for _, v := range valueSlice {
		vl := strings.ToLower(v)

		if false == strings.HasPrefix(vl, "http") {
			return ErrValidate
		}
	}

	return nil
}

func valueModifier(pd *PostData) []byte {
	return []byte(strings.TrimSpace(pd.Value))
}

// https://restful-api-design.readthedocs.org/en/latest/methods.html#standard-methods
func (t *ta) SaveHandler() picnicApi.HandlerFunc {
	return FormSave(t, valueModifier)
}
