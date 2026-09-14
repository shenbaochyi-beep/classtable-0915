import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Search, Users, ArrowRight, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { Teacher, SchedulePreset } from '../types';
import { WEEKDAYS } from '../utils/constants';

interface PeriodQueryTabProps {
  teachers: Teacher[];
  currentPreset: SchedulePreset;
  onImportToCommonQuery: (teacherIds: number[]) => void;
  semLabel: string;
}

export const PeriodQueryTab: React.FC<PeriodQueryTabProps> = ({
  teachers,
  currentPreset,
  onImportToCommonQuery,
  semLabel,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [showBusyTeachers, setShowBusyTeachers] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Period time map
  const periodTimeMap = useMemo(() => {
    const map: Record<number, string> = {};
    currentPreset.periods.forEach((p) => {
      map[p.p] = `${p.start}–${p.end}`;
    });
    return map;
  }, [currentPreset]);

  // Busy slot lookup
  const busyData = useMemo(() => {
    const slotKey = `${selectedDay}-${selectedPeriod}`;
    const freeList: Teacher[] = [];
    const busyList: Array<{ teacher: Teacher; courses: Array<{ c: string; cls?: string }> }> = [];

    teachers.forEach((t) => {
      const matchEntries = t.entries.filter(
        (e) => e.wd === selectedDay && e.p === selectedPeriod
      );
      if (matchEntries.length > 0) {
        busyList.push({
          teacher: t,
          courses: matchEntries.map((e) => ({ c: e.c, cls: e.cls })),
        });
      } else {
        freeList.push(t);
      }
    });

    return { freeList, busyList };
  }, [teachers, selectedDay, selectedPeriod]);

  // Filtered by name
  const filteredFree = useMemo(() => {
    if (!searchFilter.trim()) return busyData.freeList;
    const kw = searchFilter.trim().toLowerCase();
    return busyData.freeList.filter((t) => t.name.toLowerCase().includes(kw));
  }, [busyData.freeList, searchFilter]);

  const filteredBusy = useMemo(() => {
    if (!searchFilter.trim()) return busyData.busyList;
    const kw = searchFilter.trim().toLowerCase();
    return busyData.busyList.filter((b) => b.teacher.name.toLowerCase().includes(kw));
  }, [busyData.busyList, searchFilter]);

  const handleSelectAllFree = () => {
    const freeIds = busyData.freeList.map((t) => t.id);
    if (freeIds.length === 0) {
      alert('此時段無空堂教師可帶入。');
      return;
    }
    onImportToCommonQuery(freeIds);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
      {/* Selector Controls */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>選擇查詢之特定星期與節次</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end text-xs">
          {/* Day of Week */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">星期</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  {WEEKDAYS[d]}
                </option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">節次</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {currentPreset.periods.map((p) => (
                <option key={p.p} value={p.p}>
                  第 {p.p} 節（{p.start}–{p.end}）
                </option>
              ))}
            </select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">過濾教師姓名</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="搜尋姓名…"
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
              />
            </div>
          </div>

          {/* Toggle busy teachers */}
          <div className="flex items-center pb-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 font-medium select-none">
              <input
                type="checkbox"
                checked={showBusyTeachers}
                onChange={(e) => setShowBusyTeachers(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>同時顯示有課教師</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-blue-950">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>
            {WEEKDAYS[selectedDay]} 第 {selectedPeriod} 節（{periodTimeMap[selectedPeriod]}）
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-emerald-700">空堂：{busyData.freeList.length} 位</span>
          <span className="text-slate-400">•</span>
          <span className="text-rose-700">有課：{busyData.busyList.length} 位</span>
        </div>

        <button
          type="button"
          onClick={handleSelectAllFree}
          disabled={busyData.freeList.length === 0}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-all ${
            busyData.freeList.length === 0
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
          }`}
        >
          <span>將此節 {busyData.freeList.length} 位空堂教師全選帶入共同空堂比對</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Free Teachers Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>
            空堂教師名單（{filteredFree.length} / {busyData.freeList.length} 位）：
          </span>
        </div>

        {filteredFree.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            此時段無空堂教師，或無符合搜尋條件之教師
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredFree.map((teacher) => (
              <span
                key={teacher.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs hover:bg-emerald-100 transition-colors"
              >
                <span>✓</span>
                <span>{teacher.name}</span>
                <span className="text-[10px] text-emerald-600 font-normal">
                  (週排{teacher.entries.length}節)
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Busy Teachers Section */}
      {showBusyTeachers && (
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>
              有課教師名單與課程（{filteredBusy.length} / {busyData.busyList.length} 位）：
            </span>
          </div>

          {filteredBusy.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              此時段無有課衝突之教師
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filteredBusy.map(({ teacher, courses }) => (
                <div
                  key={teacher.id}
                  className="p-2.5 rounded-lg text-xs bg-rose-50/70 border border-rose-200/80 text-rose-950 flex flex-col justify-between space-y-1"
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{teacher.name}</span>
                    <span className="text-[10px] text-rose-600 bg-rose-100/60 px-1.5 py-0.5 rounded">
                      有課
                    </span>
                  </div>
                  <div className="text-[11px] text-rose-800 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-rose-500 shrink-0" />
                    <span className="truncate">
                      {courses.map((c) => `${c.c}${c.cls ? ` (${c.cls})` : ''}`).join('、')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
