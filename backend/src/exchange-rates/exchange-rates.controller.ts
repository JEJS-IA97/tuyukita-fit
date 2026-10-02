import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExchangeRatesService } from './exchange-rates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { type RateType } from './providers/rate-provider';

@ApiTags('exchange-rates')
@Controller('exchange-rates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  private toRateDto(row: {
    rateType: string;
    vesPerUsd: number;
    source: string;
    date: Date;
    fetchedAt: Date;
  }) {
    return {
      rateType: row.rateType,
      valueVesPerUsd: row.vesPerUsd,
      source: row.source,
      effectiveDate: row.date,
      fetchedAt: row.fetchedAt,
    };
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest valid BCV and USDT rates' })
  @ApiQuery({ name: 'type', required: false, enum: ['BCV', 'USDT'] })
  async getLatest(@Query('type') type?: string) {
    if (type !== undefined && type !== 'BCV' && type !== 'USDT') {
      throw new BadRequestException('type must be BCV or USDT');
    }

    if (type !== undefined) {
      const row = await this.exchangeRatesService.getLatestValid(
        type as RateType,
      );
      if (!row) {
        throw new NotFoundException(
          `No valid ${type} exchange rate has ever been registered`,
        );
      }
      return this.toRateDto(row);
    }

    const [bcv, usdt] = await Promise.all([
      this.exchangeRatesService.getLatestValid('BCV'),
      this.exchangeRatesService.getLatestValid('USDT'),
    ]);

    if (!bcv && !usdt) {
      throw new NotFoundException(
        'No valid exchange rate has ever been registered',
      );
    }

    return { bcv: bcv ? this.toRateDto(bcv) : null, usdt: usdt ? this.toRateDto(usdt) : null };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Fetch configured rate providers and persist snapshots' })
  async refresh() {
    return this.exchangeRatesService.refreshRates();
  }

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
