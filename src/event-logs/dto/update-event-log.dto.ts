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
