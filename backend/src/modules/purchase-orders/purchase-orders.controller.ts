import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  Request,
  Delete,
  Put,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseGuard } from 'src/auth/supabase.guard';
import { FilterPurchaseOrderDto } from './dto/filter-purchase-order.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/auth/dto/auth.dto';
import { DeleteManyPurchaseOrdersDto } from './dto/delete-many-purchase-order.dto';

@ApiTags('Purchase Orders (Quản lý Nhập hàng)')
@Controller('purchase-orders') // Endpoint: /purchase-orders
@UseGuards(SupabaseGuard) // Bảo vệ bằng Token
@ApiBearerAuth()
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  // ====================================================================
  // TẠO PHIẾU NHẬP MỚI
  // ====================================================================
  @Post()
  @ApiOperation({
    summary: 'Tạo phiếu nhập hàng và tự động cập nhật kho/công nợ',
  })
  async create(@Body() dto: CreatePurchaseOrderDto, @Request() req) {
    // user.sub chính là ID của nhân viên đang đăng nhập (lấy từ token Supabase)
    return await this.service.create(dto, req.user?.id);
  }

  // ====================================================================
  // LẤY DANH SÁCH PHIẾU NHẬP
  // ====================================================================
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách phiếu nhập (Hỗ trợ lọc, phân trang)',
  })
  async findAll(@Query() query: any) {
    return await this.service.findAll(query);
  }

  @Get('advance')
  @ApiOperation({ summary: 'Lấy danh sách phiếu nhập (Bộ lọc nâng cao)' })
  findAllAdvance(@Query() filter: FilterPurchaseOrderDto) {
    return this.service.findAllAdvance(filter);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin phiếu nhập hàng' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: any, // Nên tạo UpdatePurchaseOrderDto
    @Req() req: any,
  ) {
    const staffId = req.user.id; // Lấy ID nhân viên từ Token
    return await this.service.update(+id, updateDto, staffId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một phiếu nhập hàng' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.service.findOne(id);
  }

  @Delete()
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE) // Chỉ Admin/Thủ kho được xóa
  @ApiOperation({
    summary: 'Xóa nhiều phiếu nhập hàng (Chỉ xóa phiếu nháp/hủy)',
  })
  async deleteMany(@Body() dto: DeleteManyPurchaseOrdersDto) {
    return await this.service.deleteMany(dto.ids);
  }
}
