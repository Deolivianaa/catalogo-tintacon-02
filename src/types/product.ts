export interface RawProduct {
  codigo: string;
  descricao: string;
  codigoClassificacao: string;
  classificacao: string;
  modelo: string;
  um: string;
  codigoBarras: string;
  codigoFabrica: string;
  codMarca: string;
  marca: string;
  cdln: string;
  linha: string;
  codFamilia: string;
  familia: string;
  cdtp: string;
  tipo: string;
  cdsb: string;
  subtipo: string;
  codigoFabricante: string;
  fabricante: string;
}

export interface ProductVariant {
  um: string;
  codigo: string;
  codigoBarras: string;
}

export interface Product extends RawProduct {
  id: string;
  variants: ProductVariant[];
}
