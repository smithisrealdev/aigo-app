import * as WebBrowser from 'expo-web-browser';
import { ScrollView, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Badge, PhotoBox, PressScale, PriceTag, Section, T, lift } from '@/components/ui';
import { shortDate, type CardKind, type ChatCard } from '@/lib/chat';
import type { L } from '@/lib/i18n';
import { cardLink, type LinkTrip } from '@/lib/links';
import { usePhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { radius, space } from '@/theme/tokens';

// การ์ดจากคำตอบของ AI (สถานที่ เที่ยวบิน ที่พัก ร้าน ตั๋ว บริการ) กดแล้วเปิดเว็บดูราคาจริง จอง หรือแผนที่
// ราคาบนการ์ดเป็นค่าประมาณของ AI: ขึ้นต้นด้วย ~ และมีป้าย "AiGo ประมาณ" ทุกใบ (R15b) ท้ายรายการบอกว่าราคาอาจเปลี่ยนและ AiGo ได้ค่าแนะนำ (R25c)

const GROUPS: { kind: CardKind; title: L; action: L }[] = [
  { kind: 'place', title: { th: 'ที่ห้ามพลาด', en: 'Must-see places' }, action: { th: 'แผนที่', en: 'Map' } },
  { kind: 'flight', title: { th: 'เที่ยวบิน', en: 'Flights' }, action: { th: 'ดูราคาจริง', en: 'Real prices' } },
  { kind: 'hotel', title: { th: 'ที่พัก', en: 'Where to stay' }, action: { th: 'ดูห้องว่าง', en: 'Rooms' } },
  { kind: 'food', title: { th: 'ร้านที่ต้องลอง', en: 'Must-eats' }, action: { th: 'แผนที่', en: 'Map' } },
  { kind: 'ticket', title: { th: 'ตั๋วและกิจกรรม', en: 'Tickets and activities' }, action: { th: 'ดูตั๋ว', en: 'Tickets' } },
  { kind: 'service', title: { th: 'เดินทางและบริการ', en: 'Getting around' }, action: { th: 'ดูราคา', en: 'Prices' } },
];
const PHOTO_KINDS: CardKind[] = ['place', 'hotel', 'food', 'ticket'];
const SERVICE: Record<string, { icon: IconName; tone: 'sky' | 'sun' | 'mint' | 'blush' | 'lilac' }> = {
  car_rental: { icon: 'car', tone: 'sun' }, transfer: { icon: 'car', tone: 'sun' }, rail_pass: { icon: 'train', tone: 'mint' },
  esim: { icon: 'spark', tone: 'lilac' }, insurance: { icon: 'check', tone: 'blush' },
};
const TILE = 232;
const BOOKABLE: CardKind[] = ['flight', 'hotel', 'ticket', 'service'];
/** ราคาประมาณขึ้นต้นด้วย ~ (ยกเว้นของฟรี) */
const approx = (p: string) => (/^\s*(~|ฟรี|free)/i.test(p) ? p.trim() : `~${p.trim()}`);

/** การ์ดทุกชุดในคำตอบ เรียงเป็นกลุ่ม; only = แสดงเฉพาะบางแบบ (หน้าแผนไม่ต้องซ้ำสถานที่) */
export function TripCards({ cards, trip, only }: { cards: ChatCard[]; trip: LinkTrip; only?: CardKind[] }) {
  const { pick } = useSettings();
  const shown = only ? cards.filter((c) => only.includes(c.kind)) : cards;
  const near = (c: ChatCard) => c.area ?? trip.destination;
  const photo = usePhotos(shown.filter((c) => PHOTO_KINDS.includes(c.kind)).map((c) => ({ name: c.name, near: near(c) })));
  if (!shown.length) return null;
  const open = (c: ChatCard) => { WebBrowser.openBrowserAsync(cardLink(c, trip)).catch(() => {}); };
  return (
    <View style={{ gap: space.xl }}>
      {GROUPS.map((g) => {
        const list = shown.filter((c) => c.kind === g.kind);
        if (!list.length) return null;
        return (
          <Section key={g.kind} title={pick(g.title)}>
            {PHOTO_KINDS.includes(g.kind) ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
                {list.map((c, i) => <PhotoTile key={`${c.name}${i}`} c={c} source={photo({ name: c.name, near: near(c) })} action={pick(g.action)} onPress={() => open(c)} />)}
              </ScrollView>
            ) : (
              <View style={{ gap: space.sm }}>
                {list.map((c, i) => <RowTile key={`${c.name}${i}`} c={c} action={pick(g.action)} onPress={() => open(c)} />)}
              </View>
            )}
          </Section>
        );
      })}
      <T v="small" tone="muted">{[
        shown.some((c) => c.price) && pick({ th: 'กดการ์ดเพื่อดูราคาจริงที่เว็บจอง ราคาอาจเปลี่ยนตอนจอง', en: 'Tap a card for the real price on the booking site. Prices may change when you book' }),
        shown.some((c) => BOOKABLE.includes(c.kind)) && pick({ th: 'AiGo ได้ค่าแนะนำจากลิงก์จองโดยราคาไม่เพิ่ม', en: 'AiGo earns a referral fee from booking links at no extra cost to you' }),
        shown.some((c) => PHOTO_KINDS.includes(c.kind)) && pick({ th: 'ภาพจาก Wikipedia และ Wikimedia Commons', en: 'Photos from Wikipedia and Wikimedia Commons' }),
      ].filter(Boolean).join(' · ')}</T>
    </View>
  );
}

