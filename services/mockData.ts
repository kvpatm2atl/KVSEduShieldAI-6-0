// Minimal mock data — types only, no mock arrays used in production screens
// Powered by OnSpace.AI

export type Role = 'parent' | 'teacher' | 'admin' | 'conductor' | 'bus_driver' | 'security';

export type FeedKind =
  | 'bus_boarded' | 'school_arrived' | 'return_boarded' | 'home_arrived'
  | 'attendance' | 'lesson' | 'homework' | 'notice' | 'incident' | 'remark';

export interface TeacherInfo {
  employeeCode: string;
  name: string;
  designation: string;
  subject: string;
  classTeacherOf?: string;
}

// Teacher roster (for reference/seeding only — not used in screens)
export const TEACHERS: TeacherInfo[] = [
  { employeeCode: '21160', name: 'PADMAJA M G',           designation: 'PGT Physics',          subject: 'Physics' },
  { employeeCode: '36580', name: 'T L BINDU',             designation: 'PGT Physics',          subject: 'Physics' },
  { employeeCode: '14897', name: 'SANTHA D',              designation: 'PGT Chemistry',        subject: 'Chemistry' },
  { employeeCode: '75662', name: 'BROMLY THOMAS',         designation: 'PGT Chemistry',        subject: 'Chemistry' },
  { employeeCode: '43099', name: 'T KUMARI JAYA',         designation: 'PGT Maths',            subject: 'Mathematics' },
  { employeeCode: '14927', name: 'B SIVAKUMAR',           designation: 'PGT Maths',            subject: 'Mathematics' },
  { employeeCode: '8955',  name: 'AMBILY KRISHNAN',       designation: 'PGT Computer Science', subject: 'Computer Science', classTeacherOf: '11A' },
  { employeeCode: '76066', name: 'SUNITHA KRISHNAN K S',  designation: 'PGT Computer Science', subject: 'Computer Science' },
  { employeeCode: '62390', name: 'PRATHIBHA S PANICKER',  designation: 'PGT Biology',          subject: 'Biology' },
  { employeeCode: '80950', name: 'HARISREE H G',          designation: 'PGT English',          subject: 'English' },
  { employeeCode: '100919',name: 'TRIPURARI KUMAR',       designation: 'PGT Economics',        subject: 'Economics' },
  { employeeCode: '9159',  name: 'SINDUMOL AYYAPPAN',    designation: 'TGT Hindi',            subject: 'Hindi' },
  { employeeCode: '21299', name: 'JIJIMOL P M',           designation: 'TGT Hindi',            subject: 'Hindi' },
  { employeeCode: '79879', name: 'R DEEPTHI',             designation: 'TGT Hindi',            subject: 'Hindi' },
  { employeeCode: '9098',  name: 'SOBHA S NAIR',          designation: 'TGT Biology',          subject: 'Biology' },
  { employeeCode: '46861', name: 'PADMAREKHA A K',        designation: 'TGT Biology',          subject: 'Biology' },
  { employeeCode: '77950', name: 'ATHIRA S NAIR',         designation: 'TGT Biology',          subject: 'Biology' },
  { employeeCode: '32456', name: 'ASHA RAMACHANDRA N',    designation: 'TGT English',          subject: 'English' },
  { employeeCode: '9056',  name: 'SUPRIYA V',             designation: 'TGT English',          subject: 'English' },
  { employeeCode: '79553', name: 'JINI P',                designation: 'TGT English',          subject: 'English', classTeacherOf: '10C' },
  { employeeCode: '81056', name: 'VIGNESH R',             designation: 'TGT English',          subject: 'English' },
  { employeeCode: '12038', name: 'JAYASREE SREEKUMAR',    designation: 'TGT Maths',            subject: 'Mathematics' },
  { employeeCode: '108719',name: 'AKASH TANVAR',          designation: 'TGT Maths',            subject: 'Mathematics' },
  { employeeCode: '20214', name: 'JOLLY JOSEPH',          designation: 'TGT SST',              subject: 'Social Science' },
  { employeeCode: '108720',name: 'LAXMI M PRAYAGA',      designation: 'TGT SST',              subject: 'Social Science' },
  { employeeCode: '21413', name: 'JAYASREE C',            designation: 'TGT WET',              subject: 'Work Education' },
  { employeeCode: '104003',name: 'NITIN KUMAR',           designation: 'TGT AE',               subject: 'Art Education' },
];

// Kept for legacy imports — these arrays are no longer used in screens
export const studentsClass10A: any[] = [];
export const homeworkList: any[] = [];
export const lessonsTaught: any[] = [];
export const incidents: any[] = [];
export const parentFeed: any[] = [];
export const notices: any[] = [];
export const buses: any[] = [];
export const classes: any[] = [];
export const adminStats = { totalStudents: 0, totalTeachers: 0, totalBuses: 0, presentToday: 0, absentToday: 0, homeworkPending: 0, incidentsThisWeek: 0, busesOnRoute: 0 };
export const learningGaps: any[] = [];
