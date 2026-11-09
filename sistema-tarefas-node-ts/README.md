# Sistema de tarefas — Node.js + TypeScript

Projeto adaptado da versão Python. Mantém a interface HTML/CSS/JavaScript, a API HTTP, o SQLite e os conceitos de POO.

## Requisitos
- Node.js 20 ou superior
- npm

## Instalação e execução

No terminal, dentro da pasta do projeto:

```bash
npm install
npm run dev
```

Acesse http://127.0.0.1:8000.

Para compilar e executar a versão compilada:

```bash
npm run build
npm start
```

O banco `tarefas.db` é criado automaticamente na raiz do projeto, junto com as categorias iniciais.

## Estrutura

```text
sistema-tarefas-node-ts/
├── src/
│   ├── banco.ts       # conexão e criação das tabelas SQLite
│   ├── modelos.ts     # Tarefa, TarefaUrgente e Pilha
│   └── servidor.ts    # servidor Express e rotas da API
├── static/
│   ├── index.html     # interface
│   ├── style.css      # estilos
│   └── app.js         # lógica do navegador
├── package.json
└── tsconfig.json
```

## Rotas da API

| Método | Rota | Função |
|---|---|---|
| GET | `/api/tarefas?q=texto` | Lista e pesquisa tarefas |
| GET | `/api/tarefas/:id` | Consulta uma tarefa |
| POST | `/api/tarefas` | Cadastra uma tarefa |
| PUT | `/api/tarefas/:id` | Edita uma tarefa |
| PATCH | `/api/tarefas/:id/concluir` | Alterna concluída/pendente |
| DELETE | `/api/tarefas/:id` | Exclui e guarda na pilha |
| POST | `/api/desfazer` | Restaura a última tarefa excluída |
| GET | `/api/categorias` | Lista categorias |
| POST | `/api/categorias` | Cadastra categoria |
| GET | `/api/pilha` | Informa quantas exclusões podem ser desfeitas |

## Conceitos de programação mantidos

- **Encapsulamento:** getters e setters validam título, descrição, prioridade e categoria.
- **Herança:** `TarefaUrgente` estende `Tarefa`.
- **Polimorfismo:** `TarefaUrgente` sobrescreve `rotulo()`.
- **Classe e objeto:** cada tarefa é representada por uma instância de `Tarefa`.
- **Pilha (LIFO):** `Pilha<T>` usa `push` e `pop` para desfazer exclusões na ordem inversa.
- **Banco relacional:** SQLite com chave primária, chave estrangeira e `JOIN`.
- **API REST:** Express recebe métodos HTTP e responde em JSON.

## Observação
A pilha de desfazer fica na memória do servidor. Se o servidor for reiniciado, o histórico de exclusões é perdido, assim como na versão original em Python.
