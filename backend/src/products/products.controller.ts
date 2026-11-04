import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** GET /products – danh sách menu (Task 2). */
  @Get()
  findAll() {
    return this.products.findAll();
  }

  /** GET /products/:id – chi tiết + size + topping; id không phải số → 400, không có → 404. */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.products.findOne(id);
  }
}
