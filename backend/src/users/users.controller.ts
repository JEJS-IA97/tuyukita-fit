import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Request() req, @Body() dto: UpdateUserDto) {
    return this.usersService.update(req.user.sub, dto);
  }
}
