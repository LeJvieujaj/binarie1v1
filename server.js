const http = require('http');
const express = require('express');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Serveur les fichiers statiques depuis le dossier 'public'

let parties = {}; // Stocke les parties et leurs joueurs
let scores = {};

// Envoie la liste des parties disponibles à tous les clients dans le lobby
function updateLobby() {
    const availableGames = Object.values(parties).filter(game => game.players.length < 2);
    io.emit('updateLobby', availableGames); // Assurez-vous que cet événement est géré côté client
}

io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté.');

    socket.on('createGame', (pseudo) => {
        console.log('game créer');
        const gameId = "game" + Math.random();
        parties[gameId] = {
            players: [pseudo],
            id: gameId,
            creator: pseudo,
            playersChoices: {}, // Initialisez playersChoices pour ce jeu
            waitingForChoice: 0 // Nombre de joueurs qui attendent un choix
        };
        socket.join(gameId);
        socket.emit('gameCreated', gameId);
        updateLobby(); // Met à jour le lobby après la création d'une partie
    });


    socket.on('joinGame', (data) => {
        const { gameId, pseudo } = data;
        if (parties[gameId] && parties[gameId].players.length < 2) {
            parties[gameId].players.push(pseudo);
            socket.join(gameId);
            // Identifiez le créateur (premier joueur) et le joueur qui rejoint (second joueur)
            const creatorPseudo = parties[gameId].players[0];
            const joiningPseudo = pseudo;
            // Envoyez l'événement 'playerJoined' au joueur qui rejoint avec le pseudo du créateur
            socket.emit('playerJoined', { gameId, opponentPseudo: creatorPseudo });
            // Envoyez l'événement 'playerJoined' au créateur avec le pseudo du joueur qui rejoint
            socket.to(gameId).emit('playerJoined', { gameId, opponentPseudo: joiningPseudo });
    
            // Initialisez les scores pour les deux joueurs ici
            scores[creatorPseudo] = 0;
            scores[joiningPseudo] = 0;
    
            updateLobby();
        } else {
            socket.emit('errorJoining', "La partie est pleine ou n'existe pas.");
        }
    });
    
    
    socket.on('playerChoice', (data) => {
        // Traitement des choix du joueur
        const { gameId, pseudo, myGuess, opponentGuess } = data;
        const game = parties[gameId];
    
        // Stockez le choix du joueur dans la partie
        game.playersChoices[pseudo] = { myGuess, opponentGuess };
    
        // Incrémente le compteur de joueurs en attente de choix
        game.waitingForChoice++;
    
        // Vérifiez si les deux joueurs ont fait leurs choix
        if (game.waitingForChoice === 2) {
            // Les deux joueurs ont fait leurs choix, calculez les scores
            const player1 = game.players[0];
            const player2 = game.players[1];
    
            if (
                (game.playersChoices[player1].myGuess === game.playersChoices[player2].opponentGuess) &&
                (game.playersChoices[player2].myGuess === game.playersChoices[player1].opponentGuess)
            ) {
                // Les deux joueurs ont deviné correctement, aucun point
            } else if (game.playersChoices[player1].myGuess === game.playersChoices[player2].opponentGuess) {
                // Le joueur 2 a deviné correctement, 1 point
                scores[player2] += 1;
            } else if (game.playersChoices[player2].myGuess === game.playersChoices[player1].opponentGuess) {
                // Le joueur 1 a deviné correctement, 1 point
                scores[player1] += 1;
            }
    
            // Mettez à jour les scores pour les deux joueurs
            io.to(gameId).emit('updateScores', scores);
    
            // Réinitialisez les choix des joueurs et le compteur
            game.playersChoices = {};
            game.waitingForChoice = 0;
    
            // Vérifiez si l'un des joueurs a atteint un score de 3
            if (scores[player1] === 3 || scores[player2] === 3) {
                // Annoncez le vainqueur
                io.to(gameId).emit('announceWinner', scores);
    
                // Attendez quelques secondes avant de réinitialiser la partie
                setTimeout(() => {
                    // Supprimez la partie
                    delete parties[gameId];
                    // Redirigez les joueurs vers le lobby
                    updateLobby();
                }, 5000); // Attendre 5 secondes avant de réinitialiser la partie
            }
        }
    });
    
    
    
    
    
    
});



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});