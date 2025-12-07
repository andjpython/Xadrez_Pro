// --- Configuração e Variáveis Globais ---
var board = null;
var game = new Chess();
var socket = null; // Inicia nulo, conecta só depois
var advantageChart = null;

// Regras das Peças (Conteúdo da Ajuda)
const PIECE_RULES = {
    'p': "<b>♟️ PEÃO:</b><br>Move-se 1 casa à frente (ou 2 na saída). Captura na diagonal. Nunca recua.",
    'n': "<b>♞ CAVALO:</b><br>Move-se em 'L'. Pula outras peças.",
    'b': "<b>♝ BISPO:</b><br>Diagonais livres. Mantém-se na sua cor original.",
    'r': "<b>♜ TORRE:</b><br>Linhas retas (cruz). Move-se quantas casas quiser.",
    'q': "<b>♛ RAINHA:</b><br>Combina Torre e Bispo. Retas e diagonais livres.",
    'k': "<b>♚ REI:</b><br>1 casa em qualquer direção. O jogo acaba se ele cair."
};

// --- Funções de Inicialização ---

function enterGame() {
    var name = $('#player-name-input').val() || "Jogador";
    $('#my-name-display').text(name);
    
    // Conecta ao servidor APENAS AGORA
    socket = io();
    setupSocketListeners(); // Configura os ouvintes

    // Aplica o tema escolhido
    var themeClass = $('#board-theme').val();
    $('body').removeClass().addClass(themeClass);

    // Troca de tela
    $('#start-screen').addClass('hidden');
    $('#game-container').removeClass('hidden');
    
    // Notifica servidor que entrou
    socket.emit('join_game', { name: name });

    // Inicia componentes
    initBoard();
    initChart();

    // Sincronização Periódica (Backup) a cada 2 segundos
    setInterval(function() {
        if(socket) socket.emit('request_sync');
    }, 2000);
}

function initBoard() {
    var config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    
    // Delay para garantir renderização correta do layout
    setTimeout(() => {
        board = Chessboard('myBoard', config);
        $(window).resize();
    }, 100);
}

// --- Lógica de Interação (Drag & Drop) ---

function onDragStart(source, piece) {
    // Se o jogo acabou, não permite mover
    if (game.game_over()) return false;

    // 1. Mostrar Ajuda Lateral (Dinâmica)
    showSideHelp(piece);

    // 2. Destacar Movimentos Válidos (Opções de Jogo)
    removeHighlights();
    var moves = game.moves({
        square: source,
        verbose: true
    });

    // Permite arrastar para visualização mesmo se não tiver movimentos (feedback visual)
    if (moves.length === 0) return true; 

    // Destaca a casa de origem
    highlightSquare(source, false);

    // Destaca as casas de destino
    for (var i = 0; i < moves.length; i++) {
        highlightSquare(moves[i].to, moves[i].flags.includes('c') || moves[i].flags.includes('e')); 
    }

    return true;
}

function onDrop(source, target) {
    removeHighlights(); // Limpa destaques
    hideHelp();         // Retorna painel ao estado normal

    // Tenta validar o movimento localmente
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Promoção automática para validação local
    });

    // Se movimento inválido, a peça volta
    if (move === null) return 'snapback';

    // Prepara dados para enviar ao servidor
    // Apenas envia a flag de promoção se realmente for uma promoção
    var promotion = move.promotion ? move.promotion : undefined;

    socket.emit('move', {
        source: source,
        target: target,
        promotion: promotion
    });
}

function onSnapEnd() {
    // board.position(game.fen()); // Opcional: Atualização vem do servidor
}

// --- Destaques Visuais (Highlights) ---

function removeHighlights() {
    $('#myBoard .square-55d63').removeClass('highlight-move highlight-capture');
}

function highlightSquare(square, isCapture) {
    var $square = $('#myBoard .square-' + square);
    if (isCapture) {
        $square.addClass('highlight-capture');
    } else {
        $square.addClass('highlight-move');
    }
}

// --- Interface de Usuário (UI) ---

function showSideHelp(pieceCode) {
    var type = pieceCode.charAt(1).toLowerCase();
    var rule = PIECE_RULES[type];

    $('#default-status').hide();
    $('#piece-help').show();
    $('#info-box').addClass('info-panel-active');

    // Título dinâmico
    var names = { 'p': 'Peão', 'n': 'Cavalo', 'b': 'Bispo', 'r': 'Torre', 'q': 'Rainha', 'k': 'Rei' };
    $('#help-title').text(names[type] || 'Peça');
    $('#help-text').html(rule);
}

function hideHelp() {
    $('#piece-help').hide();
    $('#default-status').show();
    $('#info-box').removeClass('info-panel-active');
}

function showToast(message) {
    var toast = $(`<div class="toast"><span>🔔</span> <span>${message}</span></div>`);
    $('#notification-area').append(toast);
    // Remove do DOM após animação
    setTimeout(() => toast.remove(), 5000);
}

