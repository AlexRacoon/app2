$(function() {
  getQuestion = function() {
    var loc = window.location.toString();
    return loc.substr(loc.lastIndexOf('/') + 1);
  }

  if (navigator.userAgent.toLowerCase().indexOf('chrome') != -1) {
    socket = io.connect('http://127.0.0.1:3001', { 'transports': ['xhr-polling'] });
  }
  else {
    socket = io.connect('http://127.0.0.1:3001');
  }

  socket.json.send({ question: getQuestion() }); // На случай, если сокет уже открыт

  socket.on('connect', function() {
    socket.on('message', function(msg) {
      for (var i in msg)
        $('#' + msg[i].target).html(parseInt($('#' + msg[i].target).html()) + parseInt(msg[i].value)); // Обновить данные
    });
    socket.json.send({ question: getQuestion() }); // Подписаться на опрос
  });
});
