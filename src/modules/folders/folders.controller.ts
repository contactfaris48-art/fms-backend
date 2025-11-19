import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { FoldersService } from './folders.service';

@ApiTags('folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a folder' })
  create(@Body() body: any, @GetUser('id') userId: string) {
    return this.foldersService.create(body.name, userId, body.parentId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user folders' })
  findAll(@GetUser('id') userId: string) {
    return this.foldersService.findAll(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a folder' })
  delete(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.foldersService.delete(id, userId);
  }
}