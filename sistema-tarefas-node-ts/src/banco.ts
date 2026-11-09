import Database from "better-sqlite3";
import path from "node:path";

const caminho = path.join(__dirname, "..", "tarefas.db");
export const db = new Database(caminho);

db.pragma("foreign_keys = ON");

export function iniciarBanco(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS tarefas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL DEFAULT '',
      prioridade TEXT NOT NULL DEFAULT 'media',
      concluida INTEGER NOT NULL DEFAULT 0,
      categoria_id INTEGER NOT NULL,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    );
  `);

  const inserir = db.prepare(
    "INSERT OR IGNORE INTO categorias (nome) VALUES (?)"
  );
  for (const nome of ["Estudos", "Trabalho", "Casa", "Pessoal"]) {
    inserir.run(nome);
  }
}
