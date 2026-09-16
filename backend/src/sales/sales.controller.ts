import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('sales')
@Controller('sales')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a sale' })
  async create(@Body() dto: CreateSaleDto, @Request() req) {
    return this.salesService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List sales with filters' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'flavorId', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('productId') productId?: string,
    @Query('flavorId') flavorId?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.salesService.findAll({
      startDate,
      endDate,
      productId,
      flavorId,
      paymentStatus,
      page,
      limit,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get sales summary' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.getSummary(startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale by ID' })
  async findById(@Param('id') id: string) {
    return this.salesService.findById(id);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Add payment to sale' })
  async addPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.salesService.addPayment(id, dto);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get sale payments' })
  async getPayments(@Param('id') id: string) {
    return this.salesService.getPayments(id);
  }
}
