Alright, aspiring data architect! This is a great area to dive into. Handling large datasets efficiently is crucial, and PostgreSQL partitioning is a powerful tool for that. Combining it with NestJS and Drizzle ORM makes for a modern and robust backend.

Let's set up a task for you.

**Your Task: Implement Time-Based Partitioning for an Event Logging System**

**Scenario:** Imagine you're building a system that logs various user or system events (e.g., `user_login`, `item_viewed`, `order_placed`). This table can grow very large, very quickly. Querying recent events or managing old data (like archiving or deleting) becomes slow. Partitioning by time (e.g., monthly) can significantly improve performance and manageability.

**Goal:**

1.  Set up a NestJS project using Drizzle ORM to connect to a PostgreSQL database.
2.  Define an `EventLog` entity.
3.  Configure the `event_logs` table in PostgreSQL to be partitioned by month based on the `createdAt` timestamp.
4.  Implement a NestJS service and controller to create new event logs.
5.  Seed the database with sample data spanning a few months.
6.  Demonstrate how to query data efficiently (implicitly, by inserting and potentially querying).
7.  Show how to manually add a new partition for a future month.

**Tech Stack:**

- Node.js (latest LTS)
- NestJS
- Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- PostgreSQL (preferably run via Docker)
- `pg` (Node.js PostgreSQL driver)

---

**Let's Break It Down: Step-by-Step Guidance**

**Step 0: Prerequisites**

1.  **Install Tools:** Ensure you have Node.js, npm/yarn/ppnpm, and Docker installed.
2.  **Basic Knowledge:** Familiarity with TypeScript, NestJS fundamentals, basic SQL, and Docker is helpful.

**Step 1: Project Setup & Database**

1.  **Create NestJS Project:**
    ```bash
    npm i -g @nestjs/cli
    nest new learn-postgresql-partition
    cd learn-postgresql-partition
    ```
2.  **Install Dependencies:**
    ```bash
    pnpm install drizzle-orm pg
    pnpm install -D drizzle-kit dotenv @types/pg
    ```
3.  **Setup PostgreSQL with Docker:**

    - Create a `docker-compose.yml` file in your project root:

      ```yaml
      version: '3.8'

      services:
      postgres:
        image: postgres:latest
        container_name: postgres_container
        environment:
          POSTGRES_HOST: ${POSTGRES_HOST}
          POSTGRES_PORT: ${POSTGRES_PORT}
          POSTGRES_USER: ${POSTGRES_USER}
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
          POSTGRES_DB: ${POSTGRES_DB}
        ports:
          - '${POSTGRES_PORT}:${POSTGRES_PORT}'
        volumes:
          - postgres_data:/var/lib/postgresql/data

      volumes:
      postgres_data:
      ```

    - Run Docker Compose: `docker-compose up -d`
    - Verify connection using a tool like `psql` or DBeaver/pgAdmin.

4.  **Setup Environment Variables:**
    - Create a `.env` file:
      ```env
      POSTGRES_HOST=localhost
      POSTGRES_PORT=5432
      POSTGRES_USER=admin
      POSTGRES_PASSWORD=password
      POSTGRES_DB=test_db
      ```

**Step 2: Drizzle ORM Setup & Schema Definition**

1.  **Drizzle Configuration:**

    - Create a `drizzle.config.ts` file:

      ```typescript
      import { Config, defineConfig } from 'drizzle-kit';
      import { ConfigService } from '@nestjs/config';
      import { config } from 'dotenv';

      config();

      const configService = new ConfigService();

      export default defineConfig({
        schema: './src/database/database-schema.ts',
        out: './drizzle',
        dialect: 'postgresql',
        dbCredentials: {
          host: configService.get('POSTGRES_HOST'),
          port: configService.get('POSTGRES_PORT'),
          user: configService.get('POSTGRES_USER'),
          password: configService.get('POSTGRES_PASSWORD'),
          database: configService.get('POSTGRES_DB'),
          ssl: false,
        },
        migrations: {
          table: '__drizzle_migrations', // `__drizzle_migrations` by default
          schema: 'public', // used in PostgreSQL only, `drizzle` by default
        },
      } as Config);
      ```

2.  **Define Base Schema (`src/database/database-schema.ts`):**

    - Define the _structure_ of your `event_logs` table using Drizzle. Note that Drizzle ORM itself doesn't directly create partitioned tables _declaratively_ in the schema file (as of my last update, this usually requires raw SQL in migrations). We define the base table structure here.

      ```typescript
      // src/database/database-schema.ts
      import {
        pgTable,
        uuid,
        varchar,
        jsonb,
        timestamp,
        primaryKey,
      } from 'drizzle-orm/pg-core';

      export const eventLogs = pgTable(
        'event_logs',
        {
          id: uuid('id').defaultRandom().notNull(),
          eventType: varchar('event_type', { length: 50 }).notNull(),
          payload: jsonb('payload'),
          createdAt: timestamp('created_at', {
            mode: 'date',
            withTimezone: true,
          })
            .defaultNow()
            .notNull(),
        },
        (table) => {
          return {
            // Define the composite primary key here
            pk: primaryKey({ columns: [table.id, table.createdAt] }),
          };
        },
      );

      export const databaseSchema = {
        eventLogs,
      };

      // We will add the PARTITION BY clause using raw SQL in a migration.
      ```

