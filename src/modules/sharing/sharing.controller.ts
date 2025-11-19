import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { SharingService } from './sharing.service';

@ApiTags('sharing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sharing')
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Post('files/:id/share')
  @ApiOperation({ summary: 'Generate share link for a file' })
  generateLink(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.sharingService.generateShareLink(id, userId);
  }

  @Get('validate/:token')
  @ApiOperation({ summary: 'Validate a share token' })
  validateLink(@Param('token') token: string) {
    return this.sharingService.validateShareLink(token);
  }
}