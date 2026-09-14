import React from 'react';
import { Calendar, Users, Clock, RotateCcw, Printer, School } from 'lucide-react';
import { AppSettings, SchedulePreset } from '../types';

interface HeaderProps {
  settings: AppSettings;
  teacherCount: number;
  currentPreset?: SchedulePreset;
  onResetUpload: () => void;
  isDemoMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  teacherCount,
  currentPreset,
  onResetUpload,
  isDemoMode,
}) => {
  return (
    <header className="bg-blue-700 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: School & Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
            <img
              src="/school-logo.png"
              alt="國立成功商業水產職業學校校徽"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {settings.school || '國立成功商業水產職業學校'}
              </h1>
              <span className="hidden md:inline-block text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-md font-medium">
                教師共同空堂查詢系統
              </span>
              {isDemoMode && (
                <span className="bg-amber-400/90 text-amber-950 text-xs font-semibold px-2 py-0.5 rounded-full">
                  示範模式
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-100 mt-0.5">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {settings.year} 學年度第 {settings.sem} 學期
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                共 {teacherCount} 位教師
              </span>
              {currentPreset && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {currentPreset.periods.length} 節課
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
            title="列印當前畫面"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>列印</span>
          </button>
          <button
            type="button"
            onClick={onResetUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white text-blue-800 hover:bg-blue-50 shadow-sm transition-colors font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新上傳課表 / 設定</span>
          </button>
        </div>
      </div>
    </header>
  );
};
