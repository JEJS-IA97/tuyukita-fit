import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CashFlowService } from './cash-flow.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('cash-flow')
@Controller('cash-flow')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CashFlowController {
  constructor(private readonly cashFlowService: CashFlowService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get cash flow summary' })
  async getSummary() {
    return this.cashFlowService.getSummary();
  }

  @Get('movements')
  @ApiOperation({ summary: 'Get cash movements' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMovements(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.cashFlowService.getMovements({
      startDate,
      endDate,
      type,
      page,
      limit,
    });
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get cash accounts' })
  async getAccounts() {
    return this.cashFlowService.getAccounts();
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Create a cash account' })
  async createAccount(@Body() body: {
    name: string;
    type: string;
    currency: string;
    openingBalance?: number;
  }) {
    return this.cashFlowService.createAccount(body);
  }

  @Post('adjustments')
  @ApiOperation({ summary: 'Create a cash adjustment' })
  async createAdjustment(@Body() body: {
    cashAccountId: string;
    amount: number;
    currency: string;
    description: string;
  }, @Request() req) {
    return this.cashFlowService.createAdjustment({
      ...body,
      movementDate: new Date(),
      createdById: req.user.sub,
    });
  }
}
