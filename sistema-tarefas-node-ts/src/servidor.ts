import express, { Request, Response, NextFunction } from "express";
import path from "node:path";
import { db, iniciarBanco } from "./banco";
import { criarTarefa, Pilha, DadosTarefa } from "./modelos";

type LinhaTarefa = {
  id: number; titulo: string; descricao: string; prioridade: "baixa" | "media" | "alta";
  concluida: number; categoria_id: number; categoria: string;
};

type TarefaExcluida = Omit<LinhaTarefa, "categoria">;

const app = express();
const PORTA = 8000;
const excluidas = new Pilha<TarefaExcluida>();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "static")));

const SQL_LISTA = `
  SELECT t.id, t.titulo, t.descricao, t.prioridade, t.concluida,
         t.categoria_id, c.nome AS categoria
  FROM tarefas t
  JOIN categorias c ON c.id = t.categoria_id
`;

function buscar(id: number): LinhaTarefa | undefined {
  return db.prepare(SQL_LISTA + " WHERE t.id = ?").get(id) as LinhaTarefa | undefined;
}

function formatar(linha: LinhaTarefa) {
  const tarefa = criarTarefa({
    id: linha.id,
    titulo: linha.titulo,
    descricao: linha.descricao,
    prioridade: linha.prioridade,
    concluida: linha.concluida,
    categoria_id: linha.categoria_id
  });
  return {
    ...linha,
    concluida: Boolean(linha.concluida),
    rotulo: tarefa.rotulo()
  };
}

function erro(res: Response, status: number, mensagem: string) {
  return res.status(status).json({ erro: mensagem });
}

// Categorias
app.get("/api/categorias", (_req, res) => {
  const categorias = db.prepare(
    "SELECT * FROM categorias ORDER BY nome COLLATE NOCASE"
  ).all();
  res.json(categorias);
});

app.post("/api/categorias", (req, res) => {
  const valor = req.body?.nome;
  if (typeof valor !== "string") {
    return erro(res, 400, "O nome da categoria deve ser um texto.");
  }
  const nome = valor.trim();
  if (!nome) return erro(res, 400, "Informe o nome da categoria.");
  if (nome.length > 40) {
    return erro(res, 400, "O nome da categoria deve ter no máximo 40 caracteres.");
  }

  const existente = db.prepare(
    "SELECT id FROM categorias WHERE nome = ? COLLATE NOCASE"
  ).get(nome);
  if (existente) return erro(res, 409, "Essa categoria já existe.");

  const resultado = db.prepare(
    "INSERT INTO categorias (nome) VALUES (?)"
  ).run(nome);
  const categoria = db.prepare(
    "SELECT id, nome FROM categorias WHERE id = ?"
  ).get(Number(resultado.lastInsertRowid));
  res.status(201).json(categoria);
});

// Estado da pilha e desfazer exclusão
app.get("/api/pilha", (_req, res) => {
  res.json({ tamanho: excluidas.tamanho() });
});

app.post("/api/desfazer", (_req, res) => {
  try {
    const tarefa = excluidas.desempilhar();
    db.prepare(`
      INSERT INTO tarefas
        (id, titulo, descricao, prioridade, concluida, categoria_id)
      VALUES (@id, @titulo, @descricao, @prioridade, @concluida, @categoria_id)
    `).run(tarefa);
    const restaurada = buscar(tarefa.id);
    if (!restaurada) return erro(res, 500, "Não foi possível restaurar a tarefa.");
    res.json(formatar(restaurada));
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Erro ao desfazer.";
    return erro(res, 404, mensagem);
  }
});

// Listar e criar tarefas
app.get("/api/tarefas", (req, res) => {
  const q = `%${String(req.query.q ?? "")}%`;
  const tarefas = db.prepare(
    SQL_LISTA + " WHERE t.titulo LIKE ? ORDER BY t.concluida, t.id DESC"
  ).all(q) as LinhaTarefa[];
  res.json(tarefas.map(formatar));
});

app.post("/api/tarefas", (req, res) => {
  try {
    const tarefa = criarTarefa(req.body as DadosTarefa);
    const resultado = db.prepare(`
      INSERT INTO tarefas (titulo, descricao, prioridade, categoria_id)
      VALUES (?, ?, ?, ?)
    `).run(tarefa.titulo, tarefa.descricao, tarefa.prioridade, tarefa.categoria_id);

    const criada = buscar(Number(resultado.lastInsertRowid));
    if (!criada) return erro(res, 500, "Não foi possível criar a tarefa.");
    res.status(201).json(formatar(criada));
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Dados inválidos.";
    return erro(res, 400, mensagem);
  }
});

// Consultar, editar, concluir e excluir tarefa por ID
app.get("/api/tarefas/:id", (req, res) => {
  const tarefa = buscar(Number(req.params.id));
  if (!tarefa) return erro(res, 404, "Tarefa não encontrada.");
  res.json(formatar(tarefa));
});

app.put("/api/tarefas/:id", (req, res) => {
  const id = Number(req.params.id);
  const atual = buscar(id);
  if (!atual) return erro(res, 404, "Tarefa não encontrada.");

  try {
    const tarefa = criarTarefa({
      ...(req.body as DadosTarefa),
      id,
      concluida: atual.concluida
    });
    db.prepare(`
      UPDATE tarefas
      SET titulo = ?, descricao = ?, prioridade = ?, categoria_id = ?
      WHERE id = ?
    `).run(tarefa.titulo, tarefa.descricao, tarefa.prioridade, tarefa.categoria_id, id);

    const atualizada = buscar(id);
    if (!atualizada) return erro(res, 500, "Não foi possível atualizar a tarefa.");
    res.json(formatar(atualizada));
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Dados inválidos.";
    return erro(res, 400, mensagem);
  }
});

app.patch("/api/tarefas/:id/concluir", (req, res) => {
  const id = Number(req.params.id);
  const atual = buscar(id);
  if (!atual) return erro(res, 404, "Tarefa não encontrada.");

  db.prepare("UPDATE tarefas SET concluida = 1 - concluida WHERE id = ?").run(id);
  const atualizada = buscar(id);
  if (!atualizada) return erro(res, 500, "Não foi possível atualizar a tarefa.");
  res.json(formatar(atualizada));
});

app.delete("/api/tarefas/:id", (req, res) => {
  const id = Number(req.params.id);
  const atual = buscar(id);
  if (!atual) return erro(res, 404, "Tarefa não encontrada.");

  const { categoria: _categoria, ...dados } = atual;
  excluidas.empilhar(dados);
  db.prepare("DELETE FROM tarefas WHERE id = ?").run(id);
  res.json({ mensagem: "Tarefa excluída.", pilha: excluidas.tamanho() });
});

// Tratamento de rotas inexistentes da API
app.use("/api", (_req, res) => erro(res, 404, "Rota não encontrada."));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError) return erro(res, 400, "JSON inválido.");
  console.error(err);
  return erro(res, 500, "Erro interno do servidor.");
});

iniciarBanco();
app.listen(PORTA, "127.0.0.1", () => {
  console.log(`Servidor em http://127.0.0.1:${PORTA}`);
});
