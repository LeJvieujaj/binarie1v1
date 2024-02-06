const socket = io(); // Se connecte automatiquement au serveur Socket.IO

let gameId;
let pseudo;
let myGuess;
let opponentPseudo;
let opponentGuess;
let canMakeChoice = true;

function resetScores() {
    const scores = {}; // Initialisez la variable scores ici
    scores[pseudo] = 0;
    scores[opponentPseudo] = 0;
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = `Score : Vous 0 - Adversaire 0`;
}



document.getElementById('joinLobbyBtn').addEventListener('click', function () {
    document.getElementById('pseudoScreen').style.display = 'none';
    document.getElementById('lobbyScreen').style.display = 'block';
    socket.emit('requestLobbyUpdate'); // Demande la mise à jour du lobby au serveur
});

document.getElementById('createGameBtn').addEventListener('click', function () {
    pseudo = document.getElementById('pseudoInput').value;
    socket.emit('createGame', pseudo);
});

socket.on('updateLobby', function (availableGames) {
    const lobby = document.getElementById('lobby');
    pseudo = document.getElementById('pseudoInput').value; // Récupérez le pseudo actuel du joueur
    lobby.innerHTML = '';
    availableGames.forEach(function (game) {
        const element = document.createElement('div');
        if (game.creator === pseudo) {
            element.innerHTML = `En attente d'un joueur...`;
        } else {
            element.innerHTML = `Serveur de ${game.creator} - <button class="joinGame" data-gameid="${game.id}">Rejoindre</button>`;
        }
        lobby.appendChild(element);
    });

    document.querySelectorAll('.joinGame').forEach(button => {
        button.addEventListener('click', function () {
            gameId = this.getAttribute('data-gameid');
            document.getElementById('createGameBtn').style.display = 'none';
            document.getElementById('joinGameBtn').style.display = 'none';

            socket.emit('joinGame', { gameId, pseudo });
        });
    });
});

socket.on('gameCreated', (createdGameId) => {
    console.log("Partie créée avec l'ID :", createdGameId);
    gameId = createdGameId;
    document.getElementById('createGameBtn').style.display = 'none';
    document.getElementById('joinGameBtn').style.display = 'none';
    resetScores();
    // Afficher l'ID de la partie à l'utilisateur, passer à l'écran de jeu, etc.
});

// Rejoindre une partie
document.getElementById('joinGameBtn').addEventListener('click', function () {
    gameId = document.getElementById('gameIdInput').value; // Laissez l'utilisateur entrer l'ID d'une partie à rejoindre
    pseudo = document.getElementById('pseudoInput').value; // Récupérez le pseudo du joueur
    socket.emit('joinGame', { gameId, pseudo });
});

socket.on('playerJoined', (data) => {
    console.log("Nouveau joueur rejoint la partie :", data);
    document.getElementById('gameScreen').style.display = 'block';
    opponentPseudo = data.opponentPseudo; // Définissez opponentPseudo ici
    document.getElementById('opponentInfo').innerHTML = `Vous jouez contre ${data.opponentPseudo} <div id="indicator"></div>`;
    resetScores();
});

socket.on('errorJoining', (message) => {
    console.log("Erreur lors de la tentative de rejoindre la partie :", message);
    // Afficher un message d'erreur à l'utilisateur
});

document.getElementById('validateBtn').addEventListener('click', function () {
    if (!canMakeChoice) {
        return; // Ne permettez pas au joueur de faire un choix s'il ne peut pas
    }
    myGuess = document.getElementById('myGuess').value;
    opponentGuess = document.getElementById('opponentGuess').value;
    // Envoyer les choix au serveur en incluant gameId
    socket.emit('playerChoice', { gameId, pseudo, myGuess, opponentGuess });

    // Mettre à jour l'indicateur pour indiquer que le joueur a joué
    const indicator = document.getElementById('indicator');
    indicator.classList.add('played');
    canMakeChoice = false; // Bloquez la possibilité de faire un autre choix jusqu'à la fin de la manche
});

socket.on('updateScores', (scores) => {
    // Mettez à jour le score affiché dans l'interface utilisateur
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = `Score : Vous ${scores[pseudo]} - Adversaire ${scores[opponentPseudo]}`;
    canMakeChoice = true; // Permettez au joueur de faire un autre choix maintenant que la manche est terminée
});

socket.on('announceWinner', (scores) => {
    // Mettez à jour l'interface utilisateur pour annoncer le vainqueur
    const winner = scores[pseudo] === 3 ? 'Vous' : 'Adversaire';
    const messageElement = document.getElementById('message');
    messageElement.textContent = `${winner} avez gagné la partie!`;
    messageElement.style.display = 'block';
    
    // Redirigez les joueurs vers le lobby après quelques secondes
    setTimeout(() => {
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('lobbyScreen').style.display = 'block';
        document.getElementById('createGameBtn').style.display = 'block';
        document.getElementById('joinGameBtn').style.display = 'block';
        socket.emit('requestLobbyUpdate'); // Demande la mise à jour du lobby
        messageElement.style.display = 'none'; // Masquez le message
    }, 5000); // Attendre 5 secondes avant de rediriger les joueurs
});
