import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Delete,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
// import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/auth/dto/auth.dto';
import { SupabaseGuard } from 'src/auth/supabase.guard';
@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Post()
  @ApiBearerAuth() // <--- Hiện ổ khóa trên Swagger
  @UseGuards(SupabaseGuard, RolesGuard) // Chạy AuthGuard trước để lấy user, rồi chạy RolesGuard
  @Roles(UserRole.ADMIN) // <--- Chỉ định: Phải là ADMIN mới được vào
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Get('advance')
  findAllAdvance() {
    return this.service.findAllAdvance();
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  // ==========================================
  // 4. CẬP NHẬT DANH MỤC
  // ==========================================
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: any, // Thay 'any' bằng 'UpdateCategoryDto' nếu có
  ) {
    const result = await this.service.update(id, updateCategoryDto);
    return {
      success: true,
      message: 'Cập nhật danh mục thành công',
    };
  }
  // ==========================================
  // 5. XÓA DANH MỤC
  // ==========================================
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.service.remove(id);
    return {
      success: true,
      message: 'Đã xóa danh mục an toàn',
    };
  }
}
