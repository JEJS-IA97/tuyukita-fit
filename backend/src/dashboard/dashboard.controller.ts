import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getSummary(startDate, endDate);
  }

  @Get('sales-by-month')
  @ApiOperation({ summary: 'Get sales by month' })
  @ApiQuery({ name: 'year', required: false })
  async getSalesByMonth(@Query('year') year?: number) {
    return this.dashboardService.getSalesByMonth(year);
  }

  @Get('expenses-by-month')
  @ApiOperation({ summary: 'Get expenses by month' })
  @ApiQuery({ name: 'year', required: false })
  async getExpensesByMonth(@Query('year') year?: number) {
    return this.dashboardService.getExpensesByMonth(year);
  }

  @Get('sales-by-flavor')
  @ApiOperation({ summary: 'Get sales by flavor' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSalesByFlavor(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getSalesByFlavor(startDate, endDate);
  }

  @Get('recent-transactions')
  @ApiOperation({ summary: 'Get recent transactions' })
  @ApiQuery({ name: 'limit', required: false })
  async getRecentTransactions(@Query('limit') limit?: number) {
    return this.dashboardService.getRecentTransactions(limit);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get business alerts' })
  async getAlerts() {
    return this.dashboardService.getAlerts();
  }
}