3.  **Generate Initial Migration:**
    ```bash
    npx drizzle-kit generate --name setup-event-logss-table
    ```
    - This will create a migration file in `./drizzle/migrations`.

**Step 3: Create Partitioned Table & First Partition (SQL)**

1.  **Modify the Migration File:**

    - Open the generated SQL migration file (e.g., `./drizzle/migrations/0000_xyz.sql`).
    - **Crucially, modify the `CREATE TABLE` statement.** Drizzle generates a standard `CREATE TABLE`. You need to change it to create a _partitioned_ table and then add SQL to create the _first_ partition.

    - **Example Modification:** Replace the generated `CREATE TABLE event_logs (...)` with something like this:

      ```sql
      -- Create the main partitioned table (parent)
      CREATE TABLE IF NOT EXISTS "event_logs" (
          "id" uuid DEFAULT gen_random_uuid() NOT NULL,
          "event_type" varchar(50) NOT NULL,
          "payload" jsonb,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          PRIMARY KEY (id, created_at)
      ) PARTITION BY RANGE (created_at); -- Define partitioning strategy

      -- Create indexes (Primary key index is created automatically)
      -- Indexing the partition key separately is still often beneficial for range scans
      CREATE INDEX IF NOT EXISTS event_logs_created_at_idx ON event_logs (created_at);
      CREATE INDEX IF NOT EXISTS event_logs_event_type_idx ON event_logs (event_type);

      -- Create the first partitions (e.g., from April 2025)
      -- Let's assume today is 2025-04-12, so we create these partition
      CREATE TABLE IF NOT EXISTS event_logs_y2025m04 PARTITION OF event_logs
          FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
      CREATE TABLE IF NOT EXISTS event_logs_y2025m04 PARTITION OF event_logs
          FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');
      CREATE TABLE IF NOT EXISTS event_logs_y2025m04 PARTITION OF event_logs
          FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');
      CREATE TABLE IF NOT EXISTS event_logs_y2025m04 PARTITION OF event_logs
          FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');

      -- Optional: Create next month's partition proactively
      -- CREATE TABLE IF NOT EXISTS event_logs_y2025m05 PARTITION OF event_logs
      --     FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');
      ```

    - **Important:** Pay attention to the `PARTITION BY RANGE (created_at)` clause and the `CREATE TABLE ... PARTITION OF ... FOR VALUES FROM ... TO ...` syntax. The ranges must _not_ overlap. The upper bound is exclusive.

