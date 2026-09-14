import React, { useState, useMemo } from 'react';
import {
  Search,
  Check,
  X,
  SlidersHorizontal,
  Copy,
  Download,
  Calendar,
  Users,
  Grid,
  List,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { Teacher, JobGroupConfig, CommitteeConfig, CommonQueryResult, SchedulePreset } from '../types';
import { WEEKDAYS, WEEKDAY_SHORT } from '../utils/constants';
import { exportCommonQueryCSV, copyCommonQueryText } from '../utils/exportUtils';

interface CommonQueryTabProps {
  teachers: Teacher[];
  selectedTeacherIds: Set<number>;
  onToggleTeacher: (id: number) => void;
  onSelectTeachers: (ids: number[]) => void;
  onClearSelectedTeachers: () => void;
  jobGroups: JobGroupConfig[];
  committees: CommitteeConfig[];
  currentPreset: SchedulePreset;
  schoolName: string;
  semLabel: string;
  onSelectPersonalTeacher?: (teacherName: string) => void;
}

export const CommonQueryTab: React.FC<CommonQueryTabProps> = ({
  teachers,
  selectedTeacherIds,
  onToggleTeacher,
  onSelectTeachers,
  onClearSelectedTeachers,
  jobGroups,
  committees,
  currentPreset,
  schoolName,
  semLabel,
  onSelectPersonalTeacher,
}) => {
  // Search input for teacher list
  const [searchTerm, setSearchTerm] = useState('');

  // Exclusion filters
  const [exP1, setExP1] = useState(false);
  const [exP8, setExP8] = useState(false);
  const [excludedDays, setExcludedDays] = useState<Set<number>>(new Set());
  const [minAttendance, setMinAttendance] = useState<string>('');

  // View mode: 'list' or 'matrix'
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');

  // Query calculation state
  const [hasQueried, setHasQueried] = useState(false);
  const [copyNotification, setCopyNotification] = useState(false);

  // Selected teacher objects
  const selectedTeachers = useMemo(() => {
    return teachers.filter((t) => selectedTeacherIds.has(t.id));
  }, [teachers, selectedTeacherIds]);

  // Fast search filtered teacher list
  const filteredTeachers = useMemo(() => {
    if (!searchTerm.trim()) return teachers;
    const kw = searchTerm.trim().toLowerCase();
    return teachers.filter((t) => t.name.toLowerCase().includes(kw));
  }, [teachers, searchTerm]);

  // Map for fast course lookup: `${teacherId}-${wd}-${p}` -> array of courses
  const courseLookup = useMemo(() => {
    const map: Record<string, Array<{ c: string; cls?: string }>> = {};
    teachers.forEach((t) => {
      t.entries.forEach((e) => {
        const key = `${t.id}-${e.wd}-${e.p}`;
        if (!map[key]) map[key] = [];
        map[key].push({ c: e.c, cls: e.cls });
      });
    });
    return map;
  }, [teachers]);

  // Busy slot lookup per teacher: teacherId -> Set(`${wd}-${p}`)
  const busyLookup = useMemo(() => {
    const map: Record<number, Set<string>> = {};
    teachers.forEach((t) => {
      const set = new Set<string>();
      t.entries.forEach((e) => {
        set.add(`${e.wd}-${e.p}`);
      });
      map[t.id] = set;
    });
    return map;
  }, [teachers]);

  // Period time map: period number -> 'start–end'
  const periodTimeMap = useMemo(() => {
    const map: Record<number, string> = {};
    currentPreset.periods.forEach((p) => {
      map[p.p] = `${p.start}–${p.end}`;
    });
    return map;
  }, [currentPreset]);

  // Has period 8?
  const hasPeriod8 = useMemo(() => {
    return currentPreset.periods.some((p) => p.p === 8);
  }, [currentPreset]);

  // Query calculation
  const queryResult: CommonQueryResult | null = useMemo(() => {
    if (!hasQueried || selectedTeacherIds.size === 0) return null;

    const ids: number[] = Array.from(selectedTeacherIds);
    const teacherMap: Record<number, string> = {};
    ids.forEach((id: number) => {
      const t = teachers.find((item) => item.id === id);
      if (t) teacherMap[id] = t.name;
    });

    const parsedMinAttendance = parseInt(minAttendance, 10) || ids.length;

    const allSlots: Array<{
      wd: number;
      p: number;
      free: number[];
      busy: number[];
    }> = [];

    for (let wd = 1; wd <= 5; wd++) {
      if (excludedDays.has(wd)) continue;

      for (const pConfig of currentPreset.periods) {
        const p = pConfig.p;
        if (exP1 && p === 1) continue;
        if (exP8 && p === 8) continue;

        const slotKey = `${wd}-${p}`;
        const free: number[] = [];
        const busy: number[] = [];

        ids.forEach((tid) => {
          if (busyLookup[tid] && busyLookup[tid].has(slotKey)) {
            busy.push(tid);
          } else {
            free.push(tid);
          }
        });

        allSlots.push({ wd, p, free, busy });
      }
    }

    // 100% common free slots
    const common = allSlots.filter((slot) => slot.busy.length === 0);

    // Suggested slots (attendance >= parsedMinAttendance)
    const suggest = allSlots
      .filter((slot) => slot.free.length >= parsedMinAttendance)
      .sort((a, b) => {
        if (b.free.length !== a.free.length) {
          return b.free.length - a.free.length;
        }
        // Priority for middle-of-day slots (Periods 2~4, then 5~7, then 1, then 8)
        const getPriority = (p: number) => {
          if (p >= 2 && p <= 4) return 0;
          if (p >= 5 && p <= 7) return 1;
          if (p === 1) return 2;
          return 3;
        };
        const prDiff = getPriority(a.p) - getPriority(b.p);
        if (prDiff !== 0) return prDiff;
        return a.wd - b.wd;
      });

    return {
      common,
      suggest,
      selectedIds: ids,
      teacherMap,
      totalSelected: ids.length,
    };
  }, [
    hasQueried,
    selectedTeacherIds,
    teachers,
    minAttendance,
    excludedDays,
    currentPreset,
    exP1,
    exP8,
    busyLookup,
  ]);

  // Group quick selection helper
  const handleSelectGroup = (memberNames: string[]) => {
    const matchedIds: number[] = [];
    teachers.forEach((t) => {
      if (memberNames.includes(t.name)) {
        matchedIds.push(t.id);
      }
    });
    if (matchedIds.length === 0) {
      alert('在此課表中找不到該群組所設定的教師姓名，請確認群組名單或課表內容。');
      return;
    }
    onSelectTeachers(matchedIds);
    setHasQueried(true);
  };

  const handleSelectAllAdmin = () => {
    const directorGroup = jobGroups.find((g) => g.id === 'director');
    const sectionGroup = jobGroups.find((g) => g.id === 'section');
    const names = [
      ...(directorGroup ? directorGroup.members : []),
      ...(sectionGroup ? sectionGroup.members : []),
    ];
    handleSelectGroup(names);
  };

  const handleToggleDayExclusion = (day: number) => {
    const next = new Set(excludedDays);
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
    }
    setExcludedDays(next);
  };

  const handleClearFilters = () => {
    setExP1(false);
    setExP8(false);
    setExcludedDays(new Set());
    setMinAttendance('');
  };

  const handleRunQuery = () => {
    if (selectedTeacherIds.size < 2) {
      alert('請在左側名單中至少勾選 2 位教師進行共同空堂比對！');
      return;
    }
    setHasQueried(true);
  };

  const handleCopy = () => {
    if (!queryResult) return;
    const text = copyCommonQueryText(queryResult, periodTimeMap, semLabel, schoolName);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopyNotification(true);
        setTimeout(() => setCopyNotification(false), 2500);
      })
      .catch(() => {
        window.prompt('請複製以下比對結果：', text);
      });
  };

  const handleExportCSV = () => {
    if (!queryResult) return;
    exportCommonQueryCSV(queryResult, teachers, periodTimeMap, semLabel, schoolName);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ── Left Column: Teacher Selection & Quick Groups ── */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
        {/* Quick Group Selection */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>⚡</span> 職務與會議群組快選
            </span>
            <button
              type="button"
              onClick={onClearSelectedTeachers}
              className="text-[11px] text-slate-500 hover:text-red-600 font-medium transition-colors"
            >
              清除已選
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {jobGroups.map((grp) => (
              <button
                key={grp.id}
                type="button"
                onClick={() => handleSelectGroup(grp.members)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all shadow-xs ${grp.chipClass}`}
                title={`包含：${grp.members.join('、') || '無'}`}
              >
                {grp.label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleSelectAllAdmin}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 transition-all shadow-xs"
            >
              🏢 全體行政
            </button>

            {committees.map((comm) => (
              <button
                key={comm.id}
                type="button"
                onClick={() => handleSelectGroup(comm.members)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 transition-all shadow-xs"
                title={`包含：${comm.members.join('、') || '無'}`}
              >
                🏛️ {comm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Teacher Search & List */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋教師姓名…"
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>
              已選 <b className="text-blue-600 font-bold text-xs">{selectedTeacherIds.size}</b> / 共 {teachers.length} 位
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const filteredIds = filteredTeachers.map((t) => t.id);
                  onSelectTeachers(filteredIds);
                  setHasQueried(true);
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                全選搜尋結果
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={onClearSelectedTeachers}
                className="text-slate-500 hover:text-red-600 font-medium"
              >
                全部取消
              </button>
            </div>
          </div>

          {/* Teacher Selection List */}
          <div className="h-72 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 divide-y divide-slate-100 custom-scrollbar">
            {filteredTeachers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">查無相符教師姓名</div>
            ) : (
              filteredTeachers.map((t) => {
                const isSelected = selectedTeacherIds.has(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      onToggleTeacher(t.id);
                      setHasQueried(true);
                    }}
                    className={`flex items-center justify-between px-3.5 py-2 cursor-pointer select-none text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-50/90 text-blue-900 font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>{t.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">
                        {t.entries.length} 節課
                      </span>
                      {onSelectPersonalTeacher && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPersonalTeacher(t.name);
                          }}
                          className="p-1 hover:text-blue-600 text-slate-400"
                          title="查看個人課表"
                        >
                          <BookOpen className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Teachers Tag Cloud */}
        {selectedTeachers.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>目前比對名單</span>
                <span className="text-blue-600 font-bold">({selectedTeachers.length})</span>：
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-400">點擊 × 可單獨移除</span>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={onClearSelectedTeachers}
                  className="text-red-500 hover:text-red-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  title="清空所有已選比對教師"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>全部清除</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
              {selectedTeachers.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs animate-in fade-in"
                >
                  {t.name}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleTeacher(t.id);
                      setHasQueried(true);
                    }}
                    className="hover:bg-blue-200 rounded-full p-0.5 text-blue-600 hover:text-blue-900 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Column: Conditions, Actions & Results ── */}
      <div className="lg:col-span-8 space-y-4">
        {/* Exclusion Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>時段排除與出席門檻</span>
            </div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-slate-500 hover:text-blue-600 font-medium"
            >
              重設所有條件
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {/* Period Exclusions */}
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={exP1}
                  onChange={(e) => setExP1(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>排除第 1 節</span>
              </label>

              {hasPeriod8 && (
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={exP8}
                    onChange={(e) => setExP8(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>排除第 8 節</span>
                </label>
              )}
            </div>

            {/* Weekday Exclusions */}
            <div className="sm:col-span-1 md:col-span-2 flex items-center flex-wrap gap-2">
              <span className="text-slate-500">排除星期：</span>
              {[1, 2, 3, 4, 5].map((d) => {
                const isExcluded = excludedDays.has(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleToggleDayExclusion(d)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all ${
                      isExcluded
                        ? 'bg-red-50 text-red-700 border-red-200 line-through'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                );
              })}
            </div>

            {/* Minimum Attendees */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500">最少可出席人數：</span>
              <input
                type="number"
                min="1"
                max={selectedTeacherIds.size || 100}
                value={minAttendance}
                onChange={(e) => setMinAttendance(e.target.value)}
                placeholder={`全部 (${selectedTeacherIds.size || '無'})`}
                className="w-20 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Action Controls & View Switch */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunQuery}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-sm transition-all"
            >
              <span>查詢共同空堂</span>
            </button>

            <button
              type="button"
              disabled={!queryResult}
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                !queryResult
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copyNotification ? '✅ 已複製文字' : '複製結果'}</span>
            </button>

            <button
              type="button"
              disabled={!queryResult}
              onClick={handleExportCSV}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                !queryResult
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出 CSV</span>
            </button>
          </div>

          {/* View mode toggle */}
          {queryResult && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>卡片清單</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'matrix'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>週課表矩陣</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Query Results Container ── */}
        {!hasQueried || selectedTeacherIds.size < 2 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">尚未選擇足夠教師進行比對</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              請在左側名單中勾選至少 2 位教師，或點擊「職務群組快選」（如學科召集人、全體行政）立即自動比對共同空堂。
            </p>
          </div>
        ) : !queryResult ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-xs text-slate-500">
            請點擊「查詢共同空堂」以顯示結果。
          </div>
        ) : (
          <div className="space-y-4">
            {/* Query Summary Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">查詢對象：</span>
                <span className="text-slate-600">
                  {Object.values(queryResult.teacherMap).join('、')}（共 {queryResult.totalSelected} 位）
                </span>
              </div>
              <div className="text-slate-500">
                完全共同空堂：
                <b className="text-emerald-700 font-bold ml-1">{queryResult.common.length}</b> 個時段
              </div>
            </div>

            {/* Status Alert */}
            {queryResult.common.length > 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  恭喜！找到 <b>{queryResult.common.length}</b> 個全員皆無課的「完全共同空堂」時段，適合安排全體會議或公開備課觀課。
                </span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-amber-900 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  所選教師群中沒有全員皆無課的時段。以下為可出席人數最多之「最佳替代時段」，供會議協調參考。
                </span>
              </div>
            )}

            {/* View Mode 1: Weekly Timetable Matrix */}
            {viewMode === 'matrix' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-x-auto">
                <div className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Grid className="w-4 h-4 text-blue-600" />
                  <span>全週空堂分佈熱度圖（點擊格子可查看該節空堂與有課教師名單）</span>
                </div>

                <table className="w-full text-center border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200 w-24">節次 / 時間</th>
                      {[1, 2, 3, 4, 5].map((d) => (
                        <th key={d} className="p-2 border-r last:border-r-0 border-slate-200">
                          {WEEKDAYS[d]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {currentPreset.periods.map((period) => {
                      const p = period.p;
                      return (
                        <tr key={p} className="hover:bg-slate-50/50">
                          <td className="p-2 border-r border-slate-200 bg-slate-50/60 text-slate-700 font-semibold">
                            <div>第 {p} 節</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {periodTimeMap[p]}
                            </div>
                          </td>

                          {[1, 2, 3, 4, 5].map((wd) => {
                            const isExcluded =
                              excludedDays.has(wd) || (exP1 && p === 1) || (exP8 && p === 8);

                            if (isExcluded) {
                              return (
                                <td
                                  key={wd}
                                  className="p-2 border-r last:border-r-0 border-slate-200 bg-slate-100 text-slate-400 text-[11px]"
                                >
                                  已排除
                                </td>
                              );
                            }

                            // Calculate for this cell
                            const slotKey = `${wd}-${p}`;
                            const freeCount = queryResult.selectedIds.filter(
                              (tid) => !busyLookup[tid] || !busyLookup[tid].has(slotKey)
                            ).length;
                            const total = queryResult.totalSelected;
                            const pct = Math.round((freeCount / total) * 100);

                            const isFullCommon = freeCount === total;
                            const isGoodSuggest = pct >= 75;

                            return (
                              <td
                                key={wd}
                                className={`p-2 border-r last:border-r-0 border-slate-200 transition-colors ${
                                  isFullCommon
                                    ? 'bg-emerald-100/80 text-emerald-950 font-bold border-emerald-300'
                                    : isGoodSuggest
                                    ? 'bg-blue-50 text-blue-900 font-medium'
                                    : pct >= 50
                                    ? 'bg-amber-50/80 text-amber-900'
                                    : 'bg-white text-slate-400'
                                }`}
                              >
                                <div className="flex flex-col items-center justify-center">
                                  {isFullCommon && (
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 mb-1" />
                                  )}
                                  <span className="font-bold">
                                    {freeCount}/{total}
                                  </span>
                                  <span className="text-[10px] opacity-80">{pct}% 空堂</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* View Mode 2: Slot Cards List */}
            <div className="space-y-3">
              {/* Section 1: 完全共同空堂 */}
              {queryResult.common.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 px-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>完全共同空堂時段（{queryResult.common.length} 個時段全員可出席）：</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {queryResult.common.map((slot) => {
                      const timeStr = periodTimeMap[slot.p] || '';
                      return (
                        <div
                          key={`${slot.wd}-${slot.p}`}
                          className="bg-white rounded-xl border border-emerald-200 shadow-xs overflow-hidden transition-all hover:border-emerald-400"
                        >
                          <div className="bg-emerald-50/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-emerald-950">
                                📅 {WEEKDAYS[slot.wd]} 第 {slot.p} 節
                              </span>
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                                {timeStr}
                              </span>
                            </div>
                            <span className="text-xs font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                              全員出席 ({slot.free.length}/{slot.free.length}) 100%
                            </span>
                          </div>

                          <div className="p-3.5 space-y-2">
                            <div className="text-xs font-medium text-slate-500">可出席教師：</div>
                            <div className="flex flex-wrap gap-1.5">
                              {slot.free.map((id) => (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                >
                                  ✓ {queryResult.teacherMap[id]}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 2: 部分空堂建議時段 */}
              {queryResult.suggest.filter((s) => s.busy.length > 0).length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 px-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {queryResult.common.length > 0 ? '其他建議參考時段（部分教師有課）：' : '替代時段建議：'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {queryResult.suggest
                      .filter((s) => s.busy.length > 0)
                      .slice(0, 8)
                      .map((slot) => {
                        const total = slot.free.length + slot.busy.length;
                        const pct = Math.round((slot.free.length / total) * 100);
                        const timeStr = periodTimeMap[slot.p] || '';

                        return (
                          <div
                            key={`${slot.wd}-${slot.p}`}
                            className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                          >
                            <div className="bg-amber-50/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-amber-100">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">
                                  📅 {WEEKDAYS[slot.wd]} 第 {slot.p} 節
                                </span>
                                <span className="text-xs font-medium text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                                  {timeStr}
                                </span>
                              </div>
                              <span className="text-xs font-bold bg-amber-500 text-white px-2.5 py-0.5 rounded-full">
                                {slot.free.length}/{total} 可出席（{pct}%）
                              </span>
                            </div>

                            <div className="p-3.5 space-y-3">
                              {/* Free Teachers */}
                              <div>
                                <div className="text-xs font-semibold text-emerald-800 mb-1.5">
                                  可出席教師（{slot.free.length} 位）：
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {slot.free.map((id) => (
                                    <span
                                      key={id}
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    >
                                      ✓ {queryResult.teacherMap[id]}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Busy Teachers */}
                              <div>
                                <div className="text-xs font-semibold text-rose-800 mb-1.5">
                                  有課教師（{slot.busy.length} 位）：
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {slot.busy.map((id) => {
                                    const teacherName = queryResult.teacherMap[id];
                                    const key = `${id}-${slot.wd}-${slot.p}`;
                                    const courses = courseLookup[key] || [];
                                    const courseLabel = courses
                                      .map((c) => `${c.c}${c.cls ? ` (${c.cls})` : ''}`)
                                      .join('、');

                                    return (
                                      <span
                                        key={id}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200"
                                        title={`衝堂課程：${courseLabel || '有課'}`}
                                      >
                                        ✗ {teacherName}
                                        {courseLabel && (
                                          <span className="text-[11px] text-rose-600 font-normal">
                                            [{courseLabel}]
                                          </span>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
