import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, Topping } from './product.entity';

@Controller('products')
export class ProductsController {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Topping) private readonly toppings: Repository<Topping>,
  ) {}

  @Get()
  findAll() {
    return this.products.find({
      where: { isActive: true },
      relations: { sizes: true },
      order: { id: 'ASC', sizes: { priceDelta: 'ASC' } },
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.products.findOne({
      where: { id, isActive: true },
      relations: { sizes: true },
      order: { sizes: { priceDelta: 'ASC' } },
    });
    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm ${id}`);
    const toppings = await this.toppings.find({ where: { isActive: true }, order: { id: 'ASC' } });
    return { ...product, toppings };
  }
}
