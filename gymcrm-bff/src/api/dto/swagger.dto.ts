import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTOs usados apenas para documentar o Swagger (a validação é feita pelos microsserviços). */
export class ProductBodyDto {
  @ApiProperty({ example: 'Whey Protein 900g' }) name: string;
  @ApiPropertyOptional({ example: 'Suplemento sabor chocolate' }) description?: string;
  @ApiProperty({ example: 149.9 }) price: number;
  @ApiProperty({ example: 10, description: 'Saldo atual em estoque' }) stock: number;
  @ApiPropertyOptional({ enum: ['SUPPLEMENT', 'ACCESSORY', 'APPAREL', 'MAINTENANCE', 'OTHER'], example: 'SUPPLEMENT' }) category?: string;
  @ApiPropertyOptional({ example: 5, description: 'Estoque mínimo (alerta quando saldo <= mínimo)' }) minStock?: number;
}

export class EnrollmentBodyDto {
  @ApiProperty({ example: 'Maria Souza' }) studentName: string;
  @ApiProperty({ example: 'maria@email.com' }) studentEmail: string;
  @ApiProperty({ example: 'Musculação + Aulas Coletivas' }) planName: string;
  @ApiProperty({ enum: ['MONTHLY', 'QUARTERLY', 'ANNUAL'], example: 'QUARTERLY' }) period: string;
  @ApiProperty({ example: 129.9 }) monthlyPrice: number;
  @ApiPropertyOptional({ example: '2026-11-01T00:00:00.000Z' }) startDate?: string;
}

export class EnrollmentUpdateBodyDto extends EnrollmentBodyDto {
  @ApiProperty({ enum: ['ACTIVE', 'FROZEN', 'CANCELLED'], example: 'FROZEN' }) status: string;
}

export class EnrichmentDto {
  @ApiProperty() enrollmentCount: number;
  @ApiProperty({ description: 'Mensalidade x meses do período, somados' }) grossTotal: number;
  @ApiProperty({ description: 'Desconto de fidelidade (trimestral/anual)' }) discount: number;
  @ApiProperty() discountedTotal: number;
  @ApiProperty({ description: 'Taxa do gateway de pagamento' }) gatewayFee: number;
  @ApiProperty({ description: 'Valor líquido após desconto e taxa' }) netTotal: number;
  @ApiProperty({ description: 'Receita recorrente mensal (MRR)' }) monthlyRecurring: number;
}

export class ServiceErrorDto {
  @ApiProperty({ enum: ['products', 'enrollments', 'enrichment'] }) service: string;
  @ApiProperty() message: string;
}

export class MetaDto {
  @ApiProperty({ example: '2026-11-03T12:00:00.000Z' }) generatedAt: string;
  @ApiProperty({ description: 'true se algum serviço falhou (resposta parcial)' }) partial: boolean;
  @ApiProperty({ type: [ServiceErrorDto] }) errors: ServiceErrorDto[];
}

export class AggregatedDataDto {
  @ApiProperty({ description: 'Itens de estoque (MS Estoque / MongoDB)', type: [Object] }) products: unknown[];
  @ApiProperty({ description: 'Itens com saldo <= estoque mínimo (alerta de reposição)', type: [Object] }) lowStockProducts: unknown[];
  @ApiProperty({ description: 'Matrículas (MS Matrículas / Azure SQL)', type: [Object] }) enrollments: unknown[];
  @ApiProperty({ description: 'Resultado financeiro da Azure Function (null se indisponível)', type: EnrichmentDto, nullable: true }) enrichment: EnrichmentDto | null;
  @ApiProperty({ type: MetaDto }) meta: MetaDto;
}
