const io = require('socket.io')();
io.on('connection', function(client){
    console.log('client connected', client)
    client.emit('event', 'bar')
    setInterval(() => {
      console.log('emitting')
      client.emit('event', Math.random())
    }, 1000)
});
io.listen(process.env.PORT || 3001);
