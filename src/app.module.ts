import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { DatabaseService } from './database.service';

@Module({ controllers: [ApiController], providers: [DatabaseService] })
export class AppModule {}