function setupSocketListeners() {
    // --- Comunicação com Servidor (Socket.IO) ---

    socket.on('player_joined', function(data) {
        showToast(`Jogador <strong>${data.name}</strong> está no jogo!`);
    });

    socket.on('update_player_count', function(data) {
        var count = data.count;
        // Se tiver 2 ou mais jogadores, acende a luz do oponente
        if (count >= 2) {
            $('.online-indicator').addClass('indicator-active');
            $('#status-p2').text("Conectado");
        } else {
            $('.online-indicator').removeClass('indicator-active');
            $('#status-p2').text("Aguardando...");
        }
    });

    socket.on('board_update', function(data) {
        // Só atualiza visualmente se houver mudança de FEN para evitar "piscadas"
        // ou se for a primeira carga
        if (game.fen() !== data.fen) {
            game.load(data.fen);
            board.position(data.fen);
            
            // Atualiza textos de turno apenas se mudou
            var turnText = data.turn === 'white' ? 'Vez das Brancas' : 'Vez das Pretas';
            $('#turn-display').text(turnText);
        }
        
        // Status e Analytics podem atualizar sempre
        if (data.status) $('#game-status').text(data.status);

        // Verifica vitória
        if (data.winner) {
            $('#victory-message').text(data.status);
            $('#game-over-modal').removeClass('hidden');
        }

        // Atualiza gráfico
        if (data.analytics) updateAnalytics(data.analytics);
    });

    socket.on('invalid_move', function(data) {
        game.undo();
        board.position(game.fen());
        alert(data.error);
    });
    
    socket.on('start_game_info', function(data) {
        // Recebe info de quem começa (Sorteio)
        var myColor = data.color; // 'white' ou 'black'
        
        // Configura Modal Profissional
        var colorName = myColor === 'white' ? "BRANCAS" : "PRETAS";
        var colorIcon = myColor === 'white' ? "♔" : "♚";
        var colorClass = myColor === 'white' ? "#fff" : "#aaa"; // Cor do texto

        $('#player-color-text').text(colorName).css('color', colorClass);
        $('#player-color-icon').text(colorIcon).css('color', colorClass);
        
        // Mostra o modal
        $('#start-game-modal').removeClass('hidden');
        
        // Ajusta orientação do tabuleiro
        if (myColor === 'black') {
            board.orientation('black');
        } else {
            board.orientation('white');
        }
    });
}

// --- Controles de Botões ---
$(document).ready(function() {
    $('#btn-flip').on('click', function() { board.flip(); });
    
    $('#btn-reset').on('click', function() { 
        if(confirm('Tem certeza que deseja reiniciar o jogo para todos?')) {
            if(socket) socket.emit('reset'); 
        }
    });

    // Responsividade
    $(window).resize(function() { 
        if (board) board.resize(); 
    });
});

// --- Gráficos (Analytics) ---

function initChart() {
    var ctx = document.getElementById('advantageChart').getContext('2d');
    
    // Gradiente para visual mais "gamer"
    var gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(46, 204, 113, 0.4)'); // Verde (Topo/Brancas)
    gradient.addColorStop(0.5, 'rgba(212, 175, 55, 0.1)'); // Centro (Neutro)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)'); // Escuro (Fundo/Pretas)

    advantageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [0],
            datasets: [{
                label: 'Vantagem (Brancas)',
                data: [0],
                borderColor: '#d4af37',
                borderWidth: 2,
                backgroundColor: gradient,
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var val = context.raw;
                            return val > 0 ? "Vantagem Brancas: +" + val : "Vantagem Pretas: +" + Math.abs(val);
                        }
                    }
                }
            },
            scales: {
                x: { display: false },
                y: { 
                    display: true, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#888' }
                }
            }
        }
    });
}

function updateAnalytics(data) {
    var score = data.score;
    
    // Atualiza Placar Numérico
    $('#score-p1').text(score > 0 ? '+' + score : '0');
    $('#score-p2').text(score < 0 ? '+' + Math.abs(score) : '0');

    // Atualiza Status Qualitativo (Texto Colorido)
    updatePlayerStatus('#status-p1', score);       // Brancas (Você, se for P1)
    updatePlayerStatus('#status-p2', -score);      // Pretas (Oponente, se for P2)

    // Atualiza Gráfico
    if (advantageChart) {
        advantageChart.data.labels = data.history.map((_, i) => i);
        advantageChart.data.datasets[0].data = data.history;
        advantageChart.update();
    }
}

function updatePlayerStatus(elementId, playerScore) {
    var $el = $(elementId);
    var text = "";
    var className = "";

    if (playerScore >= 900) { text = "👑 VITORIOSO"; className = "status-excellent"; }
    else if (playerScore >= 300) { text = "🔥 DOMINANDO"; className = "status-excellent"; }
    else if (playerScore >= 100) { text = "😎 MUITO BEM"; className = "status-good"; }
    else if (playerScore >= 30)  { text = "🙂 VANTAGEM"; className = "status-good"; }
    else if (playerScore > -30)  { text = "😐 EQUILIBRADO"; className = "status-neutral"; }
    else if (playerScore > -100) { text = "😕 PRESSIONADO"; className = "status-neutral"; }
    else if (playerScore > -300) { text = "😰 EM PERIGO"; className = "status-bad"; }
    else { text = "💀 PÉSSIMO"; className = "status-terrible"; }

    $el.text(text)
       .removeClass("status-good status-neutral status-bad status-excellent status-terrible")
       .addClass(className);
}