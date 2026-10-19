"""Classes do sistema: Tarefa (entidade), TarefaUrgente (herança) e Pilha."""

PRIORIDADES = ("baixa", "media", "alta")


class Tarefa:
    """Entidade do sistema. Atributos 'privados' protegidos por propriedades
    (encapsulamento): ninguém cria uma tarefa inválida."""

    def __init__(self, titulo, descricao, prioridade, categoria_id,
                 concluida=False, id=None):
        self.id = id
        self.titulo = titulo            # passa pelo setter (validação)
        self.descricao = descricao
        self.prioridade = prioridade
        self.categoria_id = categoria_id
        self.concluida = concluida

    @property
    def titulo(self):
        return self._titulo

    @titulo.setter
    def titulo(self, valor):
        valor = (valor or "").strip()
        if not 3 <= len(valor) <= 80:
            raise ValueError("O título deve ter entre 3 e 80 caracteres.")
        self._titulo = valor

    @property
    def descricao(self):
        return self._descricao

    @descricao.setter
    def descricao(self, valor):
        valor = (valor or "").strip()
        if len(valor) > 300:
            raise ValueError("A descrição pode ter no máximo 300 caracteres.")
        self._descricao = valor

    @property
    def prioridade(self):
        return self._prioridade

    @prioridade.setter
    def prioridade(self, valor):
        if valor not in PRIORIDADES:
            raise ValueError("Prioridade deve ser: baixa, media ou alta.")
        self._prioridade = valor

    @property
    def categoria_id(self):
        return self._categoria_id

    @categoria_id.setter
    def categoria_id(self, valor):
        try:
            self._categoria_id = int(valor)
        except (TypeError, ValueError):
            raise ValueError("Escolha uma categoria.")

    def rotulo(self):
        return self.titulo

    def para_dict(self):
        return {"id": self.id, "titulo": self.titulo, "descricao": self.descricao,
                "prioridade": self.prioridade, "concluida": int(bool(self.concluida)),
                "categoria_id": self.categoria_id, "rotulo": self.rotulo()}


class TarefaUrgente(Tarefa):
    """Herança: reaproveita tudo de Tarefa e sobrescreve (polimorfismo) rotulo()."""

    def rotulo(self):
        return "[URGENTE] " + self.titulo


def criar_tarefa(dados):
    """Fábrica: escolhe a classe conforme a prioridade."""
    classe = TarefaUrgente if dados.get("prioridade") == "alta" else Tarefa
    return classe(dados.get("titulo"), dados.get("descricao", ""),
                  dados.get("prioridade", "media"), dados.get("categoria_id"),
                  bool(dados.get("concluida")), dados.get("id"))


class Pilha:
    """Estrutura LIFO (último a entrar, primeiro a sair), implementada sobre lista.
    Guarda as tarefas excluídas: 'Desfazer' restaura sempre a última excluída."""

    def __init__(self):
        self._itens = []

    def empilhar(self, item):
        self._itens.append(item)

    def desempilhar(self):
        if self.vazia():
            raise LookupError("Nada para desfazer.")
        return self._itens.pop()

    def vazia(self):
        return not self._itens

    def tamanho(self):
        return len(self._itens)
