import gevent.monkey
gevent.monkey.patch_all()

import random  # Importa random para sorteio
import os

from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO, emit
import chess

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-xadrez-2024')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

# Estado Global do Jogo (Singleton para LAN simples)
board = chess.Board()
eval_history = [0]
connected_players = 0
player_colors = {} # Mapeia SID -> 'white' ou 'black'

# Avaliação Material Simples
PIECE_VALUES = {
    chess.PAWN: 10, chess.KNIGHT: 30, chess.BISHOP: 30,
    chess.ROOK: 50, chess.QUEEN: 90, chess.KING: 900
}

def evaluate_board(board):
    if board.is_checkmate():
        return 9999 if board.turn == chess.BLACK else -9999
    
    score = 0
    for square, piece in board.piece_map().items():
        val = PIECE_VALUES.get(piece.piece_type, 0)
        if piece.color == chess.WHITE:
            score += val
        else:
            score -= val
    return score

# --- Rotas HTTP (Estáticas) ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/fundo_site/<path:filename>')
def serve_fundo(filename):
    return send_from_directory('fundo_site', filename)

@app.route('/pecas/<path:filename>')
def serve_pecas(filename):
    return send_from_directory('pecas', filename)

@app.route('/tabuleiro/<path:filename>')
def serve_tabuleiro(filename):
    return send_from_directory('tabuleiro', filename)

@app.route('/static/<path:filename>')
def serve_static(filename):
    # Fallback genérico caso precise de outros arquivos em static
    return send_from_directory('static', filename)

# --- WebSockets Logic ---

@socketio.on('connect')
def handle_connect():
    global connected_players
    connected_players += 1
    
    # Envia estado atual para quem acabou de conectar
    emit('board_update', {
        'fen': board.fen(), 
        'turn': 'white' if board.turn else 'black',
        'analytics': {'history': eval_history, 'score': eval_history[-1]},
        'players_count': connected_players
    })
    
    # Avisa a todos sobre a nova contagem
    emit('update_player_count', {'count': connected_players}, broadcast=True)
    print(f"Cliente conectado: {request.sid}. Total: {connected_players}")

@socketio.on('disconnect')
def handle_disconnect():
    global connected_players, player_colors
    
    if request.sid in player_colors:
        del player_colors[request.sid]
        
    connected_players = max(0, connected_players - 1)
    emit('update_player_count', {'count': connected_players}, broadcast=True)
    print(f"Cliente desconectado: {request.sid}. Total: {connected_players}")

@socketio.on('join_game')
def handle_join(data):
    global connected_players, player_colors
    
    # Se é o primeiro a entrar, incrementa. 
    # (Nota: connect já incrementou, mas aqui é "join_game" lógico)
    # Como usamos 'connect' para incrementar connected_players, mantemos assim.
    # Mas precisamos atribuir cores.
    
    sid = request.sid
    name = data.get('name', 'Jogador')

    # Lógica de Sorteio (Apenas quando temos 2 jogadores na sala e cores não definidas)
    # Simples: Primeiro a entrar pega branca, segundo preta (ou sorteio real)
    
    # Vamos fazer sorteio real quando tivermos 2 SIDs distintos
    # Mas como 'connected_players' é só um contador, vamos usar request.sid
    
    # Se for o primeiro jogador (connected_players == 1 no momento do join, assumindo que join vem logo após connect)
    # Na verdade, connect já aconteceu. Então se len(player_colors) == 0, ele é o primeiro.
    
    if len(player_colors) == 0:
        player_colors[sid] = 'white' # Provisório, ou definitivo se quiser First Come First Served
    elif len(player_colors) == 1:
        # Segundo jogador entrou. Vamos sortear!
        first_sid = list(player_colors.keys())[0]
        second_sid = sid
        
        # Sorteia quem é branco
        if random.choice([True, False]):
            player_colors[first_sid] = 'white'
            player_colors[second_sid] = 'black'
        else:
            player_colors[first_sid] = 'black'
            player_colors[second_sid] = 'white'
            
        # Avisa o primeiro jogador
        emit('start_game_info', {'color': player_colors[first_sid]}, to=first_sid)
        # Avisa o segundo (atual)
        emit('start_game_info', {'color': player_colors[second_sid]}, to=second_sid)
    else:
        # Espectador (3+ jogadores)
        player_colors[sid] = 'spectator'

    # Se ainda só tem 1, avisa ele que é branco por enquanto (ou espera o 2º para sortear)
    # Melhor esperar o 2º para avisar "Start Game".
    # Mas para o tabuleiro renderizar, mandamos info básica.
    
    # Avisa a todos (menos quem entrou) que alguém novo chegou
    emit('player_joined', {'name': name}, broadcast=True, include_self=False)

