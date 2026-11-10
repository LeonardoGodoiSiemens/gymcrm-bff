import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductsProxyHandler } from '../application/features/products-proxy/products-proxy.handler';
import { ProductBodyDto } from './dto/swagger.dto';

@ApiTags('products (estoque - proxy -> MS Estoque)')
@Controller('products')
export class ProductsController {
  constructor(private readonly handler: ProductsProxyHandler) {}

  @Get()
  @ApiOperation({ summary: 'Lista produtos' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.handler.list({ page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca produto por id' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  get(@Param('id') id: string) { return this.handler.get(id); }

  @Post()
  @ApiOperation({ summary: 'Cria produto' })
  @ApiResponse({ status: 400, description: 'Dados inválidos (repassado do MS Estoque)' })
  create(@Body() body: ProductBodyDto) { return this.handler.create({ ...body }); }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza produto' })
  update(@Param('id') id: string, @Body() body: ProductBodyDto) { return this.handler.update(id, { ...body }); }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove produto' })
  async remove(@Param('id') id: string): Promise<void> { await this.handler.remove(id); }
}
