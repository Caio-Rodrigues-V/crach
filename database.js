const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Criação da tabela de colaboradores
db.exec(`
  CREATE TABLE IF NOT EXISTS colaboradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    primeiro_nome TEXT NOT NULL,
    nome_completo TEXT NOT NULL,
    matricula TEXT NOT NULL,
    cargo TEXT DEFAULT '',
    foto_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const Colaborador = {
  listar(busca = '') {
    if (busca && busca.trim()) {
      const termo = `%${busca.trim()}%`;
      const stmt = db.prepare(`
        SELECT * FROM colaboradores
        WHERE primeiro_nome LIKE ? OR nome_completo LIKE ? OR matricula LIKE ? OR cargo LIKE ?
        ORDER BY id DESC
      `);
      return stmt.all(termo, termo, termo, termo);
    }
    const stmt = db.prepare('SELECT * FROM colaboradores ORDER BY id DESC');
    return stmt.all();
  },

  buscarPorId(id) {
    const stmt = db.prepare('SELECT * FROM colaboradores WHERE id = ?');
    return stmt.get(id);
  },

  criar({ primeiro_nome, nome_completo, matricula, cargo = '', foto_path = '' }) {
    const stmt = db.prepare(`
      INSERT INTO colaboradores (primeiro_nome, nome_completo, matricula, cargo, foto_path, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    const info = stmt.run(primeiro_nome, nome_completo, matricula, cargo, foto_path);
    return this.buscarPorId(info.lastInsertRowid);
  },

  atualizar(id, { primeiro_nome, nome_completo, matricula, cargo = '', foto_path = null }) {
    if (foto_path !== null) {
      const stmt = db.prepare(`
        UPDATE colaboradores
        SET primeiro_nome = ?, nome_completo = ?, matricula = ?, cargo = ?, foto_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(primeiro_nome, nome_completo, matricula, cargo, foto_path, id);
    } else {
      const stmt = db.prepare(`
        UPDATE colaboradores
        SET primeiro_nome = ?, nome_completo = ?, matricula = ?, cargo = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(primeiro_nome, nome_completo, matricula, cargo, id);
    }
    return this.buscarPorId(id);
  },

  remover(id) {
    const colab = this.buscarPorId(id);
    if (!colab) return false;

    // Se tiver foto física na pasta uploads, remover
    if (colab.foto_path && colab.foto_path.startsWith('/uploads/')) {
      const fullPath = path.join(__dirname, colab.foto_path);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) { /* ignore */ }
      }
    }

    const stmt = db.prepare('DELETE FROM colaboradores WHERE id = ?');
    stmt.run(id);
    return true;
  }
};

module.exports = { db, Colaborador };
