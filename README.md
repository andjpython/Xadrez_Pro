# ♟️ Xadrez Pro - Multiplayer Online

Sistema de Xadrez multiplayer em tempo real com WebSockets.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎮 Funcionalidades

- ✅ Jogo multiplayer em tempo real
- ✅ Sorteio automático de cores
- ✅ Validação de movimentos no servidor
- ✅ Gráfico de vantagem em tempo real
- ✅ Interface responsiva (mobile-friendly)
- ✅ Temas de tabuleiro personalizáveis
- ✅ Notificações de jogadores conectados

## 🚀 Deploy no Render

### Opção 1: Deploy Automático
1. Fork este repositório
2. Acesse [render.com](https://render.com)
3. Crie um novo **Web Service**
4. Conecte seu repositório GitHub
5. O Render detectará automaticamente as configurações

### Opção 2: Deploy Manual
```bash
# Variáveis de ambiente necessárias:
SECRET_KEY=sua-chave-secreta-aqui
```

## 🛠️ Executar Localmente

```bash
# Clonar repositório
git clone https://github.com/andjpython/Xadrez_Pro.git
cd Xadrez_Pro

# Criar ambiente virtual
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Instalar dependências
pip install -r requirements.txt

# Executar
python app.py
```

Acesse: `http://localhost:5000`

## 📁 Estrutura do Projeto

```
├── app.py              # Backend Flask + SocketIO
├── requirements.txt    # Dependências Python
├── Procfile           # Comando de inicialização (Render/Heroku)
├── render.yaml        # Configuração do Render
├── static/
│   ├── css/style.css  # Estilos da interface
│   └── js/main.js     # Lógica do cliente
├── templates/
│   └── index.html     # Página principal
├── fundo_site/        # Imagens de fundo
└── tabuleiro/         # Screenshots
```

## 🔧 Tecnologias

- **Backend:** Flask, Flask-SocketIO, python-chess
- **Frontend:** HTML5, CSS3, JavaScript, jQuery
- **WebSockets:** Socket.IO + Eventlet
- **Gráficos:** Chart.js
- **Tabuleiro:** ChessboardJS

## 📱 Screenshots

O jogo funciona em desktop e mobile com interface adaptativa.

## 📄 Licença

MIT License - Uso livre para fins educacionais e pessoais.

---

Desenvolvido com ♟️ por [@andjpython](https://github.com/andjpython)
