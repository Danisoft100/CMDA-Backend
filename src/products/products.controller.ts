import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product' })
  @ApiBody({ type: CreateProductDto })
  create(@Body() createProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all products' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':slug')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a product by slug' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug);
  }

  @Patch(':slug')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product by its slug' })
  @ApiBody({ type: UpdateProductDto })
  update(@Param('slug') slug: string, @Body() updateProductDto) {
    return this.productsService.update(slug, updateProductDto);
  }

  @Delete(':slug')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product by its slug' })
  remove(@Param('slug') slug: string) {
    return this.productsService.remove(slug);
  }
}
