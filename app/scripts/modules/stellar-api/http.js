var api = angular.module('stellarApi');

api.service('http', function($http) {
  var http = {};

  http.post = function(path, data) {
    return $.ajax({
      type: 'POST',
      url: Options.API_SERVER + path,
      data: data,
      async: false
    });
  };

  http.get = function(path, data) {
    return $http.get(Options.API_SERVER + path, data);
  };

  return http;
});
