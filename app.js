var app = require('express')(),
server = require('http').createServer(app),
io = require('socket.io').listen(server),
ent = require('ent'), // Encodage des caracteres (anti XSS)
fs = require('fs');



io.configure(function(){
    io.set("transports", ["websocket"]);
});

//Counter to identify each player
var idJoueur = 0;
//Counter to count the number of players
var nbOfPlayers = 0;
//Two dimensional array to represent the board game
var boardGameSize = 3; // The lenght of the play square
var boardGame = [];
for(var x = 0; x < boardGameSize; x++){
  boardGame[x] = [];
  for(var y = 0; y < boardGameSize; y++){
    boardGame[x][y] = [];
  }
}


app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 8000);  
app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");  

// Chargement de la page index.html
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket, pseudo) {

  //Enregistre le pseudo
  socket.on('newConnection',function(pseudo)
  {
    pseudo = ent.encode(pseudo);
    socket.pseudo = pseudo;
    idJoueur++;
    nbOfPlayers++;
    socket.idJoueur = idJoueur;
    console.log(socket.pseudo + " s'est connecte avec l'id " + socket.idJoueur + " ! ");

    socket.emit('updatenbOfPlayers',nbOfPlayers);
    socket.broadcast.emit('updatenbOfPlayers',nbOfPlayers);

    console.log("Number of players = " + nbOfPlayers);
  });

  //Afficher en console l'id du joueur
  socket.on('getPlayerId',function()
  {
    console.log(socket.pseudo + " id = " + socket.idJoueur);
  });

  //Afficher en console le nombre de joueurs base sur les idJoueur
  socket.on('getServer_IdJoueur',function(){
    console.log("There are" + " = " + nbOfPlayers + " players");
  });

  //Lorsque le joueur place sa marque sur une case
  //Block the game if nbOfPlayer > 2
  socket.on('play',function(squareId)
  {
    if(nbOfPlayers >= 2)
    {
      //Faire des changements locaux pour le joueur
      socket.emit('makeChangesLocal',squareId,socket.idJoueur);
      //Faire les changements globaux pour tous les autres
      socket.broadcast.emit("makeChangesGlobal",squareId,socket.idJoueur);

      //Split to return column and line numbers in this order
      var res = squareId.split("#");

      //We reduce by one because array starts at 0
      //while the square have this format for example: "1#2"
      boardGame[res[1]-1][res[0]-1] = socket.idJoueur;
      hasSomeoneWin(boardGame,res[1],res[0]);
    }
    else{
      socket.emit('notEnoughPlayerToPlay');
    }
  });

  //Event handling the disconnection
  socket.on('disconnect', function () {
    console.log('A user has disconnected');
    //To update the number of players in the game
    nbOfPlayers--;
    socket.broadcast.emit('updatenbOfPlayers',nbOfPlayers);
    console.log("Number of players = " + nbOfPlayers);
  });

  //Check if someone has won
  function hasSomeoneWin(boardGame,columnPlayed,linePlayed)
  {
    var  columnPlayed = parseInt(columnPlayed);
    var linePlayed =  parseInt(linePlayed);

    //console.log("linePlayed : "+linePlayed+" columnPlayed : " + columnPlayed);

    //Initialize the array that will contains the values to have the winner
    var winnerArray=[];
    for(var i = 0;i<boardGameSize;i++)
    {
      winnerArray.push([]);
    }

    //Test right diagonal
    if((columnPlayed == linePlayed))
    {
      //Check the right diagonal
      for(var i = 0;i<boardGameSize;i++)
      {
        winnerArray[i] = boardGame[i][i];
      }
      if(winnerArray.every(x => x == winnerArray[0])){
      //  console.log("Diagonale droite gagnee");
        socket.broadcast.emit('weHaveOurWinner');
        socket.emit('weHaveOurWinner');
      }
    }

    //Test left diagonal
    if((columnPlayed)  + linePlayed == (boardGameSize+1))
    {
      //Check the left diagonal
      var columnShift = boardGameSize;
      var lineShift = 1;
      for(var i = 0;i<boardGameSize;i++)
      {
        winnerArray[i] = boardGame[lineShift-1][columnShift-1];
        columnShift--;
        lineShift++;
      }
      if(winnerArray.every(x => x == winnerArray[boardGameSize-1])){
        //console.log("Diagonale gauche gagnee");
        socket.broadcast.emit('weHaveOurWinner');
        socket.emit('weHaveOurWinner');
      }
    }


    //horizontal test
    for(var i = 0;i<boardGameSize;i++)
    {
      winnerArray[i] = boardGame[i][linePlayed-1];
    }
    if(winnerArray.every(x => x == winnerArray[0])){
      //console.log("Horizontal gagnee");
      socket.broadcast.emit('weHaveOurWinner');
      socket.emit('weHaveOurWinner');
    }

    //Vertical test
    for(var i = 0;i<boardGameSize;i++)
    {
      winnerArray[i] = boardGame[columnPlayed-1][i];
    }
    if(winnerArray.every(x => x == winnerArray[0])){
      socket.broadcast.emit('weHaveOurWinner',socket.pseudo);
      socket.emit('weHaveOurWinner',socket.pseudo);
    }
  }


});



server.listen(8080);
