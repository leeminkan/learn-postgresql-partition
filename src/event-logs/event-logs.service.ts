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
