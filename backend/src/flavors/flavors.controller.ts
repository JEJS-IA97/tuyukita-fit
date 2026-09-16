import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FlavorsService } from './flavors.service';
import { CreateFlavorDto } from './dto/create-flavor.dto';
import { UpdateFlavorDto } from './dto/update-flavor.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('flavors')
@Controller('flavors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FlavorsController {
  constructor(private readonly flavorsService: FlavorsService) {}

  @Post(':productId')
  @ApiOperation({ summary: 'Create a flavor for a product' })
  async create(@Param('productId') productId: string, @Body() dto: CreateFlavorDto) {
    return this.flavorsService.create(productId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all flavors' })
  @ApiQuery({ name: 'productId', required: false })
  async findAll(@Query('productId') productId?: string) {
    return this.flavorsService.findAll(productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get flavor by ID' })
  async findById(@Param('id') id: string) {
    return this.flavorsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a flavor' })
  async update(@Param('id') id: string, @Body() dto: UpdateFlavorDto) {
    return this.flavorsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a flavor' })
  async deactivate(@Param('id') id: string) {
    return this.flavorsService.deactivate(id);
  }
}
