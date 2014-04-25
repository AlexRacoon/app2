var ques = angular.module('questions', [ 'ngRoute' ]);

ques.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      controller  : 'QuestionsListCtrl',
      templateUrl : '/questions'
    })
    .when('/question/:questionId', {
      controller  : 'QuestionViewCtrl',
      templateUrl : '/question'
    })
    .when('/questions/new', {
      controller  : 'QuestionDetailCtrl',
      templateUrl : '/detail'
    })
    .when('/question/:questionId/edit', {
      controller  : 'QuestionDetailCtrl',
      templateUrl : '/detail'
    })
    .otherwise({
      redirectTo  : '/'
    });
});

ques.controller('QuestionsListCtrl', function($scope, $http) { // Отображение опросов
  $http.get('/mongo.questions').success(function(data) { // Получить список опросов
    $scope.questions = data;
  });
});

ques.controller('QuestionViewCtrl', function($scope, $http, $routeParams) {
  $http.get('/mongo.questions/' + $routeParams.questionId).success(function(data) {
    $scope.question = data; // Получить опрос
  });

  $scope.choose = function(choiceId) { // Выбрать вариант ответа
    $http.post('/mongo.questions',{
        questionId: $routeParams.questionId,
        choiceId: choiceId
      }).success(function(data) {
        //alert(data);
    });
  };
});

ques.controller('QuestionDetailCtrl', function($scope, $http, $routeParams, $location) { // Редактирование опросов
  if ($routeParams.questionId) { // Редактирование опроса
    $http.get('/mongo.questions/' + $routeParams.questionId).success(function(data) {
      $scope.question = data;
    });
  }
  else { // Добавление опроса
    $scope.question = {
      question: '',
      choices: []
    };
  }

  $scope.save = function() { // Сохранение опроса
    $http.post('/mongo.upsert/', { question: $scope.question }).success(function(data) {
      $location.path('/');
    });
  };

  $scope.destroy = function() { // Удаление опроса
    $http.post('/mongo.destroy', { question: $scope.question }).success(function(data) {
      $location.path('/');
    });
  };

  $scope.add = function() { // Добавление варианта ответа
    $scope.question.choices.push({
      id: $scope.question.choices.length,
      value: '',
      counter: 0,
      users: []
    });
  }

  $scope.remove = function(choiceId) { // Удаление варианта ответа
    for (var i = 0; i < $scope.question.choices.length; i++) {
      if ($scope.question.choices[i].id == choiceId) {
        $scope.question.choices.splice(i, 1);
      }
    }
  };
});
