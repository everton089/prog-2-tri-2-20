# Sistema de Tarefas — aplicação web cliente-servidor

Python 3 (somente biblioteca padrão) + SQLite + HTML/CSS/JavaScript. Não precisa instalar nada.

## Como executar
```
python3 servidor.py
```
Abra http://127.0.0.1:8000 no navegador. O banco `tarefas.db` é criado sozinho na primeira execução.

## Estrutura
| Arquivo | Papel |
|---|---|
| `static/index.html`, `style.css`, `app.js` | **Cliente** (interface) |
| `servidor.py` | **Servidor** HTTP: rotas, validação, respostas |
| `modelos.py` | Classes `Tarefa`, `TarefaUrgente` e `Pilha` |
| `banco.py` | Conexão e criação das tabelas (SQLite) |

## 1. Arquitetura cliente-servidor
O navegador (cliente) carrega a página e, via `fetch`, envia requisições HTTP ao servidor. O servidor recebe a requisição, valida os dados (classe `Tarefa`), consulta ou altera o banco SQLite e devolve uma resposta JSON com um código de status. O cliente nunca acessa o banco: só o servidor faz isso.

Fluxo: `Formulário → fetch (HTTP) → servidor.py → modelos.py (valida) → SQLite → JSON → tabela na tela`

## 2. Rotas (endpoints)
| Método | Rota | Operação | Status |
|---|---|---|---|
| GET | `/` | Entrega a página | 200 |
| GET | `/api/tarefas?q=texto` | **READ** — lista (com JOIN) e busca | 200 |
| GET | `/api/tarefas/{id}` | **READ** — um registro | 200 / 404 |
| POST | `/api/tarefas` | **CREATE** | 201 / 400 |
| PUT | `/api/tarefas/{id}` | **UPDATE** — edita a tarefa | 200 / 400 / 404 |
| PATCH | `/api/tarefas/{id}/concluir` | **UPDATE** parcial — alterna feita/pendente | 200 / 404 |
| DELETE | `/api/tarefas/{id}` | **DELETE** — exclui e empilha | 200 / 404 |
| POST | `/api/desfazer` | Restaura a última excluída (pop da pilha) | 200 / 404 |
| GET | `/api/categorias`, `/api/pilha` | Apoio à interface | 200 |

## 3. Banco de dados
Duas tabelas: `categorias` (PK `id`) e `tarefas` (PK `id`, FK `categoria_id` → `categorias.id`).
Comandos usados: `CREATE TABLE`, `INSERT`, `SELECT ... JOIN`, `UPDATE`, `DELETE` (ver `banco.py` e `servidor.py`).

## 4. Demonstração do CRUD (roteiro para a apresentação)
1. **Create:** preencha o formulário e clique em *Adicionar tarefa*.
2. **Read:** a tarefa aparece na tabela; teste a busca.
3. **Update:** clique em *Editar*, mude algo e *Salvar alterações*; marque a caixa *Feita*.
4. **Delete:** clique em *Excluir*; depois em *Desfazer exclusão*.
5. Teste a validação: título com 2 letras mostra o erro vindo do servidor (400).

## 5. Classe explicada: `Tarefa` (`modelos.py`)
- **Atributos:** id, título, descrição, prioridade, categoria_id, concluída.
- **Métodos:** `rotulo()`, `para_dict()`.
- **Encapsulamento:** os atributos são guardados em `_titulo`, `_prioridade` etc. e só mudam por *properties* com validação (`@titulo.setter` rejeita título curto demais). Não existe objeto `Tarefa` inválido.
- **Herança:** `TarefaUrgente(Tarefa)` reaproveita tudo e sobrescreve `rotulo()` para acrescentar "[URGENTE]". A função `criar_tarefa` escolhe a classe pela prioridade.

## 6. Estrutura de dados: `Pilha` (LIFO)
Implementada sobre uma lista (`append` = empilhar, `pop` = desempilhar). Cada tarefa excluída vai para o topo; *Desfazer* restaura a **última** excluída — exatamente o comportamento LIFO, por isso a pilha faz sentido aqui (como o Ctrl+Z).
Diferença: fila é FIFO (o primeiro a entrar é o primeiro a sair, como uma fila de atendimento).

## 7. Revisão conceitual (resumo)
- **Função × procedimento:** função devolve valor (`return`); procedimento só executa ações. **Parâmetros** entram; **retorno** sai.
- **Recursão:** a função chama a si mesma; o **caso-base** é a condição que para as chamadas. Repetição usa laço (`for`/`while`) e não empilha chamadas.
- **Lista:** sequência indexada. **Pilha:** LIFO. **Fila:** FIFO.
- **POO:** classe é o molde; objeto é a instância; atributos são os dados; métodos são os comportamentos. Encapsulamento protege os dados; herança reaproveita uma classe.
- **Banco relacional:** dados em tabelas. **PK** identifica a linha; **FK** referencia a PK de outra tabela. **JOIN** combina linhas de tabelas relacionadas.
- **Cliente × servidor:** o cliente pede (navegador); o servidor processa e responde.
- **HTTP:** protocolo de requisição/resposta. GET lê, POST cria, PUT/PATCH altera, DELETE exclui. Status: 200 OK, 201 criado, 400 requisição inválida, 404 não encontrado, 405 método não permitido, 500 erro do servidor.
- **Front-end:** HTML semântico (`header`, `main`, `section`, `form`, `table`) dá significado à estrutura; seletores CSS escolhem os elementos a estilizar; Flexbox (uma dimensão) e Grid (duas dimensões) organizam o layout (ambos em `style.css`).
