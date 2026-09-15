import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Clock,
  Users,
  Building,
  RotateCcw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { AppSettings, JobGroupConfig, CommitteeConfig } from '../types';
import { SCHEDULE_PRESETS } from '../utils/constants';

interface SetupScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  jobGroups: JobGroupConfig[];
  onUpdateJobGroups: (groups: JobGroupConfig[]) => void;
  onResetJobGroups: () => void;
  committees: CommitteeConfig[];
  onUpdateCommittees: (comms: CommitteeConfig[]) => void;
  onResetCommittees: () => void;
  onStartParse: (file: File) => void;
  onEnterDemoMode: () => void;
  isParsing: boolean;
  parseProgress: { current: number; total: number; detail: string };
  errorMessage?: string;
  hasExistingData?: boolean;
  existingTeacherCount?: number;
  onReturnToQuery?: () => void;
  onClearTimetableData?: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  settings,
  onUpdateSettings,
  jobGroups,
  onUpdateJobGroups,
  onResetJobGroups,
  committees,
  onUpdateCommittees,
  onResetCommittees,
  onStartParse,
  onEnterDemoMode,
  isParsing,
  parseProgress,
  errorMessage,
  hasExistingData,
  existingTeacherCount = 0,
  onReturnToQuery,
  onClearTimetableData,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [openJobGroupIndex, setOpenJobGroupIndex] = useState<number | null>(null);
  const [openCommIndex, setOpenCommIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPreset = SCHEDULE_PRESETS[settings.schedulePreset];

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('請選取 .pdf 格式的教師課表檔案！');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleJobGroupTextChange = (index: number, text: string) => {
    const updated = [...jobGroups];
    const members = text
      .split(/[、,，\n\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    updated[index] = { ...updated[index], members };
    onUpdateJobGroups(updated);
  };

  const handleCommitteeTextChange = (index: number, text: string) => {
    const updated = [...committees];
    const members = text
      .split(/[、,，\n\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    updated[index] = { ...updated[index], members };
    onUpdateCommittees(updated);
  };

  const handleCommitteeLabelChange = (index: number, label: string) => {
    const updated = [...committees];
    updated[index] = { ...updated[index], label };
    onUpdateCommittees(updated);
  };

  const handleAddCommittee = () => {
    const newComm: CommitteeConfig = {
      id: `comm_${Date.now()}`,
      label: '自訂工作小組/委員會',
      members: [],
    };
    const updated = [...committees, newComm];
    onUpdateCommittees(updated);
    setOpenCommIndex(updated.length - 1);
  };

  const handleDeleteCommittee = (index: number) => {
    if (window.confirm(`確定要刪除「${committees[index].label}」嗎？`)) {
      const updated = committees.filter((_, i) => i !== index);
      onUpdateCommittees(updated);
      if (openCommIndex === index) setOpenCommIndex(null);
    }
  };

  const progressPercent =
    parseProgress.total > 0 ? Math.round((parseProgress.current / parseProgress.total) * 100) : 0;

  return (
    <div className="min-h-[calc(100vh-60px)] bg-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-lg shrink-0 overflow-hidden border-2 border-white/80">
                <img
                  src="/school-logo.png"
                  alt="國立成功商業水產職業學校校徽"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-2 backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  課表比對 • 共同空堂 • 快速排會
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  國立成功商業水產職業學校
                </h1>
                <div className="text-base sm:text-lg font-semibold text-blue-100 mt-0.5">
                  教師共同空堂查詢系統
                </div>
                <p className="text-blue-100 text-sm mt-1.5 leading-relaxed">
                  匯入全校教師課表 PDF 檔案，立即自動比對各領域教學研究會、行政處室或跨科委員會之共同空堂時段。
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Existing Timetable Banner */}
            {hasExistingData && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-900">
                      目前系統已存有課表資料（共 {existingTeacherCount} 位教師）
                    </div>
                    <div className="text-xs text-emerald-700 mt-0.5">
                      您可以隨時點擊「返回課表查詢」直接繼續使用，或在下方上傳新檔案進行覆蓋更換。
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {onClearTimetableData && (
                    <button
                      type="button"
                      onClick={onClearTimetableData}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      清除舊課表
                    </button>
                  )}
                  {onReturnToQuery && (
                    <button
                      type="button"
                      onClick={onReturnToQuery}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <span>返回課表查詢</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">解析錯誤</div>
                  <div className="mt-0.5">{errorMessage}</div>
                </div>
              </div>
            )}

            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                <div className="w-2 h-5 bg-blue-600 rounded-full" />
                <h2 className="text-base font-bold text-slate-800">基本學校與學期設定</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">學校名稱</label>
                  <input
                    type="text"
                    value={settings.school}
                    onChange={(e) => onUpdateSettings({ school: e.target.value })}
                    placeholder="例如：國立成功商業水產職業學校"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">學年度</label>
                  <input
                    type="number"
                    min="100"
                    max="200"
                    value={settings.year}
                    onChange={(e) => onUpdateSettings({ year: parseInt(e.target.value, 10) || 115 })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">學期</label>
                  <select
                    value={settings.sem}
                    onChange={(e) => onUpdateSettings({ sem: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value={1}>第 1 學期（上學期）</option>
                    <option value={2}>第 2 學期（下學期）</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Schedule Time Version */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 bg-blue-600 rounded-full" />
                  <h2 className="text-base font-bold text-slate-800">上課節次時間版本</h2>
                </div>
                <span className="text-xs text-slate-500">解析 PDF 前請確認，以確保節次對應正確</span>
              </div>

              <div>
                <select
                  value={settings.schedulePreset}
                  onChange={(e) => onUpdateSettings({ schedulePreset: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {Object.values(SCHEDULE_PRESETS).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>

                {/* Period Pills Preview */}
                {currentPreset && (
                  <div className="mt-3 p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                    <div className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      節次時間對照（共 {currentPreset.periods.length} 節）：
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {currentPreset.periods.map((p) => (
                        <span
                          key={p.p}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white text-blue-800 border border-blue-200 shadow-xs"
                        >
                          第{p.p}節 {p.start}–{p.end}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Job Role Groups */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 bg-blue-600 rounded-full" />
                  <h2 className="text-base font-bold text-slate-800">職務群組名單設定</h2>
                </div>
                <span className="text-xs text-slate-500">查詢時可一鍵帶入，以頓號、逗號或換行分隔</span>
              </div>

              <div className="space-y-2">
                {jobGroups.map((group, idx) => {
                  const isOpen = openJobGroupIndex === idx;
                  return (
                    <div
                      key={group.id}
                      className="border border-slate-200 rounded-xl overflow-hidden transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenJobGroupIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/80 hover:bg-slate-100/80 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span className="text-xs font-bold text-slate-800">{group.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {group.members.length} 人
                          </span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="p-3.5 bg-white border-t border-slate-200 space-y-2">
                          <textarea
                            value={group.members.join('、')}
                            onChange={(e) => handleJobGroupTextChange(idx, e.target.value)}
                            placeholder="請輸入教師姓名，例：王小明、李大華、張美玲（可用頓號、逗號或換行分隔）"
                            rows={3}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                          />
                          <div className="text-[11px] text-slate-400">
                            已設定 {group.members.length} 位成員：
                            {group.members.slice(0, 8).join('、')}
                            {group.members.length > 8 ? '…' : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={onResetJobGroups}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1.5 rounded-md hover:bg-slate-200/60 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  還原預設職務群組
                </button>
              </div>
            </div>

            {/* Section 4: Committees */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-pink-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 bg-pink-600 rounded-full" />
                  <h2 className="text-base font-bold text-slate-800">會議組織 / 委員會名單</h2>
                </div>
                <span className="text-xs text-slate-500">自訂跨處室委員會成員名單</span>
              </div>

              <div className="space-y-2">
                {committees.map((comm, idx) => {
                  const isOpen = openCommIndex === idx;
                  return (
                    <div
                      key={comm.id}
                      className="border border-slate-200 rounded-xl overflow-hidden transition-colors"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-pink-50/40 hover:bg-pink-50/70 border-b border-transparent transition-colors">
                        <div
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => setOpenCommIndex(isOpen ? null : idx)}
                        >
                          <Building className="w-4 h-4 text-pink-600 shrink-0" />
                          <input
                            type="text"
                            value={comm.label}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleCommitteeLabelChange(idx, e.target.value)}
                            className="text-xs font-bold text-pink-950 bg-transparent border-b border-dashed border-pink-300 hover:border-pink-500 focus:outline-none focus:border-pink-600 px-1 py-0.5"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-100 text-pink-800">
                            {comm.members.length} 人
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCommittee(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="刪除此委員會"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenCommIndex(isOpen ? null : idx)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="p-3.5 bg-white border-t border-slate-200 space-y-2">
                          <textarea
                            value={comm.members.join('、')}
                            onChange={(e) => handleCommitteeTextChange(idx, e.target.value)}
                            placeholder="請輸入委員會成員姓名，例：王小明、李大華、張美玲"
                            rows={3}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all font-sans"
                          />
                          <div className="text-[11px] text-slate-400">
                            目前成員：{comm.members.join('、') || '尚未設定成員'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAddCommittee}
                  className="inline-flex items-center gap-1 text-xs text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增委員會
                </button>
                <button
                  type="button"
                  onClick={onResetCommittees}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1.5 rounded-md hover:bg-slate-200/60 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  還原預設委員會
                </button>
              </div>
            </div>

            {/* Section 5: PDF Upload Dropzone */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                <div className="w-2 h-5 bg-blue-600 rounded-full" />
                <h2 className="text-base font-bold text-slate-800">上傳全校教師課表 PDF 檔案</h2>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  selectedFile
                    ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70'
                    : isDragOver
                    ? 'border-blue-600 bg-blue-50/80 scale-[1.01]'
                    : 'border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50/30'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                      selectedFile
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {selectedFile ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <Upload className="w-7 h-7" />
                    )}
                  </div>

                  <div>
                    {selectedFile ? (
                      <>
                        <div className="text-sm font-bold text-emerald-900 flex items-center justify-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          已選取檔案：{selectedFile.name}
                        </div>
                        <div className="text-xs text-emerald-700 mt-1">
                          大小：{(selectedFile.size / 1024).toFixed(1)} KB • 點擊可重新選取其他 PDF
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-bold text-slate-800">
                          點擊選擇課表 PDF，或將檔案拖放至此
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          支援各縣市國中、高中職由教務排課系統匯出之全校教師課表 PDF
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onEnterDemoMode}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-all shadow-xs hover:border-slate-400"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                示範模式（無 PDF 即刻體驗）
              </button>

              <button
                type="button"
                disabled={!selectedFile || isParsing}
                onClick={() => {
                  if (selectedFile) onStartParse(selectedFile);
                }}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all ${
                  !selectedFile || isParsing
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-500/25'
                }`}
              >
                <span>▶ 開始解析並進入查詢</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Privacy Notice */}
        <div className="text-center text-xs text-slate-500 mt-4 leading-relaxed">
          🔒 本系統採純前端解析技術，所有課表資料均在您的瀏覽器端即時處理，絕不上傳外部伺服器，嚴格保護師生隱私。
        </div>
      </div>

      {/* Parsing Modal / Overlay */}
      {isParsing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
              <FileText className="w-6 h-6 text-blue-600 absolute" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">正在解析教師課表 PDF…</h3>
              <p className="text-xs text-slate-500">{parseProgress.detail || '請稍候…'}</p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>
                  頁數：{parseProgress.current} / {parseProgress.total} 頁
                </span>
                <span>{progressPercent}%</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              系統正在智慧識別各頁任課教師姓名、星期欄位及排課節次…
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
