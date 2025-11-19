import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FoldersService {
  constructor(private prisma: PrismaService) {}

  // TODO: Implement folder creation
  async create(name: string, userId: string, parentId?: string) {
    return { message: 'Folder creation - to be implemented' };
  }

  // TODO: Implement folder listing
  async findAll(userId: string, parentId?: string) {
    return this.prisma.folder.findMany({
      where: {
        ownerId: userId,
        ...(parentId ? { parentId } : { isRoot: true }),
      },
    });
  }

  // TODO: Implement folder deletion
  async delete(folderId: string, userId: string) {
    return { message: 'Folder deletion - to be implemented' };
  }
}
