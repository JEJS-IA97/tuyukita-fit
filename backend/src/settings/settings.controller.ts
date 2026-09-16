import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get business settings' })
  async get() {
    return this.settingsService.get();
  }

  @Patch()
  @ApiOperation({ summary: 'Update business settings' })
  async update(@Body() body: {
    businessName?: string;
    defaultCurrency?: string;
    defaultPackageQuantity?: number;
    defaultExchangeRateSource?: string;
  }) {
    return this.settingsService.update(body);
  }
}
