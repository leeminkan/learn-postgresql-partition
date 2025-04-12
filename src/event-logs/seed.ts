import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';
import { eventLogs } from '../database/database-schema';

dotenv.config();

const configService = new ConfigService();

function generateSeedData(): Array<{
  eventType: string;
  payload: any;
  createdAt: Date;
}> {
  const seedData: Array<{
    eventType: string;
    payload: any;
    createdAt: Date;
  }> = [];
  const months = [1, 2, 3, 4]; // January to April
  const year = 2025;

  for (const month of months) {
    for (let i = 0; i < 1_000_000; i++) {
      const day = Math.floor(Math.random() * 28) + 1; // Random day between 1 and 28
      const hour = Math.floor(Math.random() * 24); // Random hour
      const minute = Math.floor(Math.random() * 60); // Random minute
      const second = Math.floor(Math.random() * 60); // Random second

      seedData.push({
        eventType: i % 2 === 0 ? 'user_login' : 'item_viewed', // Alternate event types
        payload: i % 2 === 0 ? { userId: `user${i}` } : { itemId: `item${i}` },
        createdAt: new Date(year, month - 1, day, hour, minute, second),
      });
    }
  }

  return seedData;
}

async function runSeed() {
  const pool = new Pool({
    host: configService.get<string>('POSTGRES_HOST'),
    port: configService.get<number>('POSTGRES_PORT'),
    user: configService.get<string>('POSTGRES_USER'),
    password: configService.get<string>('POSTGRES_PASSWORD'),
    database: configService.get<string>('POSTGRES_DB'),
    ssl: false,
  });
  const db = drizzle(pool); // No schema needed for simple insert

  console.log('Starting seeding...');

  const seedData = generateSeedData();
  const batchSize = 1000; // Adjust batch size as needed

  for (let i = 0; i < seedData.length; i += batchSize) {
    const batch = seedData.slice(i, i + batchSize);
    try {
      const dataToInsert = batch.map((event) => ({
        eventType: event.eventType,
        payload: event.payload,
        createdAt: event.createdAt, // Ensure it's a Date object
      }));

      console.log(
        `Inserting batch ${i / batchSize + 1} (${i} - ${i + batch.length})...`,
      );
      await db.insert(eventLogs).values(dataToInsert);
      console.log(`Batch ${i / batchSize + 1} inserted successfully.`);
    } catch (error) {
      console.error(
        `Failed to insert batch ${i / batchSize + 1} (${i} - ${i + batch.length}):`,
        error.message,
      );
    }
  }

  console.log('Seeding finished.');
  await pool.end();
}

runSeed().catch(console.error);
