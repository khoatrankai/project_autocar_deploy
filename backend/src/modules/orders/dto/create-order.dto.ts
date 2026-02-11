import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

// 1. DTO Item (Giữ nguyên)
export class CreateOrderItemDto {
  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @IsNumber()
  product_id: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 150000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}

// 2. DTO Order (Cập nhật thêm)
export class CreateOrderDto {
  @ApiPropertyOptional({ example: 'ORD-AUTO' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 10 })
  @IsNotEmpty()
  @IsNumber()
  partner_id: number;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  warehouse_id: number;

  @ApiPropertyOptional({ example: 'uuid-user' })
  @IsOptional()
  @IsUUID()
  staff_id?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  note?: string;

  // --- CÁC TRƯỜNG THANH TOÁN MỚI ---
  @ApiPropertyOptional({
    example: 0,
    description: 'Giảm giá trực tiếp trên đơn',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ example: 500000, description: 'Số tiền khách thực đưa' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  paid_amount: number;

  @ApiPropertyOptional({
    example: 'cash',
    description: 'cash | transfer | card',
  })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
