export const PRIORIDADES = ["baixa", "media", "alta"] as const;
export type Prioridade = typeof PRIORIDADES[number];

export interface DadosTarefa {
  id?: number;
  titulo: string;
  descricao?: string;
  prioridade?: Prioridade;
  categoria_id: number | string;
  concluida?: boolean | number;
}

export class Tarefa {
  id?: number;
  private _titulo!: string;
  private _descricao!: string;
  private _prioridade!: Prioridade;
  private _categoriaId!: number;
  concluida: boolean;

  constructor(dados: DadosTarefa) {
    this.id = dados.id;
    this.titulo = dados.titulo;
    this.descricao = dados.descricao ?? "";
    this.prioridade = dados.prioridade ?? "media";
    this.categoria_id = dados.categoria_id;
    this.concluida = Boolean(dados.concluida);
  }

  get titulo(): string { return this._titulo; }
  set titulo(valor: string) {
    const texto = String(valor ?? "").trim();
    if (texto.length < 3 || texto.length > 80) {
      throw new Error("O título deve ter entre 3 e 80 caracteres.");
    }
    this._titulo = texto;
  }

  get descricao(): string { return this._descricao; }
  set descricao(valor: string) {
    const texto = String(valor ?? "").trim();
    if (texto.length > 300) {
      throw new Error("A descrição pode ter no máximo 300 caracteres.");
    }
    this._descricao = texto;
  }

  get prioridade(): Prioridade { return this._prioridade; }
  set prioridade(valor: Prioridade) {
    if (!PRIORIDADES.includes(valor)) {
      throw new Error("Prioridade deve ser: baixa, media ou alta.");
    }
    this._prioridade = valor;
  }

  get categoria_id(): number { return this._categoriaId; }
  set categoria_id(valor: number | string) {
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero <= 0) {
      throw new Error("Escolha uma categoria.");
    }
    this._categoriaId = numero;
  }

  rotulo(): string { return this.titulo; }

  para_dict() {
    return {
      id: this.id,
      titulo: this.titulo,
      descricao: this.descricao,
      prioridade: this.prioridade,
      concluida: this.concluida,
      categoria_id: this.categoria_id,
      rotulo: this.rotulo()
    };
  }
}

export class TarefaUrgente extends Tarefa {
  override rotulo(): string {
    return `[URGENTE] ${this.titulo}`;
  }
}

export function criarTarefa(dados: DadosTarefa): Tarefa {
  return dados.prioridade === "alta"
    ? new TarefaUrgente(dados)
    : new Tarefa(dados);
}

export class Pilha<T> {
  private itens: T[] = [];

  empilhar(item: T): void { this.itens.push(item); }

  desempilhar(): T {
    const item = this.itens.pop();
    if (item === undefined) throw new Error("Nada para desfazer.");
    return item;
  }

  vazia(): boolean { return this.itens.length === 0; }
  tamanho(): number { return this.itens.length; }
}
