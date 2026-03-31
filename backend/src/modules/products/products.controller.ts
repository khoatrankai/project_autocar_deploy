import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  UseGuards,
  ParseIntPipe,
  Delete,
  Req,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  FilterAdvanceProductDto,
  FilterProductDto,
} from './dto/filter-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';

// Auth Guards
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/auth/dto/auth.dto';
import { SupabaseGuard } from 'src/auth/supabase.guard';
import { DeleteManyDto } from './dto/delete-many.dto';
import { PosSearchProductDto } from './dto/pos-search-product.dto';

@ApiTags('Products')
@Controller('products')
// @UseGuards(SupabaseGuard, RolesGuard) // Bảo vệ toàn bộ Controller
// @ApiBearerAuth()
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  // 1. Tạo sản phẩm (Chỉ Admin hoặc Kho)
  @Post()
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE)
  @ApiOperation({ summary: 'Tạo sản phẩm mới (Kèm tồn kho & Xe tương thích)' })
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Get('stock-card/:id')
  getStockCard(@Param('id') id: string) {
    return this.service.getStockCard(id);
  }

  @Get('inventory-detail/:id')
  getInventoryDetail(@Param('id') id: string) {
    return this.service.getInventoryDetail(id);
  }

  @Get('brands')
  @ApiOperation({ summary: 'Lấy danh sách tất cả thương hiệu' })
  getBrands() {
    return this.service.getBrands();
  }
  // 2. Lấy danh sách (Ai cũng xem được, miễn là đã login)
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm (Phân trang & Tìm kiếm)' })
  findAll(@Query() query: FilterProductDto) {
    return this.service.findAll(query);
  }

  @Get('advance')
  @ApiOperation({
    summary: 'Lấy danh sách sản phẩm nâng cao (Phân trang & Tìm kiếm)',
  })
  findAllAdvance(@Query() query: FilterAdvanceProductDto) {
    return this.service.findAllAdvance(query);
  }

  // 3. Xem chi tiết
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết sản phẩm' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // 4. Cập nhật (Chỉ Admin hoặc Kho)
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE)
  @ApiOperation({ summary: 'Cập nhật thông tin sản phẩm' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete('multiple')
  @UseGuards(SupabaseGuard)
  @Roles(UserRole.ADMIN, UserRole.WAREHOUSE) // Chỉ Admin/Kho được xóa
  @ApiOperation({ summary: 'Xóa nhiều sản phẩm cùng lúc' })
  removeMultiple(@Body() dto: DeleteManyDto, @Req() req: any) {
    const userId = req.user?.id || '1';
    return this.service.removeMultiple(dto.ids, userId);
  }

  @Get('pos-search')
  async posSearch(@Query() query: PosSearchProductDto) {
    return this.service.posSearch(query);
  }

  @Put('brands/:oldName')
  async updateBrand(
    @Param('oldName') oldName: string,
    @Body('newName') newName: string,
  ) {
    const result = await this.service.updateBrand(oldName, newName);
    return { success: true, ...result };
  }

  @Delete('brands/:name')
  async deleteBrand(@Param('name') name: string) {
    const result = await this.service.deleteBrand(name);
    return { success: true, ...result };
  }

  @Post('clear-all')
  @UseGuards(SupabaseGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xóa sạch danh sách sản phẩm (Lưu backup 30 ngày)' })
  async clearAll(@Body('reason') reason: string, @Req() req: any) {
    // Lấy userId từ Guard hoặc DTO như đã xử lý ở các phần trước
    const userId = req.user?.id || '1';
    return await this.service.clearAllProductsWithBackup(userId, reason);
  }

  @Post('backup-manual')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Sao lưu thủ công các sản phẩm đã chọn' })
  async manualBackup(
    @Body() body: { ids: string[]; reason: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id || '1';
    return await this.service.backupProducts(body.ids, userId, body.reason);
  }

  @Post('clear-all')
  @Roles(UserRole.ADMIN) // Chỉ cho phép Admin thực hiện
  @ApiOperation({
    summary:
      'Xóa toàn bộ sản phẩm (Tạo bản sao lưu có thể khôi phục trong 30 ngày)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Lý do xóa toàn bộ sản phẩm',
          example: 'Cập nhật lại toàn bộ danh mục hàng hóa tháng 4',
        },
      },
      required: ['reason'],
    },
  })
  async clearAllProducts(@Body('reason') reason: string, @Req() req: any) {
    // Lấy ID người dùng từ request (nếu chưa có Auth guard, để mặc định là "1")
    const userId = req.user?.id || '1';

    // Đảm bảo có lý do
    const deleteReason = reason || 'Người dùng không nhập lý do';

    return await this.service.clearAllProductsWithBackup(userId, deleteReason);
  }
}
