// src/modules/sales-targets/dto/set-kpi.dto.ts
import { IsUUID, IsInt, Min, Max, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetSalesTargetDto {
  @ApiProperty({
    description: 'Mã nhân viên (Phải là định dạng UUID)',
    example: 'd3b07384-d9a7-4b7b-9c61-0b5c1f5b0d6a',
  })
  @IsUUID(4, { message: 'Mã nhân viên (staffId) không đúng định dạng UUID' })
  staffId: string;

  @ApiProperty({
    description: 'Tháng áp dụng KPI (Từ 1 đến 12)',
    example: 2,
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1, { message: 'Tháng nhỏ nhất là 1' })
  @Max(12, { message: 'Tháng lớn nhất là 12' })
  month: number;

  @ApiProperty({
    description: 'Năm áp dụng KPI (Từ năm 2024 trở đi)',
    example: 2026,
    minimum: 2024,
  })
  @IsInt()
  @Min(2024, { message: 'Năm không hợp lệ' })
  year: number;

  @ApiProperty({
    description: 'Chỉ tiêu doanh thu cần đạt được trong tháng (VNĐ)',
    example: 50000000, // Ví dụ: 50 triệu
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Chỉ tiêu doanh thu không được nhỏ hơn 0' })
  targetRevenue: number;
}
