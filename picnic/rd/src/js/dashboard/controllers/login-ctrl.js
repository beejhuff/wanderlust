angular
    .module('Dashboard')
    .controller('LoginCtrl', [
        '$scope',
        '$location',
        '$window',
        '$http',
        'Session',
        'AuthResource',
        'Alert',
        'TrackUser',
        'AUTH_TOKEN_HEADER',
        function ($scope,
                  $location,
                  $window,
                  $http,
                  Session,
                  AuthResource,
                  Alert,
                  TrackUser,
                  AUTH_TOKEN_HEADER) {

            $scope.formData = new AuthResource();

            $scope.login = function () {
                $scope.formData.$save(function saveLoginPost(result, headers) {
                    $scope.formData = new AuthResource();
                    console.log(result,headers, headers(AUTH_TOKEN_HEADER));
                    if (result.loggedIn) {
                        Session.login(result, headers(AUTH_TOKEN_HEADER));
                        Alert.success("Welcome back, " + result.name);
                        var path = Session.getLastLoginUrl();

                        TrackUser.setUser(result.userName)
                        //if (path) {
                        //  $location.path(path);
                        //} else {
                        //  $window.history.back();
                        //}
                    }
                });
            };
        }
    ]);