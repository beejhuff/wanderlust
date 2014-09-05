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

import (
	"errors"
	"testing"
)

type result struct {
	host string
	port string
	err  error
}

func getData() map[string]result {
	return map[string]result{
		":3109": result{
			"127.0.0.1",
			"3109",
			nil,
		},
		"246.245.145.235:3108": result{
			"246.245.145.235",
			"3108",
			nil,
		},
		"246.245.145.235": result{
			"246.245.145.235",
			"",
			errors.New("Missing : separator or too many"),
		},
	}
}

func TestValidateListenAddress(t *testing.T) {
	var host, port string
	var err error

	for input, res := range getData() {
		host, port, err = ValidateListenAddress(input)

		if nil == err && res.host != host {
			t.Errorf("Expected %s got %s", res.host, host)
		}
		if nil == err && res.port != port {
			t.Errorf("Expected %s got %s", res.port, port)
		}
		if err != nil && res.err.Error() != err.Error() {
			t.Errorf("Expected %s got %s", res.err, err)
		}
	}
}


/**
	05. Sept 2014; run with `go test -v -bench=.`
	BenchmarkValidateListenAddress	 1000000	      1594 ns/op
	go version go1.3.1 darwin/amd64
	Retina, 13-inch, Late 2013
	Processor  2.4 GHz Intel Core i5
	Software  OS X 10.9.4 (13E28)
 */
func BenchmarkValidateListenAddress(b *testing.B){
	for n := 0; n < b.N; n++ {
		for input, _ := range getData() {
			ValidateListenAddress(input)
		}
	}
}