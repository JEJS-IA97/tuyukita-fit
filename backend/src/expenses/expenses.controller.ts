import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an expense' })
  async create(@Body() dto: CreateExpenseDto, @Request() req) {
    return this.expensesService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses with filters' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.expensesService.findAll({
      startDate,
      endDate,
      category,
      paymentStatus,
      page,
      limit,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get expenses summary' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expensesService.getSummary(startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  async findById(@Param('id') id: string) {
    return this.expensesService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateExpenseDto>) {
    return this.expensesService.update(id, dto);
  }
}
