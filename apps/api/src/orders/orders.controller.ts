import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthUser, CurrentUser } from '../auth/auth.guard';
import { CreateOrderDto, UpdateStatusDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.sub, dto);
  }

  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.orders.findMine(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.orders.findOne(id, user);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.orders.updateStatus(id, user, dto.status);
  }
}
