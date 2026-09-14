export interface PeriodConfig {
  p: number;
  start: string;
  end: string;
}

export interface SchedulePreset {
  id: string;
  label: string;
  periods: PeriodConfig[];
}

export interface CourseEntry {
  wd: number; // 1: Monday, 2: Tuesday, ..., 5: Friday
  p: number;  // Period: 1, 2, ..., 8
  c: string;  // Course name, e.g. "國文"
  cls?: string; // Class name, e.g. "101"
}

export interface Teacher {
  id: number;
  name: string;
  entries: CourseEntry[];
}

export interface JobGroupConfig {
  id: string;
  label: string;
  icon: string;
  chipClass: string;
  members: string[];
}

export interface CommitteeConfig {
  id: string;
  label: string;
  members: string[];
}

export interface AppSettings {
  school: string;
  year: number;
  sem: number;
  schedulePreset: string;
}

export interface SlotResult {
  wd: number;
  p: number;
  free: number[]; // teacher ids
  busy: number[]; // teacher ids
}

export interface CommonQueryResult {
  common: SlotResult[];
  suggest: SlotResult[];
  selectedIds: number[];
  teacherMap: Record<number, string>;
  totalSelected: number;
}
