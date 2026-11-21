/**
 * ค่าตั้งของเครื่องที่เปลี่ยนได้ระหว่างแอปเปิดอยู่ (เช่น "ลดการเคลื่อนไหว"): อ่านครั้งแรกแล้วฟังการเปลี่ยน คืนตัวอ่านค่าล่าสุด
 * undefined = ยังไม่รู้ (ช่วงสั้นๆ ตอนเปิดแอป); ค่าที่มากับการเปลี่ยนชนะค่าที่อ่านครั้งแรกซึ่งเสร็จทีหลัง
 */
export function liveSetting(read: () => Promise<boolean>, listen: (f: (v: boolean) => void) => unknown): () => boolean | undefined {
  let value: boolean | undefined;
  read().then((v) => { value ??= v; }, () => {});
  listen((v) => { value = v; });
  return () => value;
}
