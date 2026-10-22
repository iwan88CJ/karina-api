import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import seed from './seed.json';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly db: DatabaseSync;

  constructor() {
    const path = process.env.DATABASE_PATH ?? resolve(__dirname, '../data/karina.sqlite');
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS info (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS images (
          id INTEGER PRIMARY KEY, filename TEXT NOT NULL UNIQUE,
          width INTEGER NOT NULL, height INTEGER NOT NULL, content BLOB NOT NULL
        );
        BEGIN;
      `);
      this.db.prepare('INSERT OR IGNORE INTO info (id, data) VALUES (1, ?)').run(JSON.stringify(seed.info));
      const exists = this.db.prepare('SELECT id FROM images WHERE id = ?');
      const insert = this.db.prepare('INSERT INTO images (id, filename, width, height, content) VALUES (?, ?, ?, ?, ?)');
      for (const image of seed.images) {
        if (exists.get(image.id)) continue;
        const content = readFileSync(resolve(__dirname, '../pictures', image.filename));
        insert.run(image.id, image.filename, image.width, image.height, content);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  getInfo(): unknown {
    const row = this.db.prepare('SELECT data FROM info WHERE id = 1').get() as { data: string };
    return JSON.parse(row.data);
  }

  getImages() {
    return this.db.prepare('SELECT id, filename, width, height, length(content) AS size FROM images ORDER BY id').all().map((row) => ({
      ...row,
      mimeType: 'image/webp',
      src: `/image/${row.id}`,
    }));
  }

  getImage(id: number) {
    const row = this.db.prepare('SELECT filename, content FROM images WHERE id = ?').get(id) as
      { filename: string; content: Uint8Array } | undefined;
    if (!row) throw new NotFoundException('Изображение не найдено');
    return row;
  }

  onModuleDestroy() {
    this.db.close();
  }
}
