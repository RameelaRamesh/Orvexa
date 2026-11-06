import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsEnum, IsNumber } from 'class-validator';

export enum CalendarEventType {
  MEETING = 'MEETING',
  COMPANY_EVENT = 'COMPANY_EVENT',
  TASK = 'TASK',
  HOLIDAY = 'HOLIDAY',
  LEAVE = 'LEAVE',
  SHIFT = 'SHIFT',
  OTHER = 'OTHER',
}

export enum CalendarAudience {
  ALL = 'ALL',
  DEPARTMENT = 'DEPARTMENT',
  TEAM = 'TEAM',
  INDIVIDUALS = 'INDIVIDUALS',
}

export enum RsvpStatus {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  TENTATIVE = 'TENTATIVE',
  PENDING = 'PENDING',
}

export class CreateCalendarEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(CalendarEventType)
  @IsOptional()
  type?: CalendarEventType = CalendarEventType.MEETING;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsString()
  @IsOptional()
  locationUrl?: string;

  @IsNumber()
  @IsOptional()
  reminderMinutes?: number;

  @IsString()
  @IsOptional()
  recurrence?: string;

  @IsEnum(CalendarAudience)
  @IsOptional()
  audience?: CalendarAudience = CalendarAudience.INDIVIDUALS;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsArray()
  @IsOptional()
  participantIds?: string[];
}

export class UpdateCalendarEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(CalendarEventType)
  @IsOptional()
  type?: CalendarEventType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsString()
  @IsOptional()
  locationUrl?: string;

  @IsNumber()
  @IsOptional()
  reminderMinutes?: number;

  @IsString()
  @IsOptional()
  recurrence?: string;

  @IsEnum(CalendarAudience)
  @IsOptional()
  audience?: CalendarAudience;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsArray()
  @IsOptional()
  participantIds?: string[];

  @IsString()
  @IsOptional()
  status?: string;
}

export class RsvpDto {
  @IsEnum(RsvpStatus)
  @IsNotEmpty()
  status: RsvpStatus;
}

export class CreateCompanyHolidayDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isOptional?: boolean;

  @IsBoolean()
  @IsOptional()
  isWorkingDay?: boolean;
}
