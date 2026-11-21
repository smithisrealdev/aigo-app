# Build AiGo ลง iPhone จาก Mac (ไม่ใช้ Expo Go)

build ด้วย Xcode บน Mac ของคุณเอง ไม่ต้องมีบัญชี Expo และไม่ผ่านเซิร์ฟเวอร์ของ Expo ได้แอป AiGo ที่มีไอคอนจริง เปิดได้โดยไม่ต้องต่อคอมพิวเตอร์

## ต้องมี

- Mac ที่ลง Xcode รุ่นล่าสุดจาก App Store (เปิด Xcode ครั้งแรกแล้วรอให้ติดตั้งส่วนเสริมจนเสร็จ)
- Node.js 20 ขึ้นไป (เช็กด้วย `node -v`) และ CocoaPods (`brew install cocoapods`)
- สาย USB สำหรับต่อ iPhone กับ Mac
- ล็อกอิน GitHub บน Mac ไว้ (repo นี้เป็น repo ส่วนตัว)

## ทำครั้งแรกครั้งเดียว

1. Xcode → Settings → Accounts → กด + → Apple ID แล้วล็อกอิน ใช้ Apple ID ฟรีได้
2. ต่อ iPhone กับ Mac ปลดล็อกเครื่อง แล้วกด "เชื่อถือ" (Trust) คอมพิวเตอร์นี้
3. บน iPhone: Settings → Privacy & Security → Developer Mode → เปิด แล้วรีสตาร์ตเครื่อง (ถ้ายังไม่เห็นเมนูนี้ ให้ทำข้อ build ด้านล่างหนึ่งครั้งก่อน เมนูจะโผล่หลังจาก Xcode เห็นเครื่อง)

## Build

```bash
git clone https://github.com/smithisrealdev/aigo-app.git
```

```bash
cd aigo-app && git checkout claude/awesome-cori-zvsu1f && npm install
```

ถ้าใช้ Apple ID ฟรี:

```bash
FREE_APPLE_ID=1 npx expo run:ios --device --configuration Release
```

ถ้ามีบัญชี Apple Developer แบบเสียเงิน:

```bash
npx expo run:ios --device --configuration Release
```

- ถ้าถามให้เลือกเครื่อง ให้เลือก iPhone ของคุณ ถ้าถามทีม (Team) ให้เลือกชื่อคุณ
- ครั้งแรกใช้เวลาราว 10–20 นาที เสร็จแล้วแอปจะเปิดบน iPhone เอง
- `--configuration Release` ใส่โค้ดทั้งหมดไว้ในแอป เปิดได้แม้ปิด Mac

## หลังติดตั้ง ถ้าใช้ Apple ID ฟรี

- ครั้งแรกแอปจะยังเปิดไม่ได้ ให้ไปที่ iPhone: Settings → General → VPN & Device Management → เลือก Apple ID ของคุณ → Trust
- แอปหมดอายุใน 7 วัน ถ้าจะใช้ต่อให้รันคำสั่ง build อีกครั้ง
- ปุ่มล็อกอินด้วย Apple ใช้ไม่ได้ใน build นี้ เพราะ Apple ID ฟรีไม่รองรับ ล็อกอินด้วยอีเมลได้ตามปกติ

## ถ้าติดปัญหา

| ข้อความที่เห็น | ทำแบบนี้ |
|---|---|
| Signing requires a development team / No code signing certificates | เปิด `ios/AiGo.xcworkspace` ใน Xcode → เลือก AiGo → Signing & Capabilities → Team เลือกชื่อคุณ แล้วรันคำสั่ง build เดิม |
| Personal development teams do not support the Sign in with Apple capability | ใช้คำสั่งที่มี `FREE_APPLE_ID=1` |
| Developer Mode disabled | ทำข้อ 3 ของ "ทำครั้งแรกครั้งเดียว" |
| pod install / CocoaPods error | `brew install cocoapods` แล้วรันคำสั่งเดิม |
| แก้ `app.json` หรือสลับ `FREE_APPLE_ID` แล้วไม่เห็นผล | ลบโฟลเดอร์ `ios` แล้ว build ใหม่ (โฟลเดอร์นี้สร้างใหม่ได้ทุกครั้ง และไม่ได้เก็บใน git) |
