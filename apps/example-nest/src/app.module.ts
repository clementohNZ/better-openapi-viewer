import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { UsersController } from './users.controller.js';
import { ProductsController } from './products.controller.js';
import { OrdersController } from './orders.controller.js';
import { AuthController } from './auth.controller.js';
import { FilesController } from './files.controller.js';
import { AnalyticsController } from './analytics.controller.js';
import { NotificationsController } from './notifications.controller.js';
import { WebhooksController } from './webhooks.controller.js';
import { SettingsController } from './settings.controller.js';
import { SearchController } from './search.controller.js';
import { ReportsController } from './reports.controller.js';

@Module({
  controllers: [
    HealthController,
    UsersController,
    ProductsController,
    OrdersController,
    AuthController,
    FilesController,
    AnalyticsController,
    NotificationsController,
    WebhooksController,
    SettingsController,
    SearchController,
    ReportsController,
  ],
})
export class AppModule {}
