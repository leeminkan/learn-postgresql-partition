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
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
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
