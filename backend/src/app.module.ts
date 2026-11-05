import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { PaymentModule } from './infrastructure/payment/payment.module';
import { MailModule } from './infrastructure/mail/mail.module';

import { AuthModule } from './modules/auth/auth.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { PeopleModule } from './modules/people/people.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { TeamsModule } from './modules/teams/teams.module';
import { DesignationsModule } from './modules/designations/designations.module';
import { RolesModule } from './modules/roles/roles.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { WorkItemsModule } from './modules/work-items/work-items.module';
import { ClientsModule } from './modules/clients/clients.module';
import { TimeModule } from './modules/time/time.module';
import { LeaveModule } from './modules/leave/leave.module';
import { QualityModule } from './modules/quality/quality.module';
import { SLAModule } from './modules/sla/sla.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { RequestsModule } from './modules/requests/requests.module';
import { AssetsModule } from './modules/assets/assets.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { FilesModule } from './modules/files/files.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    StorageModule,
    PaymentModule,
    MailModule,
    AuthModule,
    WorkspacesModule,
    PeopleModule,
    DepartmentsModule,
    TeamsModule,
    DesignationsModule,
    RolesModule,
    ProjectsModule,
    TasksModule,
    WorkItemsModule,
    ClientsModule,
    TimeModule,
    LeaveModule,
    QualityModule,
    SLAModule,
    SubscriptionsModule,
    CommunicationModule,
    RequestsModule,
    AssetsModule,
    InventoryModule,
    FilesModule,
    PayrollModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
