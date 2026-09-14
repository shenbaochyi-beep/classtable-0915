import { Teacher, CourseEntry } from '../types';

export function getDemoTeachers(maxPeriod: number = 8): Teacher[] {
  const teacherProfiles = [
    { name: '王小明', subject: '國文' },
    { name: '李大華', subject: '數學' },
    { name: '張美玲', subject: '英文' },
    { name: '陳建國', subject: '物理' },
    { name: '林淑芬', subject: '化學' },
    { name: '黃志偉', subject: '生物' },
    { name: '吳雅婷', subject: '歷史' },
    { name: '劉俊宏', subject: '地理' },
    { name: '蔡麗娟', subject: '公民與社會' },
    { name: '鄭明仁', subject: '資訊科技' },
    { name: '楊秀英', subject: '體育' },
    { name: '周文德', subject: '生活科技' },
    { name: '何佩芬', subject: '家政' },
    { name: '許瑞祥', subject: '音樂' },
    { name: '郭宜君', subject: '美術' },
    { name: '謝宗憲', subject: '國文' },
    { name: '曾玉華', subject: '數學' },
    { name: '蕭敬廷', subject: '英文' },
  ];

  const classList = ['101', '102', '103', '201', '202', '301', '302'];

  // Seeded pseudo-random so demo is consistent across reloads
  let seed = 42;
  function random() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  return teacherProfiles.map((p, idx) => {
    const tid = idx + 1;
    const entries: CourseEntry[] = [];

    // Deliberately keep Wednesday Period 3 and Friday Period 4 mostly free for common free slot demonstration!
    const targetHours = 14 + Math.floor(random() * 5); // 14-18 periods per week

    const allSlots: Array<{ wd: number; p: number }> = [];
    for (let d = 1; d <= 5; d++) {
      for (let per = 1; per <= maxPeriod; per++) {
        // Keep Wed Period 3 empty for most academic teachers so common free time search yields clean hits
        if (d === 3 && per === 3 && idx < 10) {
          continue;
        }
        allSlots.push({ wd: d, p: per });
      }
    }

    // Shuffle slots
    for (let i = allSlots.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [allSlots[i], allSlots[j]] = [allSlots[j], allSlots[i]];
    }

    const assignedSlots = allSlots.slice(0, targetHours);
    assignedSlots.forEach((slot, sIdx) => {
      const assignedClass = classList[sIdx % classList.length];
      entries.push({
        wd: slot.wd,
        p: slot.p,
        c: p.subject,
        cls: assignedClass,
      });
    });

    return {
      id: tid,
      name: p.name,
      entries,
    };
  });
}
