import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Printer, Calendar, Clock, BookOpen, Plus, Check, Users } from 'lucide-react';
import { Teacher, SchedulePreset } from '../types';
import { WEEKDAYS } from '../utils/constants';

interface PersonalTimetableTabProps {
  teachers: Teacher[];
  currentPreset: SchedulePreset;
  selectedTeacherIds: Set<number>;
  onToggleTeacher: (id: number) => void;
  semLabel: string;
  initialTeacherName?: string;
}

export const PersonalTimetableTab: React.FC<PersonalTimetableTabProps> = ({
  teachers,
  currentPreset,
  selectedTeacherIds,
  onToggleTeacher,
  semLabel,
  initialTeacherName,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>(
    initialTeacherName || (teachers.length > 0 ? teachers[0].name : '')
  );
  const [activeTeacherId, setActiveTeacherId] = useState<number>(
    teachers.length > 0 ? teachers[0].id : 1
  );
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // If initialTeacherName changes externally
  useEffect(() => {
    if (initialTeacherName) {
      setSearchTerm(initialTeacherName);
      const found = teachers.find((t) => t.name === initialTeacherName);
      if (found) {
        setActiveTeacherId(found.id);
      }
    }
  }, [initialTeacherName, teachers]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered teachers for dropdown suggestion
  const suggestions = useMemo(() => {
    if (!searchTerm.trim()) return teachers.slice(0, 10);
    const kw = searchTerm.trim().toLowerCase();
    return teachers.filter((t) => t.name.toLowerCase().includes(kw)).slice(0, 10);
  }, [teachers, searchTerm]);

  // Currently active teacher object
  const activeTeacher = useMemo(() => {
    return teachers.find((t) => t.id === activeTeacherId) || teachers[0] || null;
  }, [teachers, activeTeacherId]);

  // Fast entry lookup: `${wd}-${p}` -> array of courses
  const timetableMatrix = useMemo(() => {
    if (!activeTeacher) return {};
    const map: Record<string, Array<{ c: string; cls?: string }>> = {};
    activeTeacher.entries.forEach((e) => {
      const key = `${e.wd}-${e.p}`;
      if (!map[key]) map[key] = [];
      map[key].push({ c: e.c, cls: e.cls });
    });
    return map;
  }, [activeTeacher]);

  const isSelectedForComparison = activeTeacher
    ? selectedTeacherIds.has(activeTeacher.id)
    : false;

  const handleSelectTeacher = (t: Teacher) => {
    setActiveTeacherId(t.id);
    setSearchTerm(t.name);
    setShowDropdown(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
      {/* Search & Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
        <div className="relative flex-1 min-w-[240px] max-w-sm" ref={dropdownRef}>
          <label className="block text-xs font-bold text-slate-700 mb-1">搜尋與切換教師課表</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              placeholder="請輸入教師姓名…"
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in">
              {suggestions.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTeacher(t)}
                  className="px-3.5 py-2 text-xs hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <span className="font-semibold text-slate-800">{t.name}</span>
                  <span className="text-[11px] text-slate-400">授課 {t.entries.length} 節</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Teacher Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-500 font-medium">快速切換：</span>
          {teachers.slice(0, 7).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTeacher(t)}
              className={`px-2 py-1 text-xs rounded-md border font-medium transition-all ${
                activeTeacher?.id === t.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Teacher Profile Card */}
      {activeTeacher && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border border-blue-100/80 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs">
              {activeTeacher.name.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{activeTeacher.name} 老師</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {semLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  本學期總授課節數：
                  <b className="text-blue-700 font-bold">{activeTeacher.entries.length}</b> 節
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleTeacher(activeTeacher.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                isSelectedForComparison
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isSelectedForComparison ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  <span>已在共同空堂比對名單中</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>加入共同空堂比對名單</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>列印課表</span>
            </button>
          </div>
        </div>
      )}

      {/* Weekly Schedule Table */}
      {activeTeacher && (
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
          <table className="w-full text-center border-collapse min-w-[580px]">
            <thead>
              <tr className="bg-blue-600 text-white text-xs font-bold">
                <th className="p-2.5 border-r border-blue-500/50 w-28">節次 / 時間</th>
                {[1, 2, 3, 4, 5].map((d) => (
                  <th key={d} className="p-2.5 border-r last:border-r-0 border-blue-500/50">
                    {WEEKDAYS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {currentPreset.periods.map((period) => {
                const p = period.p;
                return (
                  <tr key={p} className="hover:bg-slate-50/40 transition-colors">
                    {/* Period label & time */}
                    <td className="p-2.5 border-r border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                      <div className="text-xs font-bold text-slate-900">第 {p} 節</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {period.start}–{period.end}
                      </div>
                    </td>

                    {/* Mon-Fri cells */}
                    {[1, 2, 3, 4, 5].map((wd) => {
                      const key = `${wd}-${p}`;
                      const courses = timetableMatrix[key];
                      const hasCourse = courses && courses.length > 0;

                      return (
                        <td
                          key={wd}
                          className={`p-2.5 border-r last:border-r-0 border-slate-200 align-middle ${
                            hasCourse ? 'bg-emerald-50/70 text-emerald-950' : 'bg-white text-slate-300'
                          }`}
                        >
                          {hasCourse ? (
                            <div className="space-y-1">
                              {courses.map((c, cIdx) => (
                                <div key={cIdx}>
                                  <div className="font-bold text-xs text-emerald-900">{c.c}</div>
                                  {c.cls && (
                                    <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded">
                                      {c.cls}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-block text-[11px] text-slate-400/80 font-medium">
                              空堂
                            </span>
                          )}
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
    </div>
  );
};
