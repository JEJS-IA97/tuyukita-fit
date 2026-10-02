import { Module } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRatesController } from './exchange-rates.controller';
import { BCV_RATE_PROVIDER, USDT_RATE_PROVIDER } from './exchange-rates.tokens';
import { createBcvProviderFromEnv } from './providers/bcv-rate-provider';
import { createUsdtProviderFromEnv } from './providers/usdt-rate-provider';

@Module({
  controllers: [ExchangeRatesController],
  providers: [
    ExchangeRatesService,
    {
      provide: BCV_RATE_PROVIDER,
      useFactory: () => {
        try {
          return createBcvProviderFromEnv(process.env);
        } catch {
          return null;
        }
      },
    },
    {
      provide: USDT_RATE_PROVIDER,
      useFactory: () => {
        try {
          return createUsdtProviderFromEnv(process.env);
        } catch {
          return null;
        }
      },
    },
  ],
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
