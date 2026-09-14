import { CommonQueryResult, Teacher } from '../types';
import { WEEKDAYS } from './constants';

export function exportCommonQueryCSV(
  result: CommonQueryResult,
  teachers: Teacher[],
  periodTimeMap: Record<number, string>,
  semLabel: string,
  schoolName: string
) {
  const { common, suggest, teacherMap } = result;

  // Build course lookup: teacherId-wd-p => course details
  const courseMap: Record<string, Array<{ c: string; cls?: string }>> = {};
  teachers.forEach((t) => {
    t.entries.forEach((e) => {
      const key = `${t.id}-${e.wd}-${e.p}`;
      if (!courseMap[key]) courseMap[key] = [];
      courseMap[key].push({ c: e.c, cls: e.cls });
    });
  });

  const headers = ['學校', '學期', '查詢日期', '星期', '節次', '時間', '狀態', '可出席教師', '有課教師', '所佔課程', '班級'];
  const rows: string[][] = [headers];
  const queryDate = new Date().toLocaleDateString('zh-TW');

  const appendSlots = (list: typeof common, statusLabel: string) => {
    list.forEach((r) => {
      const fNames = r.free.map((id) => teacherMap[id] || `教師${id}`).join('、');
      const timeStr = periodTimeMap[r.p] || `第${r.p}節`;

      if (r.busy.length === 0) {
        rows.push([
          schoolName,
          semLabel,
          queryDate,
          WEEKDAYS[r.wd] || `週${r.wd}`,
          `第${r.p}節`,
          timeStr,
          statusLabel,
          fNames,
          '',
          '',
          '',
        ]);
      } else {
        r.busy.forEach((bid) => {
          const bName = teacherMap[bid] || `教師${bid}`;
          const key = `${bid}-${r.wd}-${r.p}`;
          const courses = courseMap[key] || [{ c: '有課', cls: '' }];
          courses.forEach((co) => {
            rows.push([
              schoolName,
              semLabel,
              queryDate,
              WEEKDAYS[r.wd] || `週${r.wd}`,
              `第${r.p}節`,
              timeStr,
              statusLabel,
              fNames,
              bName,
              co.c,
              co.cls || '',
            ]);
          });
        });
      }
    });
  };

  appendSlots(common, '完全共同空堂');
  appendSlots(suggest.filter((s) => s.busy.length > 0), '部分空堂(建議)');

  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  // Prefix with UTF-8 BOM so Microsoft Excel loads Traditional Chinese characters cleanly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `教師共同空堂查詢_${schoolName}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function copyCommonQueryText(
  result: CommonQueryResult,
  periodTimeMap: Record<number, string>,
  semLabel: string,
  schoolName: string
): string {
  const { common, suggest, teacherMap } = result;
  const teacherNames = Object.values(teacherMap).join('、');

  const lines: string[] = [
    `【${schoolName} ${semLabel} 教師共同空堂比對結果】`,
    `📅 查詢對象（共 ${result.totalSelected} 位）：${teacherNames}`,
    `🕒 產生時間：${new Date().toLocaleString('zh-TW')}`,
    '----------------------------------------',
  ];

  if (common.length > 0) {
    lines.push(`✅ 完全共同空堂時段（共 ${common.length} 個）：`);
    common.forEach((slot, idx) => {
      const timeStr = periodTimeMap[slot.p] ? `（${periodTimeMap[slot.p]}）` : '';
      lines.push(`  ${idx + 1}. ${WEEKDAYS[slot.wd]} 第${slot.p}節 ${timeStr} — 全部 ${slot.free.length} 位均可出席`);
    });
  } else {
    lines.push('⚠️ 所選教師群無完全共同空堂時段。');
  }

  const alternatives = suggest.filter((s) => s.busy.length > 0).slice(0, 6);
  if (alternatives.length > 0) {
    lines.push('');
    lines.push('💡 最佳替代時段（最多人空堂）：');
    alternatives.forEach((slot, idx) => {
      const freeNames = slot.free.map((id) => teacherMap[id]).join('、');
      const busyNames = slot.busy.map((id) => teacherMap[id]).join('、');
      const timeStr = periodTimeMap[slot.p] ? `（${periodTimeMap[slot.p]}）` : '';
      lines.push(
        `  ${idx + 1}. ${WEEKDAYS[slot.wd]} 第${slot.p}節 ${timeStr} [${slot.free.length}/${slot.free.length + slot.busy.length}人可出席]`
      );
      lines.push(`     • 可出席：${freeNames}`);
      lines.push(`     • 有課衝突：${busyNames}`);
    });
  }

  return lines.join('\n');
}
