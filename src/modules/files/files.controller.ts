import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { FilesService } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  upload() {
    return { message: 'File upload endpoint - to be implemented' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all user files' })
  findAll(@GetUser('id') userId: string) {
    return this.filesService.findAll(userId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a file' })
  download(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.filesService.download(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  delete(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.filesService.delete(id, userId);
  }
}