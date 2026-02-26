import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Patch,
  Delete,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { FilterReturnDto } from './dto/filter-return.dto';

@ApiTags('Returns')
@Controller('returns')
export class ReturnsController {
  constructor(private readonly service: ReturnsService) {}

  @Post()
  create(@Body() dto: CreateReturnDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: FilterReturnDto) {
    return this.service.findAll(query);
  }
  // @Get()
  // findAll() {
  //   return this.service.findAll();
  // }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReturnDto: any) {
    return this.service.update(id, updateReturnDto);
  }

  @Delete('bulk') // Đặt trước :id để không bị nhầm route
  removeMany(@Body('ids') ids: string[]) {
    return this.service.removeMany(ids);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('process')
  async processReturn(
    @Body() data: CreateReturnDto,
    @Req() req: any, // Dùng Req để lấy thông tin user đang login
  ) {
    // Giả sử staff_id được gán vào req.user khi qua AuthGuard
    // Ví dụ: const staffId = req.user.id;
    // Tạm thời hardcode hoặc lấy từ body nếu chưa có Auth
    const staffId = req.user?.id || 'STAFF_ID_MAC_DINH';

    // Nếu bạn bắt BigInt từ JSON lên, hãy chắc chắn dto đã transform hoặc parse ở đây
    const parsedData = {
      ...data,
      partner_id: BigInt(data.partner_id),
      order_id: data.order_id ? BigInt(data.order_id) : undefined,
    };

    return await this.service.processReturnAndOffsetDebt(
      parsedData as any,
      staffId,
    );
  }
}
