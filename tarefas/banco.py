"""Camada de banco de dados (SQLite)."""
import os
import sqlite3

CAMINHO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tarefas.db")


def conectar():
    con = sqlite3.connect(CAMINHO)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")  # ativa a chave estrangeira
    return con


def iniciar():
    """CREATE TABLE das duas tabelas e INSERT das categorias iniciais."""
    con = conectar()
    con.executescript("""
        CREATE TABLE IF NOT EXISTS categorias (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS tarefas (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo       TEXT    NOT NULL,
            descricao    TEXT    NOT NULL DEFAULT '',
            prioridade   TEXT    NOT NULL DEFAULT 'media',
            concluida    INTEGER NOT NULL DEFAULT 0,
            categoria_id INTEGER NOT NULL,
            FOREIGN KEY (categoria_id) REFERENCES categorias(id)
        );
    """)
    for nome in ("Estudos", "Trabalho", "Casa", "Pessoal"):
        con.execute("INSERT OR IGNORE INTO categorias (nome) VALUES (?)", (nome,))
    con.commit()
    con.close()
