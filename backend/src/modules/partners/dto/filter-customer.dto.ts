// src/modules/customers/dto/filter-customer.dto.ts
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class FilterCustomerDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  search?: string; // Tìm theo Tên, SĐT, Mã KH

  @IsOptional()
  groupName?: string; // Filter: Nhóm khách hàng

  @IsOptional()
  creatorId?: string; // Filter: Người tạo (assigned_staff_id)

  @IsOptional()
  startDate?: string; // Filter: Ngày tạo từ

  @IsOptional()
  endDate?: string; // Filter: Ngày tạo đến

  @IsOptional()
  status?: string; // Filter: Ngày tạo đến

  // Filter: Loại khách hàng (Theo hình: Cá nhân/Công ty)
  // Do model thiếu field này, ta có thể tận dụng 'type' hoặc 'group_name'
  // Ở đây mình để optional để bạn map tùy logic data
  @IsOptional()
  customerType?: string;
}
