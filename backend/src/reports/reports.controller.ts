import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Sales report' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesReport(startDate, endDate);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Expenses report' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getExpensesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getExpensesReport(startDate, endDate);
  }

  @Get('gross-profit')
  @ApiOperation({ summary: 'Gross profit report' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getGrossProfitReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getGrossProfitReport(startDate, endDate);
  }

  @Get('available-money')
  @ApiOperation({ summary: 'Available money report' })
  async getAvailableMoneyReport() {
    return this.reportsService.getAvailableMoneyReport();
  }

  @Get('accounts-receivable')
  @ApiOperation({ summary: 'Accounts receivable report' })
  async getAccountsReceivableReport() {
    return this.reportsService.getAccountsReceivableReport();
  }

  @Get('pending-expenses')
  @ApiOperation({ summary: 'Pending expenses report' })
  async getPendingExpensesReport() {
    return this.reportsService.getPendingExpensesReport();
  }
}
