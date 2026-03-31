import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
  Put,
  Delete,
  // Req, // Dùng cái này nếu có Auth thật
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { SupabaseGuard } from 'src/auth/supabase.guard';

// Giả sử bạn có AuthGuard
// import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
// import { CurrentUser } from 'src/common/decorators/current-user.decorator';

interface UserPayload {
  id: string;
  role: string;
}

@ApiTags('Orders (Đơn hàng)')
@Controller('orders')
// @UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // -------------------------------------------------------
  // 1. Tạo đơn hàng (Logic phức tạp: Check nợ, Check kho, Transaction)
  // -------------------------------------------------------

  @Get('stock-card/:productId')
  async getStockCard(@Param('productId') productId: string) {
    return this.ordersService.getProductStockCard(productId);
  }

  @Post()
  @ApiBearerAuth() // <--- Hiện ổ khóa trên Swagger
  @UseGuards(SupabaseGuard) // <--- Kích hoạt bảo vệ
  @ApiOperation({ summary: 'Tạo đơn hàng mới (Bán hàng)' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req,
    // @CurrentUser() user: UserPayload, // Lấy user từ Token
  ) {
    // --- MOCK USER ID (Xóa khi dùng Auth thật) ---
    // Giả sử nhân viên đang login có ID này
    const currentUserId = req?.user?.id;
    // Nếu trong DTO có gửi staff_id (Admin tạo hộ), Service đã ưu tiên lấy staff_id trong DTO

    return this.ordersService.create(createOrderDto, currentUserId);
  }

  @Put(':id')
  @ApiBearerAuth() // <--- Hiện ổ khóa trên Swagger
  @UseGuards(SupabaseGuard) // <--- Kích hoạt bảo vệ
  @ApiOperation({
    summary: 'Cập nhật đơn hàng (Chỉ áp dụng cho đơn chưa Hoàn thành)',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateOrderDto>,
    @Req() req: any,
  ) {
    console.log(req.user);
    const userId = req.user.id;
    console.log(id, dto, userId);
    return await this.ordersService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa đơn hàng (Chỉ áp dụng cho đơn chưa Hoàn thành)',
  })
  async remove(@Param('id') id: string) {
    return await this.ordersService.remove(id);
  }

  @Post('delete-many')
  @ApiOperation({
    summary: 'Xóa nhiều đơn hàng cùng lúc (Chỉ xóa đơn chưa hoàn thành)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, example: ['1', '2'] },
      },
    },
  })
  async removeMany(@Body('ids') ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Danh sách ID không được để trống');
    }
    return await this.ordersService.removeMany(ids);
  }

  // -------------------------------------------------------
  // 2. Lấy danh sách đơn hàng
  // -------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng' })
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.findAll({ startDate, endDate });
  }

  @Get('daily-sales')
  async getDailySales(@Query('date') dateString: string) {
    if (!dateString)
      throw new BadRequestException(
        'Vui lòng truyền tham số date (YYYY-MM-DD)',
      );
    const targetDate = new Date(dateString);
    return await this.ordersService.getDailySales(targetDate);
  }

  @Get('revenue-and-profit')
  async getRevenueAndProfit(
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
    @Query('staffId') staffId?: string,
  ) {
    if (!startDateStr || !endDateStr) {
      throw new BadRequestException(
        'Yêu cầu startDate và endDate (YYYY-MM-DD)',
      );
    }
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Set thời gian để lấy trọn vẹn ngày cuối
    endDate.setHours(23, 59, 59, 999);

    return await this.ordersService.calculateRevenueAndProfit(
      startDate,
      endDate,
      staffId,
    );
  }

  @Get('payroll')
  async getDetailedPayroll(
    @Query('staffId') staffId: string,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
  ) {
    if (!staffId) throw new BadRequestException('Vui lòng truyền staffId');
    return await this.ordersService.calculateDetailedPayroll(
      staffId,
      month,
      year,
    );
  }

  @Get('debts/overdue')
  async getOverdueDebts(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return await this.ordersService.getOverdueDebts(days);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy đơn hàng' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
}
