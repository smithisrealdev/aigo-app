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
git clone -b main https://github.com/smithisrealdev/aigo-app.git
```

```bash
cd aigo-app && npm install
```

แผนที่จริงในแอป (Mapbox) ต้องมี public token ของ Mapbox: สมัคร mapbox.com (ฟรี) → Account → Tokens → คัดลอก Default public token (ขึ้นต้นด้วย `pk.`)
แล้วใส่ในไฟล์ `.env.local` ในโฟลเดอร์ `aigo-app` (ไฟล์นี้ไม่เข้า git) ไม่ต้องใช้ secret token ไม่มี token แอปยังใช้ได้ แต่แผนที่จะเป็นภาพวาด

```bash
echo 'EXPO_PUBLIC_MAPBOX_TOKEN=pk.วางtokenของคุณตรงนี้' > .env.local
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
- แอปที่เคยติดตั้งไว้ก่อนมีแผนที่ต้อง build ใหม่ด้วยคำสั่งนี้ (มีโค้ด native ของ Mapbox เพิ่ม) เปิดหน้าแผนที่ครั้งแรกแอปจะขอใช้ตำแหน่ง "ขณะใช้แอป"
- อัปเดต 21 พ.ย. 2026 (แอนิเมชัน ลูกพลังงานตอนวางแผน) เพิ่ม Skia ซึ่งเป็นโค้ด native: แอปที่ build ไว้ก่อนหน้านี้ต้อง `git pull`, `npm install` แล้ว build ใหม่ด้วยคำสั่งเดียวกัน (Expo Go รุ่นล่าสุดมี Skia อยู่แล้ว ไม่ต้องทำอะไร)

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
| แผนที่ยังเป็นภาพวาด ไม่ใช่แผนที่จริง | เช็กว่า `.env.local` มี `EXPO_PUBLIC_MAPBOX_TOKEN=pk...` แล้วรันคำสั่ง build อีกครั้ง (token ถูกใส่ตอน build) |
| แผนที่เป็นสีเทาว่าง | token ผิดหรือถูกปิดใน Mapbox: สร้าง public token ใหม่ใส่ `.env.local` แล้ว build ใหม่ |
