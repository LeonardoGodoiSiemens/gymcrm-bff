import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EnrollmentsProxyHandler } from '../application/features/enrollments-proxy/enrollments-proxy.handler';
import { EnrollmentBodyDto, EnrollmentUpdateBodyDto } from './dto/swagger.dto';

@ApiTags('enrollments (proxy -> MS Matrículas)')
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly handler: EnrollmentsProxyHandler) {}

  @Get()
  @ApiOperation({ summary: 'Lista matrículas' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.handler.list({ page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca matrícula por id' })
  @ApiResponse({ status: 404, description: 'Matrícula não encontrada' })
  get(@Param('id') id: string) { return this.handler.get(id); }

  @Post()
  @ApiOperation({ summary: 'Cria matrícula (o MS Matrículas publica o evento EnrollmentCreated)' })
  @ApiResponse({ status: 400, description: 'Dados inválidos (repassado do MS Matrículas)' })
  create(@Body() body: EnrollmentBodyDto) { return this.handler.create({ ...body }); }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza matrícula (trancar/cancelar via status)' })
  update(@Param('id') id: string, @Body() body: EnrollmentUpdateBodyDto) { return this.handler.update(id, { ...body }); }

  @Post(':id/renew')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renova a matrícula (estende a vigência em um período)' })
  @ApiResponse({ status: 400, description: 'Matrícula cancelada não pode ser renovada' })
  renew(@Param('id') id: string) { return this.handler.renew(id); }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove matrícula' })
  async remove(@Param('id') id: string): Promise<void> { await this.handler.remove(id); }
}
