const $ = (id) => document.getElementById(id);
let editandoId = null;

// Envia uma requisição HTTP ao servidor e devolve o JSON da resposta.
async function req(metodo, url, corpo) {
  const r = await fetch("/api" + url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || "Erro inesperado.");
  return dados;
}

function aviso(texto, ok = false) {
  $("aviso").textContent = texto;
  $("aviso").className = ok ? "ok" : "";
}

function avisoCategoria(texto, ok = false) {
  $("aviso-categoria").textContent = texto;
  $("aviso-categoria").className = ok ? "ok" : "";
}

function el(tag, texto, classe) {
  const e = document.createElement(tag);
  if (texto !== undefined) e.textContent = texto;   // textContent evita injeção de HTML
  if (classe) e.className = classe;
  return e;
}

function botao(texto, aoClicar, classe) {
  const b = el("button", texto, classe);
  b.type = "button";
  b.addEventListener("click", aoClicar);
  return b;
}


async function carregarCategorias() {
  const categorias = await req("GET", "/categorias");
  const select = $("categoria");
  const selecionada = select.value;
  select.replaceChildren();
  for (const c of categorias) {
    const o = el("option", c.nome);
    o.value = c.id;
    select.append(o);
  }
  if (categorias.some((c) => String(c.id) === selecionada)) {
    select.value = selecionada;
  }

  const lista = $("lista-categorias");
  lista.replaceChildren();
  for (const c of categorias) lista.append(el("li", c.nome));
  select.disabled = categorias.length === 0;
  $("salvar").disabled = categorias.length === 0;
}

async function listar() {
  const tarefas = await req("GET", "/tarefas?q=" + encodeURIComponent($("busca").value));
  const corpo = $("tabela");
  corpo.replaceChildren();
  $("vazio").hidden = tarefas.length > 0;
  for (const t of tarefas) {
    const tr = el("tr", undefined, t.concluida ? "feita" : "");
    const feita = el("td");
    const cx = el("input");
    cx.type = "checkbox";
    cx.checked = t.concluida;
    cx.setAttribute("aria-label", "Marcar como feita: " + t.titulo);
    cx.addEventListener("change", () => agir(() => req("PATCH", `/tarefas/${t.id}/concluir`)));
    feita.append(cx);

    const nome = el("td");
    nome.append(el("span", t.rotulo, "titulo-tarefa"));
    if (t.descricao) nome.append(el("small", t.descricao));

    const acoes = el("td", undefined, "acoes");
    acoes.append(
      botao("Editar", () => editar(t)),
      botao("Excluir", () => agir(() => req("DELETE", `/tarefas/${t.id}`)), "perigo")
    );
    tr.append(feita, nome, el("td", t.categoria),
              el("td", t.prioridade, "prioridade-" + t.prioridade), acoes);
    corpo.append(tr);
  }
  await atualizarPilha();
}

async function atualizarPilha() {
  const { tamanho } = await req("GET", "/pilha");
  $("desfazer").textContent = `Desfazer exclusão (${tamanho})`;
  $("desfazer").disabled = tamanho === 0;
}

async function agir(acao) {
  try { await acao(); aviso(""); await listar(); }
  catch (e) { aviso(e.message); }
}

function editar(t) {
  editandoId = t.id;
  $("titulo").value = t.titulo;
  $("descricao").value = t.descricao;
  $("prioridade").value = t.prioridade;
  $("categoria").value = t.categoria_id;
  $("titulo-form").textContent = "Editar tarefa";
  $("salvar").textContent = "Salvar alterações";
  $("cancelar").hidden = false;
  $("titulo").focus();
}

function limpar() {
  editandoId = null;
  $("form").reset();
  $("titulo-form").textContent = "Nova tarefa";
  $("salvar").textContent = "Adicionar tarefa";
  $("cancelar").hidden = true;
}

$("form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const dados = {
    titulo: $("titulo").value, descricao: $("descricao").value,
    prioridade: $("prioridade").value, categoria_id: $("categoria").value,
  };
  try {
    if (editandoId) await req("PUT", `/tarefas/${editandoId}`, dados);
    else await req("POST", "/tarefas", dados);
    aviso(editandoId ? "Tarefa atualizada." : "Tarefa adicionada.", true);
    limpar();
    await listar();
  } catch (e) { aviso(e.message); }
});

$("form-categoria").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const botaoSalvar = $("salvar-categoria");
  botaoSalvar.disabled = true;
  try {
    const nome = $("nome-categoria").value.trim();
    await req("POST", "/categorias", { nome });
    $("form-categoria").reset();
    avisoCategoria("Categoria cadastrada com sucesso.", true);
    await carregarCategorias();
  } catch (e) {
    avisoCategoria(e.message);
  } finally {
    botaoSalvar.disabled = false;
  }
});

$("cancelar").addEventListener("click", () => { limpar(); aviso(""); });
$("desfazer").addEventListener("click", () => agir(() => req("POST", "/desfazer")));
$("busca").addEventListener("input", () => agir(async () => {}));

(async () => {
  try {
    await carregarCategorias();
    await listar();
  } catch (e) {
    avisoCategoria("Não foi possível carregar as categorias: " + e.message);
  }
})();
