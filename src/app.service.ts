import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return {
      status: 'ok',
      message: 'File Management System API is running',
      timestamp: new Date().toISOString(),
    };
  }

  getDetailedHealth(): object {
    return {
      status: 'ok',
      message: 'File Management System API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      uptime: process.uptime(),
    };
  }
}