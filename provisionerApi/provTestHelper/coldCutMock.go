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

package provTestHelper

import (
	log "github.com/SchumacherFM/wanderlust/Godeps/_workspace/src/github.com/segmentio/go-log"
	"github.com/SchumacherFM/wanderlust/provisionerApi"
	"github.com/SchumacherFM/wanderlust/rucksack"
)

type (
	ColdCutMock struct {
		RouteMockFnc  func() string
		ConfigMockFnc func() []string
		FetchUrlsFnc  func()
	}
)

// check if struct implements interface
var _ provisionerApi.ColdCutter = &ColdCutMock{}

func (c *ColdCutMock) Route() string                                           { return c.RouteMockFnc() }
func (c *ColdCutMock) Config() []string                                        { return c.ConfigMockFnc() }
func (c *ColdCutMock) PrepareSave(pd *provisionerApi.PostData) ([]byte, error) { return nil, nil }
func (c *ColdCutMock) ConfigComplete(bp rucksack.Backpacker) (bool, error)     { return false, nil }
func (c *ColdCutMock) FetchURLs(bp rucksack.Backpacker, l *log.Logger) func()  { return c.FetchUrlsFnc }
