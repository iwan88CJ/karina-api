import { Controller, Get, Param, ParseIntPipe, StreamableFile } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller()
export class ApiController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  index() {
    return {
      name: 'Katarina Bluu API',
      version: '1.0.0',
      description: 'REST API биографии и галереи Карины',
      endpoints: [
        { method: 'GET', path: '/', description: 'Информация об API' },
        { method: 'GET', path: '/info', description: 'Биография Карины' },
        { method: 'GET', path: '/image', description: 'Список изображений с метаданными и ссылками' },
        { method: 'GET', path: '/image/:id', description: 'Изображение в формате image/webp' },
      ],
    };
  }

  @Get('info')
  info() {
    return this.database.getInfo();
  }

  @Get('image')
  images() {
    return this.database.getImages();
  }

  @Get('image/:id')
  image(@Param('id', ParseIntPipe) id: number) {
    const image = this.database.getImage(id);
    return new StreamableFile(Buffer.from(image.content), {
      type: 'image/webp',
      disposition: `inline; filename="${image.filename}"`,
      length: image.content.byteLength,
    });
  }
}
