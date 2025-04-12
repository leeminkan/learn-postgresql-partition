import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { CanBeUndefined } from '../../utils/can-be-undefined';

export class UpdateArticleDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string;

  @IsString()
  @IsNotEmpty()
  @CanBeUndefined()
  title?: string;
}
