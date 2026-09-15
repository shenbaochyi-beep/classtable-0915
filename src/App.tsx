/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { SetupScreen } from './components/SetupScreen';
import { CommonQueryTab } from './components/CommonQueryTab';
import { PeriodQueryTab } from './components/PeriodQueryTab';
import { PersonalTimetableTab } from './components/PersonalTimetableTab';
import { AppSettings, JobGroupConfig, CommitteeConfig, Teacher } from './types';
import {
  SCHEDULE_PRESETS,
  DEFAULT_JOB_GROUPS,
  DEFAULT_COMMITTEES,
} from './utils/constants';
import { parsePdfTimetable } from './utils/pdfParser';
import { getDemoTeachers } from './utils/demoData';
import { Calendar, Clock, UserCheck } from 'lucide-react';

const STORAGE_KEYS = {
  SETTINGS: 'tq_settings',
  JOB_GROUPS: 'tq_groups',
  COMMITTEES: 'tq_comm',
  TEACHERS: 'tq_teachers_data',
  SELECTED_TEACHERS: 'tq_selected_teachers',
  IS_DEMO: 'tq_is_demo',
  SCREEN: 'tq_current_screen',
};

export default function App() {
  // Parsed Teachers loaded from storage if previously uploaded
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.IS_DEMO) === 'true';
    } catch {
      return false;
    }
  });

  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_TEACHERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return new Set(parsed);
        }
      }
    } catch {
      // ignore
    }
    return new Set();
  });

  // Screen state: Default to 'query' if teachers exist and user hasn't pressed '重新上傳課表/設定'
  const [currentScreen, setCurrentScreen] = useState<'setup' | 'query'>(() => {
    try {
      const savedTeachers = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      if (savedTeachers) {
        const parsed = JSON.parse(savedTeachers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const savedScreen = localStorage.getItem(STORAGE_KEYS.SCREEN);
          if (savedScreen === 'setup') {
            return 'setup';
          }
          return 'query';
        }
      }
    } catch {
      // ignore
    }
    return 'setup';
  });

  const [activeTab, setActiveTab] = useState<'common' | 'period' | 'personal'>('common');

  // App Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.school === '臺中市立清水高中' || !parsed.school) {
          parsed.school = '國立成功商業水產職業學校';
        }
        if (parsed.year === 114 || !parsed.year) {
          parsed.year = 115;
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    return {
      school: '國立成功商業水產職業學校',
      year: 115,
      sem: 1,
      schedulePreset: 'original',
    };
  });

  // Job Groups
  const [jobGroups, setJobGroups] = useState<JobGroupConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOB_GROUPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_JOB_GROUPS;
  });

  // Committees
  const [committees, setCommittees] = useState<CommitteeConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMMITTEES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_COMMITTEES;
  });

  // Parsing status
  const [isParsing, setIsParsing] = useState<boolean>(() => false);
  const [parseProgress, setParseProgress] = useState<{ current: number; total: number; detail: string }>({
    current: 0,
    total: 0,
    detail: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Teacher selected for personal tab
  const [personalTabTeacher, setPersonalTabTeacher] = useState<string | undefined>();

  // Save settings on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.JOB_GROUPS, JSON.stringify(jobGroups));
    } catch {
      // ignore
    }
  }, [jobGroups]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COMMITTEES, JSON.stringify(committees));
    } catch {
      // ignore
    }
  }, [committees]);

  // Save teachers & demo mode & selected ids to localStorage
  useEffect(() => {
    try {
      if (teachers.length > 0) {
        localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
      } else {
        localStorage.removeItem(STORAGE_KEYS.TEACHERS);
      }
    } catch {
      // ignore
    }
  }, [teachers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.IS_DEMO, String(isDemoMode));
    } catch {
      // ignore
    }
  }, [isDemoMode]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SELECTED_TEACHERS,
        JSON.stringify(Array.from(selectedTeacherIds))
      );
    } catch {
      // ignore
    }
  }, [selectedTeacherIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCREEN, currentScreen);
    } catch {
      // ignore
    }
  }, [currentScreen]);

  // Ensure initial teachers selected if empty
  useEffect(() => {
    if (teachers.length > 0 && selectedTeacherIds.size === 0) {
      setSelectedTeacherIds(new Set(teachers.slice(0, 3).map((t) => t.id)));
    }
  }, [teachers]);

  const currentPreset = useMemo(() => {
    return SCHEDULE_PRESETS[settings.schedulePreset] || SCHEDULE_PRESETS.original;
  }, [settings.schedulePreset]);

  const semLabel = `${settings.year} 學年度第 ${settings.sem} 學期`;

  // Start PDF Parse
  const handleStartParse = async (file: File) => {
    setIsParsing(true);
    setErrorMessage(undefined);
    setParseProgress({ current: 0, total: 0, detail: '正在讀取 PDF 文件…' });

    try {
      const result = await parsePdfTimetable(
        file,
        currentPreset.periods,
        (current, total, detail) => {
          setParseProgress({ current, total, detail });
        }
      );

      if (!result.teachers || result.teachers.length === 0) {
        throw new Error(
          '未能解析出任何教師課表資料。請確認上傳的檔案為學校教務系統匯出之教師課表 PDF，並檢查節次時間設定是否相符。'
        );
      }

      // Auto update detected school / semester if present
      if (result.detectedSchool && !settings.school) {
        setSettings((prev) => ({ ...prev, school: result.detectedSchool! }));
      }
      if (result.detectedYear) {
        setSettings((prev) => ({ ...prev, year: result.detectedYear! }));
      }
      if (result.detectedSem) {
        setSettings((prev) => ({ ...prev, sem: result.detectedSem! }));
      }

      setTeachers(result.teachers);
      setIsDemoMode(false);

      // Select first 3 teachers by default for convenience
      const initialIds = new Set(result.teachers.slice(0, 3).map((t) => t.id));
      setSelectedTeacherIds(initialIds);

      setIsParsing(false);
      setCurrentScreen('query');
      try {
        localStorage.setItem(STORAGE_KEYS.SCREEN, 'query');
      } catch {
        // ignore
      }
      setActiveTab('common');
    } catch (err: any) {
      console.error('PDF Parse Error:', err);
      setIsParsing(false);
      setErrorMessage(err.message || '解析失敗，請確認檔案格式是否正確。');
    }
  };

  // Demo Mode
  const handleEnterDemoMode = () => {
    const demoTeachers = getDemoTeachers(currentPreset.periods.length);
    setTeachers(demoTeachers);
    setIsDemoMode(true);
    // Select first 3 teachers
    setSelectedTeacherIds(new Set([1, 2, 3]));
    setCurrentScreen('query');
    try {
      localStorage.setItem(STORAGE_KEYS.SCREEN, 'query');
    } catch {
      // ignore
    }
    setActiveTab('common');
  };

  // Screen actions
  const handleResetUpload = () => {
    setCurrentScreen('setup');
    try {
      localStorage.setItem(STORAGE_KEYS.SCREEN, 'setup');
    } catch {
      // ignore
    }
  };

  const handleReturnToQuery = () => {
    if (teachers.length > 0) {
      setCurrentScreen('query');
      try {
        localStorage.setItem(STORAGE_KEYS.SCREEN, 'query');
      } catch {
        // ignore
      }
    }
  };

  const handleClearTimetableData = () => {
    if (window.confirm('確定要清除目前已儲存的課表資料嗎？此操作無法復原。')) {
      setTeachers([]);
      setSelectedTeacherIds(new Set());
      setIsDemoMode(false);
      try {
        localStorage.removeItem(STORAGE_KEYS.TEACHERS);
        localStorage.removeItem(STORAGE_KEYS.SELECTED_TEACHERS);
        localStorage.removeItem(STORAGE_KEYS.IS_DEMO);
        localStorage.setItem(STORAGE_KEYS.SCREEN, 'setup');
      } catch {
        // ignore
      }
      setCurrentScreen('setup');
    }
  };

  // Toggle single teacher selection
  const handleToggleTeacher = (id: number) => {
    setSelectedTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Set multiple teachers selected
  const handleSelectTeachers = (ids: number[]) => {
    setSelectedTeacherIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleClearSelectedTeachers = () => {
    setSelectedTeacherIds(new Set());
  };

  const handleImportToCommonQuery = (teacherIds: number[]) => {
    setSelectedTeacherIds(new Set(teacherIds));
    setActiveTab('common');
  };

  const handleSelectPersonalTeacher = (teacherName: string) => {
    setPersonalTabTeacher(teacherName);
    setActiveTab('personal');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Header */}
      <Header
        settings={settings}
        teacherCount={teachers.length}
        currentPreset={currentPreset}
        onResetUpload={handleResetUpload}
        isDemoMode={isDemoMode}
        currentScreen={currentScreen}
        onReturnToQuery={handleReturnToQuery}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentScreen === 'setup' ? (
          <SetupScreen
            settings={settings}
            onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
            jobGroups={jobGroups}
            onUpdateJobGroups={setJobGroups}
            onResetJobGroups={() => {
              if (window.confirm('確定要還原為預設職務群組名單嗎？')) {
                setJobGroups(DEFAULT_JOB_GROUPS);
              }
            }}
            committees={committees}
            onUpdateCommittees={setCommittees}
            onResetCommittees={() => {
              if (window.confirm('確定要還原為預設委員會名單嗎？')) {
                setCommittees(DEFAULT_COMMITTEES);
              }
            }}
            onStartParse={handleStartParse}
            onEnterDemoMode={handleEnterDemoMode}
            isParsing={isParsing}
            parseProgress={parseProgress}
            errorMessage={errorMessage}
            hasExistingData={teachers.length > 0}
            existingTeacherCount={teachers.length}
            onReturnToQuery={handleReturnToQuery}
            onClearTimetableData={handleClearTimetableData}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
            {/* Top Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-1 bg-white p-1 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('common')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'common'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>共同空堂查詢</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('period')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'period'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>依時段查詢</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'personal'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>個人課表檢視</span>
              </button>
            </div>

            {/* Tab Views */}
            {activeTab === 'common' && (
              <CommonQueryTab
                teachers={teachers}
                selectedTeacherIds={selectedTeacherIds}
                onToggleTeacher={handleToggleTeacher}
                onSelectTeachers={handleSelectTeachers}
                onClearSelectedTeachers={handleClearSelectedTeachers}
                jobGroups={jobGroups}
                committees={committees}
                currentPreset={currentPreset}
                schoolName={settings.school}
                semLabel={semLabel}
                onSelectPersonalTeacher={handleSelectPersonalTeacher}
              />
            )}

            {activeTab === 'period' && (
              <PeriodQueryTab
                teachers={teachers}
                currentPreset={currentPreset}
                onImportToCommonQuery={handleImportToCommonQuery}
                semLabel={semLabel}
              />
            )}

            {activeTab === 'personal' && (
              <PersonalTimetableTab
                teachers={teachers}
                currentPreset={currentPreset}
                selectedTeacherIds={selectedTeacherIds}
                onToggleTeacher={handleToggleTeacher}
                semLabel={semLabel}
                initialTeacherName={personalTabTeacher}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <p>國立成功商業水產職業學校 教師共同空堂查詢系統 • 支援課表 PDF 智慧匯入、時段比對與名單匯出</p>
      </footer>
    </div>
  );
}
