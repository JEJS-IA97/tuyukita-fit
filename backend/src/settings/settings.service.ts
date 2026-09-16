import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    let settings = await this.prisma.businessSetting.findFirst();

    if (!settings) {
      settings = await this.prisma.businessSetting.create({
        data: {
          businessName: 'Yukita Fit',
          defaultCurrency: 'USD',
          defaultPackageQuantity: 8,
        },
      });
    }

    return settings;
  }

  async update(data: {
    businessName?: string;
    defaultCurrency?: string;
    defaultPackageQuantity?: number;
    defaultExchangeRateSource?: string;
  }) {
    const settings = await this.get();

    return this.prisma.businessSetting.update({
      where: { id: settings.id },
      data,
    });
  }
}