2.  **Apply the Migration:**
    ```bash
    npx drizzle-kit migrate
    ```
    - This executes the SQL in your migration file against the database.
    - Verify in `psql` or your DB tool:
      - `\d event_logs` (Should show it's a Partitioned table)
      - `\d+ event_logs` (Should show the partitions, like `event_logs_y2025m04`)

**Step 4: NestJS Implementation (Module, Service, Controller)**

1.  **Drizzle Module/Provider:**

    - Create a way to provide the Drizzle instance throughout your NestJS app.

    - `src/database/database.options.ts`:

      ```typescript
      export interface DatabaseOptions {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
      }
      ```

    - `src/database/database.module-definition.ts`:

      ```typescript
      import { ConfigurableModuleBuilder } from '@nestjs/common';
      import { DatabaseOptions } from './database-options';

      export const CONNECTION_POOL = 'CONNECTION_POOL';

      export const {
        ConfigurableModuleClass: ConfigurableDatabaseModule,
        MODULE_OPTIONS_TOKEN: DATABASE_OPTIONS,
      } = new ConfigurableModuleBuilder<DatabaseOptions>()
        .setClassMethodName('forRoot')
        .build();
      ```

    - `src/database/drizzle.service.ts`:

      ```typescript
      import { Inject, Injectable } from '@nestjs/common';
      import { Pool } from 'pg';
      import { CONNECTION_POOL } from './database.module-definition';
      import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
      import { databaseSchema } from './database-schema';

      @Injectable()
      export class DrizzleService {
        public db: NodePgDatabase<typeof databaseSchema>;
        constructor(@Inject(CONNECTION_POOL) private readonly pool: Pool) {
          this.db = drizzle(this.pool, { schema: databaseSchema });
        }
      }
      ```

    - `src/database/database.module.ts`:

      ```typescript
      import { Global, Module } from '@nestjs/common';
      import {
        ConfigurableDatabaseModule,
        CONNECTION_POOL,
        DATABASE_OPTIONS,
      } from './database.module-definition';
      import { DatabaseOptions } from './database-options';
      import { Pool } from 'pg';
      import { DrizzleService } from './drizzle.service';

      @Global()
      @Module({
        exports: [DrizzleService],
        providers: [
          DrizzleService,
          {
            provide: CONNECTION_POOL,
            inject: [DATABASE_OPTIONS],
            useFactory: (databaseOptions: DatabaseOptions) => {
              return new Pool({
                host: databaseOptions.host,
                port: databaseOptions.port,
                user: databaseOptions.user,
                password: databaseOptions.password,
                database: databaseOptions.database,
              });
            },
          },
        ],
      })
      export class DatabaseModule extends ConfigurableDatabaseModule {}
      ```

    - Import `DatabaseModule` in your `AppModule` (`src/app.module.ts`).

2.  **EventLog Module, Service, Controller:**

    - Generate using Nest CLI:
      ```bash
      nest g module event-logs
      nest g service event-logs --flat --no-spec
      nest g controller event-logs --flat --no-spec
      ```
    - `src/event-logs/dto/create-event-log.dto.ts`:

      ```typescript
      import { Type } from 'class-transformer';
      import { IsString, IsNotEmpty, IsObject, IsDate } from 'class-validator';

      export class CreateEventLogDto {
        @IsString()
        @IsNotEmpty()
        eventType: string;

        @IsObject()
        @IsNotEmpty()
        payload: Record<string, any>;

        @IsNotEmpty()
        @Type(() => Date)
        @IsDate()
        createdAt: Date;
      }
      ```

    - `src/event-logs/dto/update-event-log.dto.ts`:

      ```typescript
      import { Type } from 'class-transformer';
      import {
        IsString,
        IsNotEmpty,
        IsObject,
        IsOptional,
        IsDate,
      } from 'class-validator';

      export class UpdateEventLogDto {
        @IsString()
        @IsNotEmpty()
        @IsOptional()
        eventType?: string;

        @IsObject()
        @IsNotEmpty()
        @IsOptional()
        payload?: Record<string, any>;

        @IsOptional()
        @Type(() => Date)
        @IsDate()
        createdAt: Date;
      }
      ```

    - `src/event-logs/event-logs.service.ts`:

      ```typescript
      import { Injectable, NotFoundException } from '@nestjs/common';
      import { DrizzleService } from '../database/drizzle.service';
      import { databaseSchema } from '../database/database-schema';
      import { eq } from 'drizzle-orm';
      import { CreateEventLogDto } from './dto/create-event-log.dto';
      import { UpdateEventLogDto } from './dto/update-event-log.dto';

      @Injectable()
      export class EventLogsService {
        constructor(private readonly drizzleService: DrizzleService) {}

        getAll() {
          return this.drizzleService.db.select().from(databaseSchema.eventLogs);
        }

        async getById(id: number) {
          const eventLogs = await this.drizzleService.db
            .select()
            .from(databaseSchema.eventLogs)
            .where(eq(databaseSchema.eventLogs.id, id.toString()));
          const eventLog = eventLogs.pop();
          if (!eventLog) {
            throw new NotFoundException();
          }
          return eventLog;
        }

        async create(eventLog: CreateEventLogDto) {
          const createdEventLogs = await this.drizzleService.db
            .insert(databaseSchema.eventLogs)
            .values(eventLog)
            .returning();

          return createdEventLogs.pop();
        }

        async update(id: number, eventLog: UpdateEventLogDto) {
          const updatedEventLogs = await this.drizzleService.db
            .update(databaseSchema.eventLogs)
            .set(eventLog)
            .where(eq(databaseSchema.eventLogs.id, id.toString()))
            .returning();

          if (updatedEventLogs.length === 0) {
            throw new NotFoundException();
          }

          return updatedEventLogs.pop();
        }

        async delete(id: number) {
          const deletedEventLogs = await this.drizzleService.db
            .delete(databaseSchema.eventLogs)
            .where(eq(databaseSchema.eventLogs.id, id.toString()))
            .returning();

          if (deletedEventLogs.length === 0) {
            throw new NotFoundException();
          }
        }
      }
      ```

    - `src/event-logs/event-logs.controller.ts`:

      ```typescript
      import {
        Body,
        Controller,
        Delete,
        Get,
        Param,
        ParseIntPipe,
        Patch,
        Post,
      } from '@nestjs/common';
      import { EventLogsService } from './event-logs.service';
      import { CreateEventLogDto } from './dto/create-event-log.dto';
      import { UpdateEventLogDto } from './dto/update-event-log.dto';

      @Controller('event-logs')
      export class EventLogsController {
        constructor(private readonly eventLogsService: EventLogsService) {}

        @Get()
        getAll() {
          return this.eventLogsService.getAll();
        }

        @Get(':id')
        getById(@Param('id', ParseIntPipe) id: number) {
          return this.eventLogsService.getById(id);
        }

        @Post()
        create(@Body() eventLog: CreateEventLogDto) {
          return this.eventLogsService.create(eventLog);
        }

        @Patch(':id')
        update(
          @Param('id', ParseIntPipe) id: number,
          @Body() eventLog: UpdateEventLogDto,
        ) {
          return this.eventLogsService.update(id, eventLog);
        }

        @Delete(':id')
        async delete(@Param('id', ParseIntPipe) id: number) {
          await this.eventLogsService.delete(id);
        }
      }
      ```

    - Ensure `EventLogModule` imports `DatabaseModule` (or relies on it being global) and declares the controller/service.

**Step 5: Seed Data**

1.  **Create a Seeding Script (Optional but Recommended):**

    - You could create a simple standalone Node.js script or a NestJS command.
    - `src/event-logs/seed.ts` (example standalone script):

      ```typescript
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
              payload:
                i % 2 === 0 ? { userId: `user${i}` } : { itemId: `item${i}` },
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
      ```

    - Run it: `npx ts-node seed.ts` (you might need `ts-node` installed: `pnpm install -D ts-node`)

2.  **Or Use API:** Start your NestJS app (`pnpm start:dev`) and use `curl` or Postman to send POST requests to `/event-logs` with bodies like:
    ```json
    // POST /event-logs
    {
      "eventType": "user_signup",
      "payload": { "email": "test@example.com" },
      "createdAt": "2025-04-11T08:00:00Z" // Ensure this falls into an existing partition
    }
    ```

**Step 6: Run and Verify**

1.  **Start the App:** `pnpm start:dev`
2.  **Send Requests:** Use `curl` or Postman to send data for the month(s) you have created partitions for (e.g., April 2025).
3.  **Check Database:**

    - Use `psql`:

      ```sql
      psql -U user -d event_logs_db -h localhost -W --password

      -- Connect to the DB, then:
      SELECT * FROM event_logs; -- Should show all logs across partitions
      SELECT * FROM event_logs_y2025m04; -- Should show only April logs
      -- Try inserting data for May via API/Seed. It *should fail* if the partition doesn't exist.
      ```

    - Notice how inserting into the _parent_ table (`event_logs`) automatically routes the data to the correct partition based on `createdAt`.

**Step 7: Managing Partitions (Manual Creation)**

- Your application (or seeding script) will fail if you try to insert data for a time range where no partition exists. You need to create them _before_ they are needed.
- **Manually Create Next Partition (e.g., for May 2025):**

  - Connect using `psql` or run this SQL through a migration tool or script:

    ```sql
    -- Create partition for May 2025
    CREATE TABLE event_logs_y2025m05 PARTITION OF event_logs
        FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');

    -- Don't forget indexes if they weren't inherited or need specifics
    -- Often indexes are created on the parent and inherited. Check with \d event_logs_y2025m05
    ```

- **Automation (Beyond this Task):** In production, you'd automate this. Options include:
  - A cron job running a script monthly to create the next partition.
  - Using PostgreSQL extensions like `pg_partman`, which automates partition creation and management.
  - Database triggers (less common for time-based partition creation).

**Step 8: Understanding the Benefits (Querying)**

- Although we didn't implement a complex query endpoint, understand that when you query the parent table `event_logs` with a `WHERE` clause on the partition key (`createdAt`), PostgreSQL is smart enough to only scan the relevant partitions (this is called "partition pruning").
- **Example Query:**
  ```sql
  -- Query logs only for a few days in April 2025
  EXPLAIN ANALYZE -- Use EXPLAIN ANALYZE to see the query plan
  SELECT * FROM event_logs
  WHERE created_at >= '2025-04-05 00:00:00+00' AND created_at < '2025-04-10 00:00:00+00';
  ```
- The `EXPLAIN ANALYZE` output should show that it only scanned the `event_logs_y2025m04` partition, not others (if they existed). This is where the performance gain comes from, especially with many partitions.

---

**Final Words:**

This task gives you hands-on experience with a fundamental database scaling technique. You've seen how to:

1.  Define a partitioned table structure using SQL.
2.  Integrate it with NestJS and Drizzle ORM (Drizzle interacts transparently with the partitioned table once set up).
3.  Understand the necessity of managing partition creation.

The key takeaway is that while Drizzle handles the ORM mapping and queries nicely, the partitioning _setup_ and _maintenance_ (like creating new partitions) often involve direct SQL or specialized tools/scripts.

Good luck!
