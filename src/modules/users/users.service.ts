import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateStorageUsed(userId: string, size: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        storageUsed: {
          increment: size,
        },
      },
    });
  }

  async getStorageInfo(userId: string) {
    const user = await this.findOne(userId);
    return {
      used: user.storageUsed,
      quota: user.storageQuota,
      available: Number(user.storageQuota) - Number(user.storageUsed),
      usagePercentage:
        (Number(user.storageUsed) / Number(user.storageQuota)) * 100,
    };
  }
}
