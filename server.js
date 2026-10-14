const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const multer = require('multer');
const { Colaborador } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Credenciais de Acesso
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '35349020';

// Gerenciamento de Sessões em Memória
const activeSessions = new Map(); // token -> { user, createdAt }

// Limpeza de sessões antigas (expira em 24h)
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;
  for (const [token, data] of activeSessions.entries()) {
    if (now - data.createdAt > maxAge) {
      activeSessions.delete(token);
    }
  }
}, 60 * 60 * 1000);

// Garante pastas necessárias
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do Multer para armazenamento de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // até 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas!'));
    }
  }
});

// Middlewares Globais
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Servir arquivos estáticos do frontend e uploads
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Middleware de Autenticação para APIs protegidas
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Acesso não autorizado. Faça login primeiro.' });
  }

  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);

  if (!session) {
    return res.status(401).json({ success: false, error: 'Sessão expirada ou inválida. Faça login novamente.' });
  }

  req.user = session.user;
  next();
}

// ================= ROTAS DE AUTENTICAÇÃO ================= //

// 1. Rota de Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Informe usuário e senha.' });
  }

  if (username.trim() === ADMIN_USER && password === ADMIN_PASS) {
    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, { user: ADMIN_USER, createdAt: Date.now() });

    return res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token,
      user: ADMIN_USER
    });
  }

  return res.status(401).json({ success: false, error: 'Usuário ou senha incorretos!' });
});

// 2. Checar validade do token
app.get('/api/auth/check', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false });
  }

  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);

  if (!session) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({ authenticated: true, user: session.user });
});

// 3. Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  return res.json({ success: true, message: 'Logout realizado com sucesso.' });
});

// ================= ROTAS DA API PROTEGIDAS ================= //

// 1. Listar colaboradores
app.get('/api/colaboradores', authMiddleware, (req, res) => {
  try {
    const { busca } = req.query;
    const lista = Colaborador.listar(busca);
    res.json({ success: true, total: lista.length, data: lista });
  } catch (err) {
    console.error('Erro ao listar:', err);
    res.status(500).json({ success: false, error: 'Erro ao listar colaboradores' });
  }
});

// 2. Buscar colaborador por ID
app.get('/api/colaboradores/:id', authMiddleware, (req, res) => {
  try {
    const colab = Colaborador.buscarPorId(req.params.id);
    if (!colab) return res.status(404).json({ success: false, error: 'Colaborador não encontrado' });
    res.json({ success: true, data: colab });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Cadastrar colaborador (com foto)
app.post('/api/colaboradores', authMiddleware, upload.single('foto'), (req, res) => {
  try {
    const { primeiro_nome, nome_completo, matricula, cargo, foto_base64 } = req.body;

    if (!primeiro_nome || !matricula) {
      return res.status(400).json({ success: false, error: 'Primeiro nome e matrícula são obrigatórios!' });
    }

    let foto_path = '';

    if (req.file) {
      foto_path = `/uploads/${req.file.filename}`;
    } else if (foto_base64 && foto_base64.startsWith('data:image')) {
      const matches = foto_base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].split('/')[1] || 'png';
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
        foto_path = `/uploads/${filename}`;
      }
    }

    const novo = Colaborador.criar({
      primeiro_nome: primeiro_nome.trim(),
      nome_completo: (nome_completo || primeiro_nome).trim(),
      matricula: matricula.trim(),
      cargo: cargo ? cargo.trim() : '',
      foto_path
    });

    res.status(201).json({ success: true, message: 'Colaborador salvo com sucesso!', data: novo });
  } catch (err) {
    console.error('Erro ao criar colaborador:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Atualizar colaborador
app.put('/api/colaboradores/:id', authMiddleware, upload.single('foto'), (req, res) => {
  try {
    const { id } = req.params;
    const { primeiro_nome, nome_completo, matricula, cargo, foto_base64 } = req.body;

    const existente = Colaborador.buscarPorId(id);
    if (!existente) return res.status(404).json({ success: false, error: 'Colaborador não encontrado' });

    let foto_path = null;

    if (req.file) {
      foto_path = `/uploads/${req.file.filename}`;
    } else if (foto_base64 && foto_base64.startsWith('data:image')) {
      const matches = foto_base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].split('/')[1] || 'png';
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
        foto_path = `/uploads/${filename}`;
      }
    }

    const atualizado = Colaborador.atualizar(id, {
      primeiro_nome: (primeiro_nome || existente.primeiro_nome).trim(),
      nome_completo: (nome_completo || existente.nome_completo).trim(),
      matricula: (matricula || existente.matricula).trim(),
      cargo: cargo !== undefined ? cargo.trim() : existente.cargo,
      foto_path
    });

    res.json({ success: true, message: 'Colaborador atualizado com sucesso!', data: atualizado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Excluir colaborador
app.delete('/api/colaboradores/:id', authMiddleware, (req, res) => {
  try {
    const ok = Colaborador.remover(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: 'Colaborador não encontrado' });
    res.json({ success: true, message: 'Colaborador removido com sucesso!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🔒 PLATAFORMA DE CRACHÁS LIGHT & GRUPO DDM ATIVA!`);
  console.log(`👤 Usuário de Acesso: ${ADMIN_USER}`);
  console.log(`🌐 Acesse no seu navegador: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
