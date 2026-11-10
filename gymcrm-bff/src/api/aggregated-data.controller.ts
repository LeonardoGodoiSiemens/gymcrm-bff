import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetAggregatedDataHandler } from '../application/features/aggregated-data/get-aggregated-data.handler';
import { AggregatedDataDto } from './dto/swagger.dto';

@ApiTags('aggregated-data')
@Controller('aggregated-data')
export class AggregatedDataController {
  constructor(private readonly handler: GetAggregatedDataHandler) {}

  @Get()
  @ApiOperation({
    summary: 'Dados agregados: Estoque (Mongo) + Matrículas (SQL) + Azure Function financeira',
    description:
      'Consulta os dois microsserviços em paralelo e a Azure Function (receita, desconto, taxa do gateway e MRR das matrículas ativas), devolvendo tudo em um único JSON, incluindo alertas de estoque baixo. ' +
      'Se algum serviço falhar, a resposta continua 200 com meta.partial = true e o detalhe em meta.errors.',
  })
  @ApiResponse({ status: 200, type: AggregatedDataDto })
  get() {
    return this.handler.execute();
  }
}
