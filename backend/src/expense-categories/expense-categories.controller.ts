import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpenseCategoriesService } from './expense-categories.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('expense-categories')
@Controller('expense-categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an expense category' })
  async create(@Body() dto: CreateExpenseCategoryDto, @Request() req) {
    return this.expenseCategoriesService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List expense categories' })
  async findAll() {
    return this.expenseCategoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an expense category by ID' })
  async findById(@Param('id') id: string) {
    return this.expenseCategoriesService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense category' })
  async update(@Param('id') id: string, @Body() dto: UpdateExpenseCategoryDto) {
    return this.expenseCategoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense category that is not in use' })
  async remove(@Param('id') id: string) {
    return this.expenseCategoriesService.remove(id);
  }
}
