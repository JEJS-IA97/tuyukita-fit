import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PackagingService } from './packaging.service';
import { CreatePackagingDto } from './dto/create-packaging.dto';
import { UpdatePackagingDto } from './dto/update-packaging.dto';
import { RegisterPurchaseDto } from './dto/register-purchase.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('packaging')
@Controller('packaging')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PackagingController {
  constructor(private readonly packagingService: PackagingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a packaging item' })
  async create(@Body() dto: CreatePackagingDto) {
    return this.packagingService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all packaging items' })
  async findAll() {
    return this.packagingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get packaging item by ID' })
  async findById(@Param('id') id: string) {
    return this.packagingService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a packaging item' })
  async update(@Param('id') id: string, @Body() dto: UpdatePackagingDto) {
    return this.packagingService.update(id, dto);
  }

  @Post(':id/purchases')
  @ApiOperation({ summary: 'Register packaging purchase' })
  async registerPurchase(@Param('id') id: string, @Body() dto: RegisterPurchaseDto) {
    return this.packagingService.registerPurchase(id, dto);
  }

  @Get(':id/purchases')
  @ApiOperation({ summary: 'Get packaging purchases' })
  async getPurchases(@Param('id') id: string) {
    return this.packagingService.getPurchases(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a packaging item' })
  async deactivate(@Param('id') id: string) {
    return this.packagingService.deactivate(id);
  }
}
