angular
  .module('Dashboard')
  .controller('ProvisionerCtrl', [
    '$scope',
    'Session',
    function ($scope,
              Session) {

      $scope.name = 'Hello';
      console.log('$scope.name', $scope.name)
    }
  ]);