import type { FloodReport } from "./types";

/**
 * СИНТЕТИЧЕСКИЕ демонстрационные данные TASQYN AI.
 *
 * Все записи имеют is_demo = true и НЕ являются реальными подтоплениями.
 * Координаты — правдоподобные точки в разных частях Павлодара, GPS-подтверждённых
 * адресов подтоплений не существует: внимательно относитесь к их демонстрации.
 */

const DAY = 86_400_000;

interface Seed {
  id: string;
  title: string;
  description: string;
  lat: number;
  lon: number;
  depth: number | null;
  accessibility: FloodReport["accessibility"];
  severity: FloodReport["severity"];
  risk: number;
  status: FloodReport["status"];
  district: string;
  daysAgo: number;
}

const SEEDS: Seed[] = [
  {
    id: "demo_01",
    title: "Скопление воды у пешеходного перехода",
    description: "После ночных осадков вода стоит у бордюра, пешеходный переход подтоплен. Люди переходят дорогу по обочине.",
    lat: 52.2893, lon: 76.9507,
    depth: 15, accessibility: "limited",
    severity: "high", risk: 71,
    status: "confirmed", district: "Набережная Иртыша",
    daysAgo: 0.8,
  },
  {
    id: "demo_02",
    title: "Затопление дворовой территории",
    description: "Вода заливает двор между домами, дорожки непроходимы. Жители просят проверить ливневую канализацию.",
    lat: 52.3021, lon: 76.9452,
    depth: 25, accessibility: "blocked",
    severity: "critical", risk: 88,
    status: "new", district: "Центр",
    daysAgo: 0.3,
  },
  {
    id: "demo_03",
    title: "Подтопление обочины вдоль дороги",
    description: "Длинный участок у стройки: вода стоит вдоль обочины, сужается проезжая часть.",
    lat: 52.2704, lon: 76.9223,
    depth: 10, accessibility: "limited",
    severity: "medium", risk: 52,
    status: "confirmed", district: "Сортировка",
    daysAgo: 1.5,
  },
  {
    id: "demo_04",
    title: "Лужа глубиной ~20 см на парковке",
    description: "Парковка у магазина после дождя превращается в одну большую лужу, машины заезжают по воде.",
    lat: 52.2956, lon: 76.9761,
    depth: 20, accessibility: "limited",
    severity: "medium", risk: 47,
    status: "reviewing", district: "Центр",
    daysAgo: 2.2,
  },
  {
    id: "demo_05",
    title: "Вода у входа в остановочный павильон",
    description: "Подтоплен подход к остановке, пассажиры вынуждены идти по воде. Стоит с утра.",
    lat: 52.2834, lon: 76.9677,
    depth: 8, accessibility: "limited",
    severity: "medium", risk: 41,
    status: "new", district: "Центр",
    daysAgo: 0.2,
  },
  {
    id: "demo_06",
    title: "Подтопление тротуара у школы",
    description: "Дети идут по проезжей части, потому что тротуар залит водой. Просьба проверить сток.",
    lat: 52.3126, lon: 76.9086,
    depth: 12, accessibility: "limited",
    severity: "high", risk: 74,
    status: "confirmed", district: "Сортировка",
    daysAgo: 1.1,
  },
  {
    id: "demo_07",
    title: "Вода на низком участке у железной дороги",
    description: "Вода стоит на переезде и у лежачего полицейского — медленно уходит, водители объезжают край.",
    lat: 52.2586, lon: 76.9391,
    depth: 18, accessibility: "limited",
    severity: "high", risk: 65,
    status: "confirmed", district: "Ленинский район",
    daysAgo: 3.0,
  },
  {
    id: "demo_08",
    title: "Подтопление зоны у Кашканского озера",
    description: "Уровень прибрежных зон вырос, вода на нижней дорожке набережной озера.",
    lat: 52.3079, lon: 76.9989,
    depth: 16, accessibility: "limited",
    severity: "medium", risk: 49,
    status: "new", district: "Кашканское озеро",
    daysAgo: 1.8,
  },
  {
    id: "demo_09",
    title: "Пешеходная дорожка в воде",
    description: "Дорожка к рынку залита водой; пешеходы обходят по обочине проезжей части.",
    lat: 52.2796, lon: 76.9326,
    depth: 14, accessibility: "limited",
    severity: "medium", risk: 45,
    status: "resolved", district: "Центр",
    daysAgo: 5.5,
  },
  {
    id: "demo_10",
    title: "Затопление перекрёстка после дождя",
    description: "После сильного дождя перекрёсток не освобождается: обе стороны залиты.",
    lat: 52.2925, lon: 76.9830,
    depth: 22, accessibility: "blocked",
    severity: "critical", risk: 86,
    status: "reviewing", district: "Центр",
    daysAgo: 0.5,
  },
  {
    id: "demo_11",
    title: "Вода у торгового центра",
    description: "Небольшой слой воды стекает вдоль дороги; водители объезжают край.",
    lat: 52.3078, lon: 76.9596,
    depth: 7, accessibility: "free",
    severity: "low", risk: 22,
    status: "resolved", district: "Южный",
    daysAgo: 6.0,
  },
  {
    id: "demo_12",
    title: "Подтопление детского двора",
    description: "Детская площадка в воде после прошедших дождей. Просьба проверить дренаж.",
    lat: 52.2661, lon: 76.9513,
    depth: 9, accessibility: "free",
    severity: "low", risk: 28,
    status: "reviewing", district: "Ленинский район",
    daysAgo: 2.8,
  },
  {
    id: "demo_13",
    title: "Большая лужа у въезда во двор",
    description: "Машина застревает при выезде со двора, колесо полностью в воде.",
    lat: 52.2888, lon: 77.0094,
    depth: 25, accessibility: "limited",
    severity: "high", risk: 60,
    status: "confirmed", district: "Затон",
    daysAgo: 1.2,
  },
  {
    id: "demo_14",
    title: "Стоячая вода на низменном участке",
    description: "Вода зеленоватая и приближается к дому, предположительно из переполненной канавы.",
    lat: 52.2498, lon: 76.9182,
    depth: 30, accessibility: "blocked",
    severity: "critical", risk: 92,
    status: "new", district: "Южный",
    daysAgo: 0.4,
  },
  {
    id: "demo_15",
    title: "Слабое подтопление после ливня",
    description: "Вода уходит медленно, заметны ямы под водой. Следует объезжать или идти осторожно.",
    lat: 52.3184, lon: 76.9682,
    depth: 6, accessibility: "free",
    severity: "low", risk: 18,
    status: "resolved", district: "Сортировка",
    daysAgo: 7.5,
  },
  {
    id: "demo_16",
    title: "Подтопление у моста через Иртыш.",
    description: "Подтоплена пешеходная часть набережной у моста, вода над бордюром.",
    lat: 52.3013, lon: 76.9369,
    depth: 12, accessibility: "limited",
    severity: "high", risk: 57,
    status: "confirmed", district: "Набережная Иртыша",
    daysAgo: 2.0,
  },
  {
    id: "demo_17",
    title: "Вода на парковке у рынка",
    description: "Вода после дождя на парковке, читаются следы протека вдоль ближе ко входу.",
    lat: 52.2817, lon: 76.9889,
    depth: 11, accessibility: "limited",
    severity: "medium", risk: 42,
    status: "reviewing", district: "Затон",
    daysAgo: 3.4,
  },
  {
    id: "demo_18",
    title: "Подтопление тротуара у вокзала",
    description: "Подтоплен тротуар у входа на платформу, пешеходы идут по воде.",
    lat: 52.3089, lon: 76.9301,
    depth: 10, accessibility: "limited",
    severity: "medium", risk: 48,
    status: "resolved", district: "Вокзальная зона",
    daysAgo: 9.0,
  },
  {
    id: "demo_19",
    title: "Вода на обочине у набережной",
    description: "Обочина подтоплена после ливня, вода уходит медленно; край тротуара в воде.",
    lat: 52.2885, lon: 76.9480,
    depth: 9, accessibility: "limited",
    severity: "medium", risk: 44,
    status: "reviewing", district: "Набережная Иртыша",
    daysAgo: 1.6,
  },
  {
    id: "demo_20",
    title: "Подтопленная дорожка во дворе",
    description: "Пешеходная дорожка во дворе под водой ~5 см, обходят по газону.",
    lat: 52.3066, lon: 76.9419,
    depth: 5, accessibility: "free",
    severity: "low", risk: 26,
    status: "new", district: "Центр",
    daysAgo: 0.6,
  },
  {
    id: "demo_21",
    title: "Глубокая лужа у въезда на промплощадку",
    description: "Перед въездом глубокая вода, легковые авто разворачиваются.",
    lat: 52.2469, lon: 76.9245,
    depth: 28, accessibility: "blocked",
    severity: "critical", risk: 83,
    status: "new", district: "Южный",
    daysAgo: 0.7,
  },
  {
    id: "demo_22",
    title: "Вода на переходе у школы",
    description: "Переход залит водой, дети обходят по проезжей части.",
    lat: 52.3162, lon: 76.9151,
    depth: 13, accessibility: "limited",
    severity: "high", risk: 66,
    status: "confirmed", district: "Сортировка",
    daysAgo: 2.4,
  },
];

export function buildDemoReports(): FloodReport[] {
  return SEEDS.map(seedToReport);
}

function seedToReport(
  s: Seed,
): FloodReport {
  const createdAt = new Date(Date.now() - s.daysAgo * DAY).toISOString();
  const updatedAt = new Date(
    Date.now() -
      (s.status === "resolved" ? Math.max(0.3, s.daysAgo - 1) : s.daysAgo * 0.8) *
        DAY,
  ).toISOString();
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    latitude: s.lat,
    longitude: s.lon,
    photo_url: null,
    water_depth: s.depth,
    accessibility: s.accessibility,
    severity: s.severity,
    risk_score: s.risk,
    confidence: Math.min(0.95, 0.78 + (s.risk / 100) * 0.15),
    status: s.status,
    ai_analysis: null,
    district: s.district.trim(),
    risk_factors: null,
    is_demo: true,
    reporter_contact: null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}
