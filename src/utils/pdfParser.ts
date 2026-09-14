import { Teacher, CourseEntry, PeriodConfig } from '../types';

interface TextItem {
  text: string;
  x: number;
  y: number;
  w: number;
}

interface RowCluster {
  centerY: number;
  items: TextItem[];
}

interface ColumnBound {
  day: number;
  left: number;
  right: number;
  cx: number;
}

interface PeriodRow {
  period: number;
  centerY: number;
}

export interface ParseResult {
  teachers: Teacher[];
  detectedSchool?: string;
  detectedYear?: number;
  detectedSem?: number;
}

function normalizeTimeKey(s: string): string {
  return String(s || '').replace(/^0/, '');
}

export async function parsePdfTimetable(
  file: File,
  periods: PeriodConfig[],
  onProgress?: (current: number, total: number, detail: string) => void
): Promise<ParseResult> {
  const pdfjsLib = (window as unknown as { pdfjsLib?: any }).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error('PDF.js 解析庫尚未載入完成，請稍候再試或重新整理網頁。');
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const teachers: Teacher[] = [];
  let detectedSchool: string | undefined;
  let detectedYear: number | undefined;
  let detectedSem: number | undefined;

  // Build lookup map for period starting times
  const timeMap: Record<string, number> = {};
  periods.forEach((p) => {
    timeMap[p.start] = p.p;
    timeMap[normalizeTimeKey(p.start)] = p.p;
  });

  const maxPeriod = periods.length || 8;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages, `正在解析第 ${pageNum} / ${numPages} 頁課表…`);
    }

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const H = viewport.height;

    const items: TextItem[] = (textContent.items || [])
      .filter((it: any) => it.str && it.str.trim())
      .map((it: any) => ({
        text: it.str.trim(),
        x: it.transform[4],
        y: H - it.transform[5], // flip Y coordinates so top = 0
        w: it.width || 0,
      }));

    if (!items.length) continue;

    // Try detecting school and semester metadata from first 2 pages
    if (pageNum <= 2) {
      const allPageText = items.map((i) => i.text).join(' ');
      const schoolMatch = allPageText.match(/(?:臺中市立|臺北市立|新北市立|國立|私立|市立)?([^\s\d,，]+(?:高中|高職|國中|小學|學校))/);
      if (schoolMatch && !detectedSchool) {
        detectedSchool = schoolMatch[0];
      }
      const yearSemMatch = allPageText.match(/(\d{2,3})\s*學年度\s*第\s*([12一二])\s*學期/);
      if (yearSemMatch) {
        detectedYear = parseInt(yearSemMatch[1], 10);
        detectedSem = yearSemMatch[2] === '二' || yearSemMatch[2] === '2' ? 2 : 1;
      }
    }

    const teacherName = findTeacherName(items, pageNum);
    if (!teacherName) {
      continue;
    }

    const rows = clusterByY(items, 8);
    const dayInfo = findDayColumns(rows);
    if (!dayInfo) {
      // Teacher found but columns missing, still record empty entries
      teachers.push({ id: teachers.length + 1, name: teacherName, entries: [] });
      continue;
    }

    const colBounds = makeColBounds(dayInfo.cols);
    const periodYs = findPeriodRows(rows, dayInfo.headerY, dayInfo.cols[0].cx, timeMap, maxPeriod);

    if (!periodYs.length) {
      teachers.push({ id: teachers.length + 1, name: teacherName, entries: [] });
      continue;
    }

    const tableBottom = periodYs[periodYs.length - 1].centerY + 65;
    const entries: CourseEntry[] = [];

    for (let pi = 0; pi < periodYs.length; pi++) {
      const pInfo = periodYs[pi];
      const nextY = pi + 1 < periodYs.length ? periodYs[pi + 1].centerY : tableBottom;
      const bandTop = pInfo.centerY - 6;
      const bandBot = nextY - 2;

      const cellTexts: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };

      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        if (it.y < bandTop || it.y > bandBot) continue;

        for (let ci = 0; ci < colBounds.length; ci++) {
          const cb = colBounds[ci];
          if (it.x >= cb.left && it.x <= cb.right) {
            cellTexts[cb.day].push(it.text);
            break;
          }
        }
      }

      for (let day = 1; day <= 5; day++) {
        const texts = cellTexts[day];
        if (!texts || !texts.length) continue;
        const parsed = parseCellContent(texts);
        if (parsed.course) {
          entries.push({
            wd: day,
            p: pInfo.period,
            c: parsed.course,
            cls: parsed.cls || undefined,
          });
        }
      }
    }

    teachers.push({
      id: teachers.length + 1,
      name: teacherName,
      entries,
    });
  }

  // Deduplicate or merge teachers if name repeats across pages
  const teacherMap = new Map<string, Teacher>();
  for (const t of teachers) {
    if (!teacherMap.has(t.name)) {
      teacherMap.set(t.name, { ...t, id: teacherMap.size + 1 });
    } else {
      const existing = teacherMap.get(t.name)!;
      existing.entries.push(...t.entries);
    }
  }

  return {
    teachers: Array.from(teacherMap.values()),
    detectedSchool,
    detectedYear,
    detectedSem,
  };
}

