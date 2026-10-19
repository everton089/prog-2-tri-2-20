"""Servidor HTTP: recebe requisições, valida, acessa o banco e responde em JSON.
Execução:  python3 servidor.py   ->  http://127.0.0.1:8000"""
import json
import os
import re
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import banco
from modelos import Pilha, criar_tarefa

PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
TIPOS = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
         ".js": "text/javascript; charset=utf-8"}
excluidas = Pilha()  # pilha de tarefas excluídas (desfazer)

SQL_LISTA = """SELECT t.id, t.titulo, t.descricao, t.prioridade, t.concluida,
                      t.categoria_id, c.nome AS categoria
               FROM tarefas t JOIN categorias c ON c.id = t.categoria_id"""


def buscar(con, id_):
    return con.execute(SQL_LISTA + " WHERE t.id = ?", (id_,)).fetchone()


def formatar(linha):
    d = dict(linha)
    d["rotulo"] = criar_tarefa(d).rotulo()
    d["concluida"] = bool(d["concluida"])
    return d


def tratar_api(metodo, caminho, consulta, corpo):
    """Retorna (status HTTP, dados)."""
    con = banco.conectar()
    try:
        if caminho == "/api/categorias" and metodo == "GET":
            return 200, [dict(r) for r in con.execute("SELECT * FROM categorias ORDER BY nome COLLATE NOCASE")]
        if caminho == "/api/categorias" and metodo == "POST":
            nome = corpo.get("nome", "")
            if not isinstance(nome, str):
                raise ValueError("O nome da categoria deve ser um texto.")
            nome = nome.strip()
            if not nome:
                raise ValueError("Informe o nome da categoria.")
            if len(nome) > 40:
                raise ValueError("O nome da categoria deve ter no máximo 40 caracteres.")
            existente = con.execute(
                "SELECT id FROM categorias WHERE nome = ? COLLATE NOCASE", (nome,)
            ).fetchone()
            if existente:
                return 409, {"erro": "Essa categoria já existe."}
            cur = con.execute("INSERT INTO categorias (nome) VALUES (?)", (nome,))
            con.commit()
            categoria = con.execute(
                "SELECT id, nome FROM categorias WHERE id = ?", (cur.lastrowid,)
            ).fetchone()
            return 201, dict(categoria)
        if caminho == "/api/pilha" and metodo == "GET":
            return 200, {"tamanho": excluidas.tamanho()}
        if caminho == "/api/desfazer" and metodo == "POST":
            d = excluidas.desempilhar()
            con.execute("""INSERT INTO tarefas (id, titulo, descricao, prioridade, concluida, categoria_id)
                           VALUES (:id, :titulo, :descricao, :prioridade, :concluida, :categoria_id)""", d)
            con.commit()
            return 200, formatar(buscar(con, d["id"]))

        m = re.fullmatch(r"/api/tarefas(?:/(\d+))?(/concluir)?", caminho)
        if not m:
            return 404, {"erro": "Rota não encontrada."}
        id_, acao = m.group(1), m.group(2)

        if id_ is None:
            if metodo == "GET":                                   # READ (lista)
                q = "%" + consulta.get("q", [""])[0] + "%"
                linhas = con.execute(SQL_LISTA + " WHERE t.titulo LIKE ? ORDER BY t.concluida, t.id DESC", (q,))
                return 200, [formatar(r) for r in linhas]
            if metodo == "POST":                                  # CREATE
                t = criar_tarefa(corpo)
                cur = con.execute("""INSERT INTO tarefas (titulo, descricao, prioridade, categoria_id)
                                     VALUES (?, ?, ?, ?)""",
                                  (t.titulo, t.descricao, t.prioridade, t.categoria_id))
                con.commit()
                return 201, formatar(buscar(con, cur.lastrowid))
            return 405, {"erro": "Método não permitido."}

        atual = buscar(con, int(id_))
        if atual is None:
            return 404, {"erro": "Tarefa não encontrada."}
        if metodo == "GET" and not acao:                          # READ (um registro)
            return 200, formatar(atual)
        if metodo == "PUT" and not acao:                          # UPDATE
            t = criar_tarefa({**corpo, "id": atual["id"], "concluida": atual["concluida"]})
            con.execute("""UPDATE tarefas SET titulo=?, descricao=?, prioridade=?, categoria_id=?
                           WHERE id=?""", (t.titulo, t.descricao, t.prioridade, t.categoria_id, t.id))
            con.commit()
            return 200, formatar(buscar(con, t.id))
        if metodo == "PATCH" and acao:                            # UPDATE parcial
            con.execute("UPDATE tarefas SET concluida = 1 - concluida WHERE id = ?", (atual["id"],))
            con.commit()
            return 200, formatar(buscar(con, atual["id"]))
        if metodo == "DELETE" and not acao:                       # DELETE
            excluidas.empilhar({k: atual[k] for k in
                                ("id", "titulo", "descricao", "prioridade", "concluida", "categoria_id")})
            con.execute("DELETE FROM tarefas WHERE id = ?", (atual["id"],))
            con.commit()
            return 200, {"mensagem": "Tarefa excluída.", "pilha": excluidas.tamanho()}
        return 405, {"erro": "Método não permitido."}
    except ValueError as e:              # falha de validação
        return 400, {"erro": str(e)}
    except LookupError as e:             # pilha vazia
        return 404, {"erro": str(e)}
    except sqlite3.IntegrityError:       # violação da chave estrangeira
        return 400, {"erro": "Categoria inexistente."}
    finally:
        con.close()


class Handler(BaseHTTPRequestHandler):
    def enviar(self, status, conteudo, tipo):
        self.send_response(status)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(conteudo)))
        self.end_headers()
        self.wfile.write(conteudo)

    def tratar(self, metodo):
        url = urlparse(self.path)
        caminho = url.path.rstrip("/") or "/"
        if not caminho.startswith("/api"):
            if metodo != "GET":
                return self.enviar(405, b"", "text/plain")
            nome = os.path.basename(caminho) or "index.html"   # basename evita ../
            arquivo = os.path.join(PASTA, nome)
            if not os.path.isfile(arquivo):
                return self.enviar(404, "Não encontrado".encode(), "text/plain; charset=utf-8")
            with open(arquivo, "rb") as f:
                return self.enviar(200, f.read(), TIPOS.get(os.path.splitext(nome)[1], "text/plain"))
        corpo = {}
        tamanho = int(self.headers.get("Content-Length") or 0)
        if tamanho:
            try:
                corpo = json.loads(self.rfile.read(tamanho))
                if not isinstance(corpo, dict):
                    raise ValueError
            except ValueError:
                return self.responder(400, {"erro": "JSON inválido."})
        self.responder(*tratar_api(metodo, caminho, parse_qs(url.query), corpo))

    def responder(self, status, dados):
        self.enviar(status, json.dumps(dados, ensure_ascii=False).encode(),
                    "application/json; charset=utf-8")

    def do_GET(self): self.tratar("GET")
    def do_POST(self): self.tratar("POST")
    def do_PUT(self): self.tratar("PUT")
    def do_PATCH(self): self.tratar("PATCH")
    def do_DELETE(self): self.tratar("DELETE")


if __name__ == "__main__":
    banco.iniciar()
    print("Servidor em http://127.0.0.1:8000  (Ctrl+C para parar)")
    ThreadingHTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