/** การ์ดรูป: รูปด้านบน ชื่อ เหตุผลที่ควรไป ราคาและคะแนน */
function PhotoTile({ c, source, action, onPress }: { c: ChatCard; source?: import('expo-image').ImageSource; action: string; onPress: () => void }) {
  const { colors, isDark, t } = useSettings();
  const tag = c.kind === 'food' ? c.cuisine : c.area;
  const facts = [c.price && approx(c.price), c.rating && `★ ${c.rating}`].filter(Boolean).join(' · ');
  return (
    <PressScale onPress={onPress} label={`${c.name}. ${c.why ?? ''} ${facts}${c.price ? `, ${t('price.est')}` : ''}. ${action}`}>
      <View style={[{ width: TILE, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface }, lift(isDark, 0.7), isDark && { borderWidth: 1, borderColor: colors.line }]}>
        <PhotoBox source={source} seed={c.name} style={{ width: TILE, height: 140 }} />
        {tag && <View style={{ position: 'absolute', top: space.sm, left: space.sm }}><Badge label={tag} /></View>}
        <View style={{ padding: space.md, gap: 2, minHeight: 112 }}>
          <T v="bodyBold" numberOfLines={1}>{c.name}</T>
          {c.why && <T v="small" tone="muted" numberOfLines={2}>{c.why}</T>}
          <View style={{ flex: 1 }} />
          {c.price && <PriceTag />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs }}>
            <T v="smallBold" numberOfLines={1} style={{ flex: 1 }}>{facts}</T>
            <T v="smallBold" tone="accent">{action} ›</T>
          </View>
        </View>
      </View>
    </PressScale>
  );
}

/** แถวสำหรับเที่ยวบินและบริการ: ไอคอน เส้นทางหรือชื่อ รายละเอียด ราคา */
function RowTile({ c, action, onPress }: { c: ChatCard; action: string; onPress: () => void }) {
  const { colors, isDark, lang, pick, t } = useSettings();
  const flight = c.kind === 'flight';
  const look = flight ? { icon: 'plane' as IconName, tone: 'sky' as const } : SERVICE[c.type ?? ''] ?? { icon: 'bag' as IconName, tone: 'sun' as const };
  const title = flight ? [c.from && c.to ? `${c.from} → ${c.to}` : undefined, c.airline].filter(Boolean).join(' · ') : c.name;
  const stops = c.type && /direct|nonstop|ตรง/i.test(c.type) ? pick({ th: 'บินตรง', en: 'Direct' }) : c.type;
  const sub = flight ? [c.date && shortDate(c.date, lang === 'th' ? 'th' : 'en'), c.departure, stops].filter(Boolean).join(' · ') : c.why;
  return (
    <PressScale onPress={onPress} label={`${title}. ${sub ?? ''}. ${c.price ? `${approx(c.price)}, ${t('price.est')}` : ''}. ${action}`}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface }, lift(isDark, 0.6), isDark && { borderWidth: 1, borderColor: colors.line }]}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sticker[look.tone] }}>
          <Icon name={look.icon} color={colors.ink} size={22} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyBold" numberOfLines={1}>{title}</T>
          {!!sub && <T v="small" tone="muted" numberOfLines={2}>{sub}</T>}
          {c.price && <T v="smallBold">{approx(c.price)}</T>}
          {c.price && <PriceTag />}
        </View>
        <T v="smallBold" tone="accent">{action} ›</T>
      </View>
    </PressScale>
  );
}