// Extract Teacher Name
function findTeacherName(items: TextItem[], pageNum: number): string | null {
  const INVALID = /^(星期[一二三四五]?$|節次|時間|教師$|教師姓名|課程名稱|學校|班級|編號|週次|^[一二三四五六七八]$|第[一二三四五六七八]|上午|下午|早自習|午休)/;

  const buckets: Record<number, TextItem[]> = {};
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const yk = Math.round(it.y / 6) * 6;
    if (!buckets[yk]) buckets[yk] = [];
    buckets[yk].push(it);
  }

  const lineKeys = Object.keys(buckets).map(Number).sort((a, b) => a - b);
  const lines = lineKeys.map((yk) => {
    const li = buckets[yk].sort((a, b) => a.x - b.x);
    return { y: yk, text: li.map((it) => it.text).join(''), items: li };
  });

  // Strategy A: 教師[：:全形:]名字
  const colonRe = /教師[：:：]\s*([^\s\d,，；;\/\\（(【\[]{2,6})/;
  for (let j = 0; j < lines.length; j++) {
    const ma = lines[j].text.match(colonRe);
    if (ma) {
      const na = ma[1].replace(/\s*[\d（(【\[].+$/, '').trim();
      if (na.length >= 2 && !INVALID.test(na)) {
        return na;
      }
    }
  }

  // Strategy B: XXX老師
  const teacherRe = /([^\s\d,，；;\/\\（(一二三四五六七八\[\]【】]{2,4})老師/;
  for (let j = 0; j < lines.length; j++) {
    const mb = lines[j].text.match(teacherRe);
    if (mb) {
      const nb = mb[1].trim();
      if (nb.length >= 2 && !INVALID.test(nb)) {
        return nb;
      }
    }
  }

  // Strategy C: XXX課表 / 課表：XXX
  for (let j = 0; j < lines.length; j++) {
    const mc = lines[j].text.match(/([^\s\d,，；;一二三四五六七八]{2,6})課表/);
    if (mc) {
      const nc = mc[1].replace(/教師|教職員|個人|全體|學校/, '').trim();
      if (nc.length >= 2 && !INVALID.test(nc)) {
        return nc;
      }
    }
    const mc2 = lines[j].text.match(/課表[：:：]\s*([^\s\d,，；;\/\\]{2,6})/);
    if (mc2) {
      const nc2 = mc2[1].trim();
      if (nc2.length >= 2 && !INVALID.test(nc2)) {
        return nc2;
      }
    }
  }

  // Strategy D: Look for item '教師' and examine neighbor items to the right
  for (let i = 0; i < items.length; i++) {
    const txt = items[i].text;
    if (txt !== '教師' && txt !== '教師：' && txt !== '教師:' && !txt.match(/^教師[：:：]/)) continue;
    const iy = items[i].y;
    const ix = items[i].x;

    const row = items
      .filter((it) => Math.abs(it.y - iy) <= 8)
      .sort((a, b) => a.x - b.x);
    const rowTxt = row.map((it) => it.text).join('');

    const md = rowTxt.match(/教師[：:：\s]*([^\s\d,，；;\/\\（(一二三四五]{2,6})/);
    if (md) {
      const nd = md[1].replace(/\s*[\d（(].+$/, '').trim();
      if (nd.length >= 2 && !INVALID.test(nd)) {
        return nd;
      }
    }

    const rights = row.filter((it) => it.x > ix + 5);
    for (let k = 0; k < rights.length; k++) {
      const nt = rights[k].text.replace(/^[：:：\s]+/, '').trim();
      if (nt.length >= 2 && !INVALID.test(nt) && !nt.match(/^[\d：:：]/)) {
        return nt;
      }
    }
  }

  return null;
}

// Cluster TextItems by Y-coordinate
function clusterByY(items: TextItem[], tol: number): RowCluster[] {
  const sorted = items.slice().sort((a, b) => a.y - b.y);
  const rows: RowCluster[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i];
    let found = false;
    for (let j = 0; j < rows.length; j++) {
      if (Math.abs(rows[j].centerY - it.y) <= tol) {
        rows[j].items.push(it);
        let sum = 0;
        for (let k = 0; k < rows[j].items.length; k++) sum += rows[j].items[k].y;
        rows[j].centerY = sum / rows[j].items.length;
        found = true;
        break;
      }
    }
    if (!found) rows.push({ centerY: it.y, items: [it] });
  }

  return rows.sort((a, b) => a.centerY - b.centerY);
}

// Find Day columns (一 ~ 五)
function findDayColumns(rows: RowCluster[]): { cols: Array<{ day: number; cx: number }>; headerY: number } | null {
  const dayRe = /^[一二三四五]$|^星期[一二三四五]$/;
  const allFiveRe = /^[一二三四五]{5}$/;

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const dayItems = row.items.filter((it) => dayRe.test(it.text));
    if (dayItems.length >= 4) {
      dayItems.sort((a, b) => a.x - b.x);
      const five = dayItems.slice(-5);
      const cols = five.map((it, i) => ({
        day: i + 1,
        cx: it.x + (it.w || 12) / 2,
      }));
      return { cols, headerY: row.centerY };
    }
  }

  // Combined item like "一二三四五"
  for (let ri2 = 0; ri2 < rows.length; ri2++) {
    const row2 = rows[ri2];
    const allFive = row2.items.filter((it) => allFiveRe.test(it.text));
    if (allFive.length === 1) {
      const af = allFive[0];
      const step = (af.w || 60) / 5;
      const cols3: Array<{ day: number; cx: number }> = [];
      for (let d = 0; d < 5; d++) {
        cols3.push({ day: d + 1, cx: af.x + step * (d + 0.5) });
      }
      return { cols: cols3, headerY: row2.centerY };
    }

    const dayItems3 = row2.items.filter((it) => dayRe.test(it.text));
    if (dayItems3.length === 3) {
      dayItems3.sort((a, b) => a.x - b.x);
      const cols4 = dayItems3.map((it, i) => ({ day: i + 1, cx: it.x + (it.w || 12) / 2 }));
      return { cols: cols4, headerY: row2.centerY };
    }
  }

  return null;
}

function makeColBounds(cols: Array<{ day: number; cx: number }>): ColumnBound[] {
  const bounds: ColumnBound[] = [];
  for (let i = 0; i < cols.length; i++) {
    const prevCx = i > 0 ? cols[i - 1].cx : cols[0].cx - 80;
    const nextCx = i < cols.length - 1 ? cols[i + 1].cx : cols[i].cx + 80;
    bounds.push({
      day: cols[i].day,
      left: (prevCx + cols[i].cx) / 2,
      right: (cols[i].cx + nextCx) / 2,
      cx: cols[i].cx,
    });
  }
  return bounds;
}

// Find period row positions
function findPeriodRows(
  rows: RowCluster[],
  headerY: number,
  firstColX: number,
  timeMap: Record<string, number>,
  maxPeriod: number
): PeriodRow[] {
  const CN: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8 };
  const NUMRE = /^[1-8]$/;
  const TIMERE = /^(\d{1,2}:\d{2})/;
  const PERIRE = /第([一二三四五六七八\d])節/;
  const SKIP_ROW = /總時數|備註|簽名|核准|審核|製表|蓋章|校長|教務/;

  const result: PeriodRow[] = [];
  const seen: Record<number, boolean> = {};

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    if (row.centerY <= headerY + 5) continue;

    let period: number | null = null;
    const rowTxt = row.items.map((it) => it.text).join(' ');
    if (SKIP_ROW.test(rowTxt)) continue;

    for (let ii = 0; ii < row.items.length; ii++) {
      const it = row.items[ii];

      // Time match (08:00 or 8:00)
      const tm = it.text.match(TIMERE);
      if (tm) {
        period = timeMap[tm[1]] || timeMap[normalizeTimeKey(tm[1])] || null;
        if (period) break;
      }

      // "第X節"
      const pm = it.text.match(PERIRE);
      if (pm) {
        const ch = pm[1];
        period = CN[ch] || parseInt(ch, 10);
        if (period >= 1 && period <= maxPeriod) break;
        period = null;
      }

      // Pure number on left side
      if (NUMRE.test(it.text) && parseInt(it.text, 10) <= maxPeriod && it.x < firstColX - 15) {
        period = parseInt(it.text, 10);
        break;
      }
    }

    if (period && !seen[period]) {
      seen[period] = true;
      result.push({ period, centerY: row.centerY });
    }
  }

  return result.sort((a, b) => a.period - b.period);
}

// Parse Cell Text
function parseCellContent(texts: string[]): { course: string | null; cls: string | null } {
  const SKIP: Record<string, boolean> = {
    兼: true,
    補: true,
    米: true,
    '＊': true,
    '*': true,
    跨: true,
    班: true,
  };

  const courses: string[] = [];
  const classes: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    if (SKIP[t]) continue;
    if (t === '跨班課程') {
      classes.push(t);
      continue;
    }
    if (/^\d{3,4}$/.test(t) || /^[一二三123][0-9]{2}$/.test(t)) {
      classes.push(t);
      continue;
    }
    const cleaned = t.replace(/^[兼補]/, '').trim();
    if (cleaned) courses.push(cleaned);
  }

  return {
    course: courses.join('') || null,
    cls: classes.join('/') || null,
  };
}
