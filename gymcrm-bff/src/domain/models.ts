export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  minStock: number;
  lowStock: boolean;
  createdAt: string;
}

export interface Enrollment {
  id: number;
  studentName: string;
  studentEmail: string;
  planName: string;
  period: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  monthlyPrice: number;
  total: number;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

/** Resultado da Azure Function de enriquecimento financeiro. */
export interface Enrichment {
  enrollmentCount: number;
  grossTotal: number;
  discount: number;
  discountedTotal: number;
  gatewayFee: number;
  netTotal: number;
  monthlyRecurring: number;
}

export interface EnrichmentItem {
  period: Enrollment['period'];
  monthlyPrice: number;
}

export interface ListQuery {
  page?: number;
  limit?: number;
}

export type Payload = Record<string, unknown>;

export interface ServiceError {
  service: 'products' | 'enrollments' | 'enrichment';
  message: string;
}

export interface AggregatedData {
  products: Product[];
  /** Itens com saldo <= estoque mínimo (alerta RF07), derivados da lista de produtos. */
  lowStockProducts: Product[];
  enrollments: Enrollment[];
  enrichment: Enrichment | null;
  meta: { generatedAt: string; partial: boolean; errors: ServiceError[] };
}
