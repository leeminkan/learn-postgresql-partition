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
