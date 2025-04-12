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
