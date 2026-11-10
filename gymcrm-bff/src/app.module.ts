import { Module } from '@nestjs/common';
import { BffModule } from './api/bff.module';

@Module({ imports: [BffModule] })
export class AppModule {}
