import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard.js';
import { CreateOrderDto, UpdateStatusDto } from './orders.dto.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** POST /orders – tạo đơn PENDING từ giỏ hàng, trả mã đơn (Task 6). */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.sub, dto);
  }

  /** GET /orders/me – lịch sử đơn của người đang đăng nhập (Task 9). */
  @Get('me')
  findMine(@CurrentUser() user: AuthUser) {
    return this.orders.findMine(user.sub);
  }

  /** GET /orders/:id – màn hình xác nhận / theo dõi đơn. */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.orders.findOne(id, user);
  }

  /** PATCH /orders/:id/status – đổi trạng thái theo state machine (Task 10a). */
  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Body() dto: UpdateStatusDto) {
    return this.orders.updateStatus(id, user, dto.status);
  }
}
