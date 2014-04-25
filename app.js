var express = require('express');
var http = require('http');
var path = require('path');
var io = require('socket.io').listen(3001);

io.set('log level', 1);
io.sockets.on('connection', function(socket) {
  socket.on('message', function(msg) {
    if (msg.question)
      socket.question = msg.question;
  });
});

broadcast = function(question, msg) {
  for (var i in io.sockets.sockets)
    if (io.sockets.sockets[i].question == question)
      io.sockets.sockets[i].json.send(msg);
};

var Mongo = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var Long = require('mongodb').Long;

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env'))
  app.use(express.errorHandler());

inArray = function(array, element) {
  for (var i in array)
    if (array[i] == element)
      return true;
  return false;
};

Mongo.connect('mongodb://localhost:27017', function(err, db) {
  questions = db.collection('questions');
});

app.get('/mongo.questions', function(req, res) { // Получить список опросов
  questions.find().toArray(function(err, questions) {
    res.json(questions);
  });
});

app.get('/mongo.questions/:questionId', function(req, res) { // Получить данные опроса
  questions.findOne({ '_id': new ObjectID(req.params.questionId) }, function(err, question) {
    res.json(question);
  });
});

app.post('/mongo.questions', function(req, res) { // Голосование
  var questionId = req.param('questionId'), choiceId = req.param('choiceId');
  questions.findOne({ '_id': new ObjectID(questionId) }, ['choices'], function(err, question) {
    var votedFor = false; // Выбранный пользователем вариант
    for (var i in question.choices) {
      if (inArray(question.choices[i].users, req.ip)) {
        votedFor = (new Long(question.choices[i].id)).toString();
        break;
      }
    }

    if (votedFor) { // Пользователь голосовал
      if (votedFor == choiceId) { // Пользователь уже голосовал за этот вариант, -1
        questions.update(
          { '_id': new ObjectID(questionId), 'choices.id': new Long(votedFor) }, {
            $inc: { 'choices.$.counter': -1 },
            $pull: { 'choices.$.users': req.ip }
          }, false, function() {
            broadcast(questionId, [{
              target : votedFor,
              value  : -1
            }]);
            res.send(200);
          });
      }
      else { // Пользователь голосовал за другой вариант, -1 +1
        questions.update(
          { '_id': new ObjectID(questionId), 'choices.id': new Long(votedFor) }, {
            $inc: { 'choices.$.counter': -1 },
            $pull: { 'choices.$.users': req.ip }
          }, false, function() {
            questions.update(
              { '_id': new ObjectID(questionId), 'choices.id': new Long(choiceId) }, {
                $inc: { 'choices.$.counter': +1 },
                $push: { 'choices.$.users': req.ip }
              }, false, function() {
                broadcast(questionId, [{
                  target : votedFor,
                  value  : -1
                },{
                  target : choiceId,
                  value  : +1
                }]);
                res.send(200);
              });
          });
      }
    }
    else { // Пользователь не голосовал, +1
      questions.update(
        { '_id': new ObjectID(questionId), 'choices.id': new Long(choiceId) }, {
          $inc: { 'choices.$.counter': +1 },
          $push: { 'choices.$.users': req.ip }
        }, false, function() {
          broadcast(questionId, [{
            target : choiceId,
            value  : +1
          }]);
          res.send(200);
        });
    }
  });
});

app.post('/mongo.upsert', function(req, res) { // Редактирование опроса
  var question = req.param('question');
  questions.update(
    { '_id': new ObjectID(question._id) }, {
      $set: {
        'question': question.question,
        'choices' : question.choices
      }
    }, { upsert: true }, function() {
      res.send(200);
  });
});

app.post('/mongo.destroy', function(req, res) { // Удаление опроса
  var question = req.param('question');
  questions.findAndModify({ '_id': new ObjectID(question._id) }, [], { }, { remove: true}, function() {
    res.send(200);
  });
});

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/questions', function(req, res) {
  res.render('questions');
});

app.get('/question', function(req, res) {
  res.render('question');
});

app.get('/detail', function(req, res) {
  res.render('detail');
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
