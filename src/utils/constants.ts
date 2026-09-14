import { SchedulePreset, JobGroupConfig, CommitteeConfig } from '../types';

export const SCHEDULE_PRESETS: Record<string, SchedulePreset> = {
  original: {
    id: 'original',
    label: '標準版本：8 節（08:00–17:00）',
    periods: [
      { p: 1, start: '08:00', end: '08:50' },
      { p: 2, start: '09:00', end: '09:50' },
      { p: 3, start: '10:00', end: '10:50' },
      { p: 4, start: '11:00', end: '11:50' },
      { p: 5, start: '13:10', end: '14:00' },
      { p: 6, start: '14:10', end: '15:00' },
      { p: 7, start: '15:10', end: '16:00' },
      { p: 8, start: '16:10', end: '17:00' },
    ],
  },
  b_school: {
    id: 'b_school',
    label: '7 節版本：7 節（08:10–16:20）',
    periods: [
      { p: 1, start: '08:10', end: '09:00' },
      { p: 2, start: '09:10', end: '10:00' },
      { p: 3, start: '10:10', end: '11:00' },
      { p: 4, start: '11:10', end: '12:00' },
      { p: 5, start: '13:20', end: '14:10' },
      { p: 6, start: '14:20', end: '15:10' },
      { p: 7, start: '15:30', end: '16:20' },
    ],
  },
  c_school: {
    id: 'c_school',
    label: '高中職常見：8 節（08:10–17:00）',
    periods: [
      { p: 1, start: '08:10', end: '09:00' },
      { p: 2, start: '09:10', end: '10:00' },
      { p: 3, start: '10:10', end: '11:00' },
      { p: 4, start: '11:10', end: '12:00' },
      { p: 5, start: '13:10', end: '14:00' },
      { p: 6, start: '14:10', end: '15:00' },
      { p: 7, start: '15:10', end: '16:00' },
      { p: 8, start: '16:10', end: '17:00' },
    ],
  },
};

export const WEEKDAYS: Record<number, string> = {
  1: '星期一',
  2: '星期二',
  3: '星期三',
  4: '星期四',
  5: '星期五',
};

export const WEEKDAY_SHORT: Record<number, string> = {
  1: '週一',
  2: '週二',
  3: '週三',
  4: '週四',
  5: '週五',
};

export const DEFAULT_JOB_GROUPS: JobGroupConfig[] = [
  {
    id: 'subject',
    label: '學科召集人',
    icon: 'BookOpen',
    chipClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    members: ['王小明', '張美玲', '林淑芬'],
  },
  {
    id: 'homeroom',
    label: '導師代表',
    icon: 'GraduationCap',
    chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    members: ['李大華', '黃志偉', '吳雅婷'],
  },
  {
    id: 'head',
    label: '科主任',
    icon: 'Briefcase',
    chipClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    members: ['陳建國', '蔡麗娟'],
  },
  {
    id: 'director',
    label: '行政主任',
    icon: 'Building2',
    chipClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    members: ['劉俊宏', '周文德'],
  },
  {
    id: 'section',
    label: '行政組長',
    icon: 'ClipboardList',
    chipClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    members: ['鄭明仁', '楊秀英'],
  },
];

export const DEFAULT_COMMITTEES: CommitteeConfig[] = [
  {
    id: 'curriculum',
    label: '課程發展委員會',
    members: ['王小明', '李大華', '陳建國', '劉俊宏', '鄭明仁'],
  },
  {
    id: 'gender',
    label: '性別平等教育委員會',
    members: ['張美玲', '林淑芬', '吳雅婷', '蔡麗娟'],
  },
  {
    id: 'special_ed',
    label: '特教推行委員會',
    members: ['黃志偉', '楊秀英', '周文德'],
  },
];
