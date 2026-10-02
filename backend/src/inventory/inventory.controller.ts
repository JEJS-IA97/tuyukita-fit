import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateInventoryOutputDto } from './dto/create-inventory-output.dto';
import { UpdateInventoryOutputDto } from './dto/update-inventory-output.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  @ApiOperation({ summary: 'Available stock per ingredient' })
  async getStock() {
    return this.inventoryService.getStock();
  }

  @Post('outputs')
  @ApiOperation({ summary: 'Register a manual output with FIFO consumption' })
  async registerOutput(
    @Body() dto: CreateInventoryOutputDto,
    @Request() req,
  ) {
    return this.inventoryService.registerOutput(dto, req.user.sub);
  }

  @Get('outputs/:id')
  @ApiOperation({ summary: 'Consult the FIFO consumption detail of an output' })
  async getOutputDetail(@Param('id') id: string) {
    return this.inventoryService.getOutputDetail(id);
  }

  @Patch('outputs/:id')
  @ApiOperation({ summary: 'Correct an output and recalculate FIFO' })
  async updateOutput(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryOutputDto,
    @Request() req,
  ) {
    return this.inventoryService.updateOutput(id, dto, req.user.sub);
  }

  @Delete('outputs/:id')
  @ApiOperation({ summary: 'Delete an output and replay FIFO' })
  async removeOutput(@Param('id') id: string, @Request() req) {
    return this.inventoryService.removeOutput(id, req.user.sub);
  }
}
