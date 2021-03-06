(function(){ 
'use strict';
angular
  .module('Wanderlust', [
    'ui.bootstrap',
    'ui.router',
    'LocalStorageModule',
    'ngResource',
    'ui.gravatar',
    'angular-growl',
    'picnic.services',
    'angulartics',
    'angulartics.piwik',
    'ncy-angular-breadcrumb'
  ])
  .constant('picnicUrls', {
    auth: '/auth/',
    users: '/users/',
    sysinfo: '/sysinfo/',
    provisioners: '/provisioners/',
    brotzeit: '/brotzeit/',
    messages: '/api/messages'
  })
  .constant('AUTH_TOKEN_HEADER', 'X-Auth-Token')
  .constant('AUTH_TOKEN_STORAGE_KEY', 'WL_authToken')
  .config([
    '$resourceProvider',
    'gravatarServiceProvider',
    'growlProvider',
    function ($resourceProvider, gravatarServiceProvider, growlProvider) {
      // Don't strip trailing slashes from calculated URLs
      $resourceProvider.defaults.stripTrailingSlashes = false;
      gravatarServiceProvider.defaults = {
        size: 40,
        "default": 'monsterid'
      };

      // Use https endpoint
      gravatarServiceProvider.secure = true;

      growlProvider.globalTimeToLive({success: 1000, error: 3500, warning: 3000, info: 4000});

    }]);

if (!Array.isArray) {
  Array.isArray = function (arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
  };
}

/**
 * ErrorInterceptor will be applied in the routes.js file
 */
angular
  .module('Wanderlust')
  .factory('AuthInterceptor', function (localStorageService, TrackUser, AUTH_TOKEN_HEADER, AUTH_TOKEN_STORAGE_KEY) {
    // adds for every request the token
    return {
      request: function (config) {
        config.headers = config.headers || {};
        var token = localStorageService.get(AUTH_TOKEN_STORAGE_KEY);
        if (token && token.length > 20) {
          TrackUser.setToken(token);
          config.headers[AUTH_TOKEN_HEADER] = token;
        }
        return config;
      }
    };

  })
  .factory('ErrorInterceptor', function ($q, /*$location, */ Session, growl) {
    return {

      response: function (response) {
        return response;
      },

      responseError: function (response) {
        var rejection = $q.reject(response),
            status = parseInt(response.status, 10),
            msg = 'Sorry, an error has occurred';

        if (401 === status) {
          Session.redirectToLogin();
          return;
        }
        if (404 === status) {
          // handle locally
          return;
        }
        if (412 === status) { // 412 pre condition failed: Waiting for login ...
          return rejection;
        }
        if (403 === status) {
          msg = "Sorry, you're not allowed to do this";
        }
        if (400 === status && response.data.errors) {
          msg = "Sorry, your form contains errors, please try again";
        }

        if (response.data && typeof response.data === 'string') {
          msg = response.data;
        }
        console.log('msg', msg);
        if (msg.length > 0) {
          growl.error(msg);
        }
        return rejection;
      }
    };
  });

/**
 * Route configuration for the Dashboard module.
 */
angular.module('Wanderlust')
  .config([
    '$stateProvider',
    '$urlRouterProvider',
    '$httpProvider',
    'picnicUrls',
    function ($stateProvider, $urlRouterProvider, $httpProvider, picnicUrls) {

      // For unmatched routes
      $urlRouterProvider.otherwise('/');

      // Application routes
      $stateProvider
        .state('index', {
          url: '/',
          templateUrl: 'partials/dashboard/tpl/dashboard.html',
          data: {
            ncyBreadcrumbLabel: 'Dashboard'
          }
        })
        .state('login', {
          url: '/login',
          templateUrl: 'partials/login/tpl/login.html',
          controller: 'LoginController',
          data: {
            ncyBreadcrumbLabel: 'Login'
          }
        })
        .state('brotzeit', {
          url: '/brotzeit',
          templateUrl: 'partials/brotzeit/tpl/bz.html',
          controller: 'BrotzeitController',
          data: {
            ncyBreadcrumbLabel: 'Brotzeit - The URL Cache'
          }
        })
        .state('shop', {
          url: '/shop',
          templateUrl: 'partials/marketplace/tpl/mp.html',
          controller: 'MarketplaceController',
          data: {
            ncyBreadcrumbLabel: 'Shop - Your in-app purchase made easy!'
          }
        })
        .state('privacy', {
          url: '/privacy',
          templateUrl: 'partials/core/tpl/privacy.html',
          data: {
            ncyBreadcrumbLabel: 'Privacy Statement'
          }
        })
        .state('provisioners', {
          url: picnicUrls.provisioners + '{type:[a-z0-9]{3,20}}',
          controller: 'ProvisionerController',
          templateUrl: function (matchedParts) {
            return 'partials' + picnicUrls.provisioners + 'tpl/' + (matchedParts.type || '') + '.html';
          },
          data: {
            ncyBreadcrumbLabel: 'Provisioner / {{typeName}}'
          }
        });

      $httpProvider.interceptors.push('AuthInterceptor');
      $httpProvider.interceptors.push('ErrorInterceptor');

    }]);

/* Services */
angular.module('picnic.services', [])
  .service('TrackUser', ['$window', 'md5',
    function ($window, md5) {

      function setVar(index, theVar, user) {
        $window._paq.push(['setCustomVariable', // piwik specific
          index, // Index, the number from 1 to 5 where this custom variable name is stored
          theVar,
          md5(user),
          "visit" // scope
        ]);
      }

      return {
        "setUser": function (user) {
          setVar(1, "username", user);
        },
        "setToken": function (token) {
          setVar(2, "token", token);
        }
      };
    }])
  .service('Session', ['$location', 'localStorageService', '$q', 'AUTH_TOKEN_STORAGE_KEY', 'growl', 'TrackUser',
    function ($location, localStorageService, $q, AUTH_TOKEN_STORAGE_KEY, growl, TrackUser) {
      var noRedirectUrls = {
        "/login": true,
        "/changepass": true,
        "/recoverpass": true
      };

      function isNoRedirectFromLogin(url) {
        return noRedirectUrls[url] || false;
      }

      function Session() {
        this.clear();
        this.lastLoginUrl = null;
      }

      Session.prototype.init = function (authResource) {
        this.authResource = authResource;
        this.sync();
      };

      Session.prototype.sync = function () {
        var $this = this,
            d = $q.defer();
        $this.authResource.get({}, function (result) {
          $this.login(result);
          d.resolve(result);
        });
        return d.promise;
      };

      Session.prototype.redirectToLogin = function () {
        this.clear();
        this.setLastLoginUrl();
        growl.warning("You must be logged in");
        $location.path("/login");
      };

      Session.prototype.check = function () {
        var $this = this;
        $this.sync().then(function () {
          if (!$this.loggedIn) {
            $this.redirectToLogin();
          }
        });
      };

      Session.prototype.setLastLoginUrl = function () {
        this.lastLoginUrl = $location.path();
      };

      Session.prototype.getLastLoginUrl = function () {
        var url = this.lastLoginUrl;
        if (true === isNoRedirectFromLogin(url)) {
          url = null;
        }
        this.lastLoginUrl = null;
        return url;
      };

      Session.prototype.clear = function () {
        this.loggedIn = false;
        this.name = null;
        this.userName = null;
        this.email = null;
        this.isAdmin = false;
      };

      Session.prototype.set = function (session) {
        TrackUser.setUser(session.userName)
        this.loggedIn = session.loggedIn;
        this.name = session.name;
        this.userName = session.userName;
        this.email = session.email;
        this.isAdmin = session.isAdmin;
      };

      Session.prototype.isLoggedIn = function () {
        return this.loggedIn === true;
      };

      Session.prototype.login = function (result, token) {
        this.set(result);
        this.$delete = result.$delete;
        if (token) {
          TrackUser.setToken(token);
          localStorageService.set(AUTH_TOKEN_STORAGE_KEY, token);
        }
      };

      Session.prototype.logout = function () {
        var $this = this,
            d = $q.defer();
        $this.$delete(function (result) {
          $this.clear();
          d.resolve(result);
          localStorageService.remove(AUTH_TOKEN_STORAGE_KEY);
        });
        return d.promise;
      };

      return new Session();

    }
  ])
  .service('AuthResource', [
    '$resource',
    'picnicUrls',
    function ($resource, picnicUrls) {
      return $resource(picnicUrls.auth, {}, {
        'recoverPassword': {
          method: 'PUT',
          url: picnicUrls.auth + 'recoverpass'
        },
        'changePassword': {
          method: 'PUT',
          url: picnicUrls.auth + 'changepass'
        }
      });
    }
  ]);
angular
  .module('Wanderlust')
  .directive('rdCheck', function () {
    return {
      restrict: 'AE',
      scope: {
        checked: '@'
      },
      template: '<i class="fa fa-check" data-ng-show="checked"></i><i class="fa fa-times" data-ng-hide="checked"></i>'
    };
  }
);

/**
 * Loading Directive
 * @see http://tobiasahlin.com/spinkit/
 */
angular
  .module('Wanderlust')
  .directive('rdLoading', function () {
    return {
      restrict: 'AE',
      template: '<div class="loading"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>'
    };
  });

angular
  .module('Wanderlust')
  .directive('rdWidget', function () {
    return {
      transclude: true,
      template: '<div class="widget" ng-transclude></div>',
      restrict: 'EA'
    };
  });

angular
  .module('Wanderlust')
  .directive('rdWidgetHeader', function () {
    return {
      requires: '^rdWidget',
      scope: {
        title: '@',
        icon: '@'
      },
      transclude: true,
      template: '<div class="widget-header"> <i class="fa" ng-class="icon"></i> {{title}} <div class="pull-right" ng-transclude></div></div>',
      restrict: 'E'
    };
  });

angular
  .module('Wanderlust')
  .directive('rdWidgetBody', function () {
    return {
      restrict: 'E',
      requires: '^rdWidget',
      scope: {
        loading: '=',
        bodyclass: '@'
      },
      transclude: true,
      template: '<div class="widget-body" data-ng-class="bodyclass">' +
      '<rd-loading data-ng-show="loading"></rd-loading>' +
      '<div data-ng-hide="loading" class="widget-content" data-ng-transclude></div></div>'
    };
  });

/**
 * Master Controller
 */
angular
  .module('Wanderlust')
  .controller('MasterCtrl', [
    '$scope',
    '$state',
    'localStorageService',
    'Session',
    'AuthResource',
    function ($scope, $state, localStorageService, Session, AuthResource) {
      'use strict';
      var LS_TOGGLE_KEY = 'wlToggle';

      //<Sessions>
      Session.init(AuthResource);
      $scope.session = Session;

      $scope.logout = function () {
        Session.logout().then(function () {
          $state.go('index');
        });
      };

      $scope.login = function () {
        Session.setLastLoginUrl();
        $state.go('login');
      };
      //</Sessions>

      /**
       * Sidebar Toggle & localStorageService Control
       */
      $scope.toggle = localStorageService.get(LS_TOGGLE_KEY) !== 'false';
      var mobileView = 992;
      $scope.getWidth = function () {
        return window.innerWidth;
      };
      $scope.$watch($scope.getWidth, function (newValue) {
        $scope.toggle = false;
        if (newValue >= mobileView) {
          $scope.toggle = true;
          if (localStorageService.get(LS_TOGGLE_KEY)) {
            $scope.toggle = localStorageService.get(LS_TOGGLE_KEY) !== 'false';
          }
        }
      });
      $scope.toggleSidebar = function () {
        $scope.toggle = !$scope.toggle;
        localStorageService.set(LS_TOGGLE_KEY, $scope.toggle);
      };
      window.onresize = function () {
        $scope.$apply();
      };
    }
  ])
  .controller('NavigationController', [
    '$scope',
    'ProvisionerResource',
    function ($scope, ProvisionerResource) {
      'use strict';

      function loadProv() {
        ProvisionerResource.get({prov: ''}, function (result) {
          $scope.provisioners = [];
          $scope.provisioners = result.Collection || [];
        }, function (result) {
          $scope.provisioners = [];
          $scope.provisioners.push({
            Name: result.data,
            Url: "/",
            Icon: "fa-exclamation-circle"
          });
        });
      }

      $scope.$watch(
        function () {
          return $scope.session.isLoggedIn(); // from parent scope
        },
        function (newValue, oldValue) {
          if (true === newValue || (false === newValue && true === oldValue)) {
            loadProv();
          }
        }
      );
      $scope.initProvNav = loadProv;
    }
  ]);

angular
  .module('Wanderlust')
  .directive('rdNavLi', function () {
    return {
      restrict: 'E',
      template: '<li data-ng-model="p.Name" class="sidebar-list">' +
        '<a href="#{{p.Url}}" data-analytics-on="click" data-analytics-category="navigation">{{p.Name}}' +
        '<rd-nav-icon icon="{{p.Icon}}"></rd-nav-icon></a></li>',
      scope: {
        p: '='
      }
    };
  })
  .directive('rdNavIcon', function () {
    return {
      restrict: 'E',
      scope: {
        icon: '@'
      },
      link: function (scope, element) {
        'use strict';
        var tpl = '';
        if (-1 === scope.icon.indexOf('fa-')) { // img
          tpl = '<span class="menu-icon"><img src="' + scope.icon + '" height="30"/></span>';
        } else { // fa-icon
          tpl = '<span class="menu-icon fa ' + scope.icon + '"></span>';
        }
        element.html(tpl);
      }
    };
  });

/**
 * Dashboard Controller
 */
angular
  .module('Wanderlust')
  .controller('SystemInfoController', [
    '$scope',
    '$timeout',
    'SysInfoResource',
    'SysInfoWidgets',
    function ($scope, $timeout, SysInfoResource, SysInfoWidgets) {
      var timeoutSecs = 3000,
          timeoutPromise;

      function tick() { // @todo should be websocket
        SysInfoResource.get().$promise.then(function success(data) {
          angular.forEach(data, function (v, k) {
            if (SysInfoWidgets[k]) {
              SysInfoWidgets[k].title = parseInt(v, 10); // fight against all evil ;-)
            }
          });

          if (SysInfoWidgets.SessionExpires) {
            var s = SysInfoWidgets.SessionExpires.title,
                m = parseInt(s / 60, 10);
            s = s - (m * 60);
            SysInfoWidgets.SessionExpires.title = m + 'm ' + s + 's';
          }
          $scope.sysInfoWidgets = SysInfoWidgets;
          timeoutPromise = $timeout(tick, timeoutSecs);
        }, function error() {
          // this interval cancels itself when the user logs out
          $scope.isLoading = !$scope.session.isLoggedIn();
          $scope.sysInfoWidgets = SysInfoWidgets;
        });
      }

      if (true === $scope.session.isLoggedIn()) {
        tick();
      }
      $scope.isLoading = !$scope.session.isLoggedIn();
      $scope.sysInfoWidgets = SysInfoWidgets;

      // Cancel interval on page changes
      $scope.$on('$destroy', function () {
        if (angular.isDefined(timeoutPromise)) {
          $timeout.cancel(timeoutPromise);
          timeoutPromise = undefined;
        }
      });
    }
  ]);

angular
  .module('Wanderlust')
  .factory('SysInfoResource', function ($resource, picnicUrls) {
    return $resource(picnicUrls.sysinfo, {});
  })
  .factory('SysInfoWidgets', function () {
    return {
      Goroutines: {
        "icon": "fa-gears",
        "title": 0,
        "comment": "Workers",
        iconColor: "green"
      },
      Wanderers: {
        "icon": "fa-globe",
        "title": 0,
        "comment": "Wanderers",
        iconColor: "orange"
      },
      Brotzeit: {
        "icon": "fa-glass",
        "title": 0,
        "comment": "Brotzeit URLs",
        iconColor: "red"
      },
      SessionExpires: {
        "icon": "fa-clock-o",
        "title": 0,
        "comment": "Log out in",
        iconColor: "blue"
      }
    };
  });

angular
  .module('Wanderlust')
  .controller('UserInfoController', [
    '$scope',
    'UserInfoResource',
    function ($scope, UserInfoResource) {
      /**
       * Gets the collection of users and displays them to see who has an account
       */
      $scope.userCollection = [];
      $scope.isLoading = !$scope.session.isLoggedIn();
      UserInfoResource.get(function (response) {
        $scope.userCollection = response.Users || {};
      });
    }
  ]);

angular
  .module('Wanderlust')

  // loads the user collection when the dashboard website is open.
  .factory('UserInfoResource', function ($resource, picnicUrls) {
    return $resource(picnicUrls.users, {});
  });

angular
  .module('Wanderlust')
  .controller('LoginController', [
    '$scope',
    '$location',
    '$window',
    'Session',
    'AuthResource',
    'growl',
    'AUTH_TOKEN_HEADER',
    function ($scope,
              $location,
              $window,
              Session,
              AuthResource,
              growl,
              AUTH_TOKEN_HEADER) {

      $scope.formData = new AuthResource();

      $scope.login = function () {
        $scope.formData.$save(function saveLoginPost(result, headers) {
          $scope.formData = new AuthResource();

          if (result.loggedIn) {
            Session.login(result, headers(AUTH_TOKEN_HEADER));
            growl.success("Welcome back, " + result.name);
            var path = Session.getLastLoginUrl();
            if (path) {
              $location.path(path);
            } else {
              $window.history.back();
            }
          }
        });
      };
    }
  ]);
angular
  .module('Wanderlust')

  // handles all the provisioners
  .factory('ProvisionerResource', [
    '$resource',
    'picnicUrls',
    function ($resource, picnicUrls) {
      return $resource(picnicUrls.provisioners + ':prov', {prov: '@prov'});
    }
  ])
  .factory('ProvisionerForm', [
    '$timeout',
    'ProvisionerResource',
    'growl',
    function ($timeout, ProvisionerResource, growl) {
      'use strict';

      return {
        _type: '',
        setType: function (t) {
          this._type = t;
          return this;
        },
        _scope: {},
        setScope: function (s) {
          this._scope = s;
          return this;
        },
        _timeout: null,
        _timeoutSave: null,
        _saveUpdates: function (inputFieldName) {
          var $that = this;
          return function () {
            if ($that._scope.provForm.$valid) {
              ProvisionerResource.save({
                prov: $that._type,
                key: inputFieldName,
                value: $that._scope[inputFieldName]
              }, function () {
                $that._scope[inputFieldName + 'Saved'] = true;
                // remove the green tick that it has successful saved
                if ($that._timeoutSave) {
                  $timeout.cancel($that._timeoutSave);
                }
                $that._timeoutSave = $timeout(function removeGreenTick() {
                  $that._scope[inputFieldName + 'Saved'] = false;
                }, 2300);

              });
            }
            // invalid input data will be indicated via form input error class
            //growl.warning("Data is not valid for: " + inputFieldName);

          };
        },
        _debounceUpdate: function (inputFieldName) {
          var $that = this;
          return function (newVal, oldVal) {
            if (newVal !== oldVal) {
              if ($that._timeout) {
                $timeout.cancel($that._timeout);
              }
              $that._timeout = $timeout($that._saveUpdates(inputFieldName), 1.1 * 1000);
            }
          };
        },
        init: function () {
          var $that = this;
          ProvisionerResource.get({prov: $that._type}).$promise.then(
            function success(response) {
              if (!response.data || !Array.isArray(response.data)) {
                growl.warning("Error in retrieving provisioner success data. See console.log for more info.");
                return console.error('Provisioner success error', response);
              }

              // iterating over the slice from GoLang
              var inputName = '', inputValue = '', i = 0, dl = response.data.length;
              for (i = 0; i < dl; i = i + 2) {
                inputName = response.data[i];
                inputValue = response.data[i + 1];
                if (!$that._scope[inputName]) {
                  $that._scope[inputName] = inputValue;
                  $that._scope[inputName + 'Saved'] = false;
                  $that._scope.$watch(inputName, $that._debounceUpdate(inputName));
                }
              }

            },
            function err(data) {
              growl.warning("Error in retrieving provisioner data. See console.log for more info.");
              console.error('Provisioner:', data.data || data);
            }
          );
        }
      };

    }
  ]);

angular
  .module('Wanderlust')
  .controller('ProvisionerController', [
    '$scope',
    '$stateParams',
    'ProvisionerResource',
    'ProvisionerForm',
    function ($scope, $stateParams, ProvisionerResource, ProvisionerForm) {
      var type = $stateParams.type || 'textarea';
      $scope.typeName = type;

      ProvisionerForm.setScope($scope).setType(type).init();
    }
  ]);

angular
  .module('Wanderlust')
  .controller('MarketplaceController', [
    '$scope',
    'growl',
    function ($scope, growl) {
      /**
       * this is only the temporary implementation. All this will be outsources into magento
       * and we will talk directly to Magento REST API. Concept is that GoLang talks to Magento
       * and then provides a route for ng for faster displaying.
       */
      var i = 0;
      var ps = [
        {
          id: i++,
          t: "Google Analytics",
          d: "Get your data automatically from the Google Analytics API.",
          i: "img/800x500.gif",
          p: "€9.00",
          a: true // available
        },
        {
          id: i++,
          t: "Piwik",
          d: "Get your data automatically from the Piwik API.",
          i: "img/800x500.gif",
          p: "€9.00",
          a: false
        },
        {
          id: i++,
          t: "KISSMetrics",
          d: "Get your data automatically from the KISSMetrics API.",
          i: "img/800x500.gif",
          p: "€9.00",
          a: false
        },
        {
          id: i++,
          t: "Clicky",
          d: "Get your data automatically from the Clicky API.",
          i: "img/800x500.gif",
          p: "€9.00",
          a: false
        },
        {
          id: i++,
          t: "Your API",
          d: "Get your data automatically from your custom API.",
          i: "img/800x500.gif",
          p: "€149.00/hourly",
          a: false
        },
        {
          id: i++,
          t: "Webhook",
          d: "Trigger Wanderlust whenever you do a deployment.",
          i: "img/800x500.gif",
          p: "€49.00",
          a: false
        },
        {
          id: i++,
          t: "Concurrency",
          d: "Unlimited number of concurrent request. Default is one request.",
          i: "img/800x500.gif",
          p: "€2.00",
          a: false
        },
        {
          id: i++,
          t: "Automatic updates",
          d: "Alerts you for new versions with auto download.",
          i: "img/800x500.gif",
          p: "€9.00/monthly",
          a: false
        },
        {
          id: i++,
          t: "Magento CE",
          d: "Import data directly from Magento.",
          i: "img/800x500.gif",
          p: "€29.00",
          a: false
        },
        {
          id: i++,
          t: "Magento EE",
          d: "Import data directly from Magento Enterprise.",
          i: "img/800x500.gif",
          p: "€99.00",
          a: false
        },
        {
          id: i++,
          t: "TYPO3",
          d: "Import data directly from TYPO3.",
          i: "img/800x500.gif",
          p: "€9.00",
          a: false
        },
        {
          id: i++,
          t: "Drupal",
          d: "Import data directly from Drupal.",
          i: "img/800x500.gif",
          p: "€9.00",
          a: false
        },
        {
          id: i++,
          t: "Wordpress",
          d: "Import data directly from Wordpress.",
          i: "img/800x500.gif",
          p: "€9.00",
          a: false
        },
        {
          id: i++,
          t: "WooCommerce",
          d: "Import data directly from WooCommerce.",
          i: "img/800x500.gif",
          p: "€49.00",
          a: false
        },
        {
          id: i++,
          t: "Shopware",
          d: "Import data directly from Shopware.",
          i: "img/800x500.gif",
          p: "€49.00",
          a: false
        },
        {
          id: i++,
          t: "RSS/Atom Feed",
          d: "Import data from a RSS/Atom Feed",
          i: "img/800x500.gif",
          p: "€19.00",
          a: false
        }
      ];
      $scope.products = ps;
      $scope.helloWorld = function () {
        console.log('hello');
        growl.warning('Hello World! This feature is WIP');
      }
    }
  ]);
angular
  .module('Wanderlust')
  .factory('BrotzeitResource', [
    '$resource',
    'picnicUrls',
    function ($resource, picnicUrls) {
      return $resource(picnicUrls.brotzeit);
    }
  ]);

angular
  .module('Wanderlust')
  .controller('BrotzeitController', [
    '$scope',
    '$modal',
    'BrotzeitResource',
    'growl',
    function ($scope, $modal, BrotzeitResource, growl) {
      $scope.bzConfigs = [];
      BrotzeitResource.get().$promise.then(
        function success(data) {
          $scope.bzConfigs = data.Collection || [];
          $scope.bzConfigs.forEach(function (bzc) {
            bzc.isCollapsed = true;
            bzc.ScheduleIsValid = bzc.Schedule !== '';
          });
        },
        function err(data) {
          growl.warning('Error in retrieving Brotzeit collection. See console log');
          console.log('BrotzeitResource err', data);
        }
      );

      $scope.saveCronExpression = function (bzModel) {
        BrotzeitResource.save(
          {
            Route: bzModel.Route || '',
            Schedule: bzModel.Schedule || ''
          },
          function success() {
            bzModel.isCollapsed = true;
            bzModel.ScheduleIsValid = bzModel.Schedule !== '';
            growl.info('Cron Schedule saved!');
          }
        );
      };

      $scope.openCronHelp = function () {
        $modal.open({
          templateUrl: 'partials/brotzeit/tpl/cronHelp.html',
          controller: 'CronHelpController',
          size: 'lg'
        });
      };

    }])
  // Please note that $modalInstance represents a modal window (instance) dependency.
  // It is not the same as the $modal service used above.
  .controller('CronHelpController', function ($scope, $modalInstance) {

    $scope.close = function () {
      $modalInstance.dismiss('cancel');
    };
  });

})();