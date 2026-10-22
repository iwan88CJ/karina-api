const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');

test('API serves biography and original images from a persistent database', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'karina-api-'));
  process.env.DATABASE_PATH = join(directory, 'test.sqlite');
  let app;
  try {
    for (let run = 0; run < 2; run++) {
      app = await NestFactory.create(AppModule, { logger: false });
      await app.listen(0, '127.0.0.1');
      const base = await app.getUrl();
      const root = await fetch(base);
      assert.equal(root.status, 200);
      assert.equal((await root.json()).endpoints.length, 4);
      const info = await fetch(`${base}/info`);
      assert.equal(info.status, 200);
      assert.equal((await info.json()).title, 'Katarina Bluu');
      const listing = await fetch(`${base}/image`);
      assert.equal(listing.status, 200);
      const images = await listing.json();
      assert.equal(images.length, 20);
      for (const image of images) {
        const response = await fetch(`${base}${image.src}`);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), 'image/webp');
        const original = readFileSync(join(__dirname, '../pictures', image.filename));
        assert.equal(image.size, original.length);
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), original);
      }
      assert.equal((await fetch(`${base}/image/999`)).status, 404);
      assert.equal((await fetch(`${base}/image/invalid`)).status, 400);
      assert.equal((await fetch(`${base}/missing`)).status, 404);
      await app.close();
      app = undefined;
    }
  } finally {
    if (app) await app.close();
    delete process.env.DATABASE_PATH;
    rmSync(directory, { recursive: true, force: true });
  }
});
