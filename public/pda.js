window.onerror = function(messageOrEvent, source, lineno, colno, error) {
    console.error('window.onerror() @ ' + source + ':' + lineno + ':' + colno + '\n' + error + '\n' + messageOrEvent);
    document.body.style.backgroundColor = '#a44';
};


// angular.
//   module('exceptionOverwrite', []).
//   factory('$exceptionHandler', ['$log', 'logErrorsToBackend', function($log, logErrorsToBackend) {
//     return function myExceptionHandler(exception, cause) {
//     //   logErrorsToBackend(exception, cause);
//     //   $log.warn(exception, cause);
//     };
//   }]);


var app = angular.module('app', ['firebase', 'ngMaterial', 'ngRoute']);


app.factory('$exceptionHandler',
    ['$log',
    function($log) {
        return function myExceptionHandler(exception, cause) {
            // logErrorsToBackend(exception, cause);
            // document.body.style.backgroundColor = '#c22';
            $log.error(exception, cause);
            // $rootScope.status = exception + '\n' + cause;
            
            // document.body.innerHTML = '';
            var elemDiv = document.createElement('div');
            elemDiv.className = 'exception';
            // elemDiv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;padding:1em;font-family:monospace;color:#c22;';
            document.body.insertBefore(elemDiv, document.body.firstChild);
            var arr = [];
            if (exception.message) arr.push(exception.message);
            if (exception.stack) arr.push(exception.stack);
            if (exception.name) arr.push('name: ' + exception.name);
            if (exception.fileName) arr.push('fileName: ' + exception.fileName);
            if (exception.lineNumber) arr.push('lineNumber: ' + exception.lineNumber);
            if (exception.columnNumber) arr.push('columnNumber: ' + exception.columnNumber);
            elemDiv.innerText = arr.join('\n\n');
        };
}]);


app.run(['$rootScope', '$location', function($rootScope, $location) {
    // $rootScope.$on('$locationChangeStart', function(event, newUrl, previousUrl, newState, oldState) {
    //     console.log('$locationChangeStart:', newUrl);
    // });

    // $rootScope.$on('$locationChangeSuccess', function(event, newUrl, previousUrl, newState, oldState) {
    //     console.log('$locationChangeSuccess:', newUrl);
    // });

    $rootScope.$on('$routeChangeStart', function(event, next, previous) {
        // console.log('$routeChangeStart:', next);
        $rootScope.status = 'Loading…';
    });

    $rootScope.$on('$routeChangeSuccess', function(event, next, previous) {
        // console.log('$routeChangeSuccess:', next);
        $rootScope.status = '';
    });

    // $rootScope.$on('$routeUpdate', function(event, previous) {
    //     console.log('$routeUpdate:', event);
    // });

    $rootScope.$on('$routeChangeError', function(event, next, previous, error) {
        // Catch error thrown when $requireSignIn promise is rejected.
        if (error === 'AUTH_REQUIRED') {
            console.warn(error);
            $location.path('/login');
            return;
        }

        // console.error('$routeChangeError:', error);
    });
}]);


app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {

    $locationProvider.html5Mode(true);

    $routeProvider
    .when('/login', {
        controller: 'LoginController',
        templateUrl: '/views/login-view.html',
        reloadOnSearch: false,
        resolve: {
            'currentAuth': ['Auth', function(Auth) {
                // Resolves to the authenticated user or null if not signed in.
                return Auth.$waitForSignIn();
            }]
        }
    })
    .when('/', {
        controller: 'MainController',
        templateUrl: '/views/main-view.html',
        reloadOnSearch: false,
        resolve: {
            'currentAuth': ['Auth', function(Auth) {
                // Resolves to the authenticated user or throws $routeChangeError if not signed in.
                return Auth.$requireSignIn();
            }]
        }
    });

}]);


app.controller('PageController',
    ['$scope', '$location', 'Auth',
    function($scope, $location, Auth) {

        Auth.$onAuthStateChanged(user => {
            $scope.user = user;
            $location.path(user == null ? '/login' : '/');
        });

        $scope.logout = function () {
            Auth.$signOut();
        };

}]);


app.controller('LoginController',
    ['$scope', '$location', 'Auth',
    function($scope, $location, Auth) {

        $scope.login = function () {
            var provider = new firebase.auth.GoogleAuthProvider();
            Auth.$signInWithRedirect(provider);
        };

}]);


app.controller('MainController',
    ['$scope', '$location', 'Auth', '$firebaseArray', '$mdDialog',
    function($scope, $location, Auth, $firebaseArray, $mdDialog) {

        var ref = firebase.database().ref();
        var cards = ref.child("cards");
        var query = cards.orderByChild("displayName");

        $scope.save = function(card) {
            list.$save(card).then(function(ref) {
                console.log('Saved ' + ref);
            }, function(error) {
                console.error('Error saving ' + ref + '\n' + error);
            });
        };

        $scope.delete = function(evt, card, thing) {
            var confirm = $mdDialog.confirm()
                .title('Delete this card?')
                .textContent('Data will be permanently deleted. Consider disabling instead.')
                .ariaLabel('Delete confirmation')
                .targetEvent(evt)
                .ok('DELETE')
                .cancel('Cancel');

            $mdDialog.show(confirm).then(function() {
                var found = false;
                card.contacts.splice(card.contacts.indexOf(thing), 1);
            }, function() {
                // Canceled.
            });
        };

        $scope.newEntity = function(card) {
            cards.push().set({
                'enabled': true
            });
        };

        $scope.newContact = function(card) {
            if (!card.contacts) {
                card.contacts = [];
            }
            card.contacts.push({
                'enabled': true
            });
        };

        var list = $firebaseArray(cards);
        list.$loaded().then(function (loadedList) {
            console.log("Loaded " + list.length + " cards");
        });
    
        $scope.cards = list;

}]);

app.directive('myDisplayName', function() {
    return {
        scope: {
            card: '=myDisplayName'
        },
        template: '<span>{{card.first_name}} {{card.last_name}}</span><span flex ng-show="!!card.entity_name">({{card.entity_name}})</span>'
    };
});

app.factory('Auth', ['$firebaseAuth', function($firebaseAuth) {
    return $firebaseAuth();
}]);


app.factory('Db', ['$firebaseArray', function($firebaseArray) {
    var ref = firebase.database().ref();
    var obj = $firebaseArray(ref);
    return obj;
}]);