@socketio.on('request_sync')
def handle_sync():
    # Envia estado atual apenas para quem pediu (não broadcast)
    emit('board_update', {
        'fen': board.fen(), 
        'turn': 'white' if board.turn else 'black',
        'analytics': {'history': eval_history, 'score': eval_history[-1]},
        'players_count': connected_players
    })

@socketio.on('move')
def handle_move(data):
    source = data.get('source')
    target = data.get('target')
    promotion = data.get('promotion') # Frontend pode mandar 'q' sempre, ignorar se não for necessário

    # 1. Tenta movimento NORMAL (sem promoção)
    move_uci = f"{source}{target}"
    move = None
    
    try:
        move = chess.Move.from_uci(move_uci)
    except ValueError:
        move = None

    # Verifica se o movimento normal é legal
    if move not in board.legal_moves:
        # 2. Se falhou, Tenta com PROMOÇÃO (se houver indicação ou for peão na borda)
        # Se o frontend mandou promoção, tentamos usar
        if promotion:
            try:
                move_prom = chess.Move.from_uci(move_uci + promotion)
                if move_prom in board.legal_moves:
                    move = move_prom
            except ValueError:
                pass
        
        # 3. Fallback: Se ainda inválido, tenta auto-promover para Rainha (q) se for movimento de peão para última fila
        if move not in board.legal_moves:
            try:
                move_auto_q = chess.Move.from_uci(move_uci + 'q')
                if move_auto_q in board.legal_moves:
                    move = move_auto_q
            except ValueError:
                pass

    if move in board.legal_moves:
        board.push(move)
        
        # Calcular Analytics
        current_score = evaluate_board(board)
        eval_history.append(current_score)

        # Calcular status do jogo
        game_status = ""
        winner = None
        if board.is_checkmate():
            winner = "Pretas" if board.turn == chess.WHITE else "Brancas"
            game_status = f"Xeque-Mate! {winner} venceram."
        elif board.is_stalemate():
            game_status = "Empate por Afogamento!"
        elif board.is_check():
            game_status = "Xeque!"

        # Broadcast
        emit('board_update', {
            'fen': board.fen(),
            'turn': 'white' if board.turn else 'black',
            'status': game_status,
            'winner': winner,
            'last_move': {'source': source, 'target': target},
            'analytics': {'history': eval_history, 'score': current_score}
        }, broadcast=True)
        
    else:
        # Debug para saber o que falhou
        print(f"Movimento Inválido Recebido: {source}->{target} Promo:{promotion} | UCI Tentado: {move}")
        emit('invalid_move', {'error': 'Movimento ilegal ou fora de vez.'}, to=request.sid)

@socketio.on('reset')
def handle_reset():
    global board, eval_history, player_colors
    board = chess.Board()
    eval_history = [0]
    
    # Opcional: Ressortear cores no reset?
    # Para manter simples, mantemos as cores atuais.
    
    emit('board_update', {
        'fen': board.fen(), 
        'status': 'Novo Jogo Iniciado!',
        'analytics': {'history': eval_history, 'score': 0}
    }, broadcast=True)

if __name__ == '__main__':
    # host='0.0.0.0' permite acesso externo na LAN
    # Em produção, debug deve ser False
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=debug_mode)