import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExchangeRatesService } from './exchange-rates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('exchange-rates')
@Controller('exchange-rates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get()
  @ApiOperation({ summary: 'List exchange rates' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.exchangeRatesService.findAll(page, limit);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current exchange rate' })
  async getCurrent() {
    return this.exchangeRatesService.getCurrent();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exchange rate by ID' })
  async findById(@Param('id') id: string) {
    return this.exchangeRatesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create exchange rate' })
  async create(@Body() body: {
    vesPerUsd: number;
    usdPerVes: number;
    source: string;
  }, @Request() req) {
    return this.exchangeRatesService.create({
      ...body,
      createdById: req.user.sub,
    });
  }

  @Post('manual')
  @ApiOperation({ summary: 'Create manual exchange rate' })
  async createManual(@Body() body: {
    vesPerUsd: number;
    usdPerVes: number;
    source: string;
  }, @Request() req) {
    return this.exchangeRatesService.createManual({
      ...body,
      createdById: req.user.sub,
    });
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert amount between currencies' })
  async convert(@Body() body: {
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    rateId?: string;
  }) {
    return this.exchangeRatesService.convert(
      body.amount,
      body.fromCurrency,
      body.toCurrency,
      body.rateId,
    );
  }
}
