import type { Metadata } from "next";
import Link from "next/link";
import {
  Droplets,
  Target,
  BrainCircuit,
  Gauge,
  Database,
  ShieldCheck,
  AlertTriangle,
  Rocket,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "О проекте",
  description:
    "TASQYN AI — интеллектуальная платформа мониторинга подтоплений Павлодара. Архитектура, AI-адаптер, движок риска и ограничения MVP.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <header>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500">
            <Droplets size={20} className="text-white" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            О проекте TASQYN AI
          </h1>
        </div>
        <p className="text-[15px] leading-relaxed text-fg-dim">
          <b className="text-fg">Intelligent Urban Flood Monitoring &amp; Risk
          Intelligence Platform</b> — интеллектуальная система мониторинга
          подтоплений городских территорий Павлодара. Проект объединяет сообщения
          жителей, AI-анализ фотографий, GIS-карту и аналитику проблемных
          территорий в единую систему поддержки решений для городских служб.
        </p>
      </header>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold">
          <Target size={17} className="text-accent" /> Задача
        </h2>
        <div className="surface p-5 text-[14px] leading-relaxed text-fg-dim">
          Превратить разрозненные сообщения о подтоплениях в структурированную
          городскую систему мониторинга: каждый инцидент получает координаты,
          визуальные доказательства, оценку выраженности и индекс риска, а город —
          карту очагов и повторяющихся проблемных участков.
        </div>
      </section>

      <section id="ai">
        <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold">
          <BrainCircuit size={17} className="text-accent" /> AI Provider Adapter
        </h2>
        <div className="surface space-y-3 p-5 text-[14px] leading-relaxed text-fg-dim">
          <p>
            Модуль анализа построен как адаптер провайдеров с автоматическим
            fallback:
          </p>
          <ul className="ml-4 list-disc space-y-1.5">
            <li>
              <b className="text-fg">OpenAI</b> (gpt-4o-mini, vision) — при наличии
              переменной <code className="font-mono text-[12px] text-accent">OPENAI_API_KEY</code>;
            </li>
            <li>
              <b className="text-fg">Google Gemini</b> (gemini-2.5-flash) — при наличии{" "}
              <code className="font-mono text-[12px] text-accent">GEMINI_API_KEY</code>;
            </li>
            <li>
              <b className="text-fg">DEMO MODE</b> — без ключей: прозрачная
              клиентская эвристика (статистика пикселей фото + ключевые слова
              описания). Каждый такой результат помечен <code className="font-mono text-[12px] text-[#92400e]">is_demo: true</code>{" "}
              и бейджем DEMO.
            </li>
          </ul>
          <p className="text-[13px] text-fg-mute">
            Таймаут, ошибки сети и недоступность провайдера не блокируют отправку
            инцидента — система честно понижается до демо-анализа. Платные API
            вызываются только при настроенном пользователем ключе.
          </p>
        </div>
      </section>

      <section id="risk">
        <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold">
          <Gauge size={17} className="text-accent" /> Risk Scoring Engine
        </h2>
        <div className="surface space-y-3 p-5 text-[14px] leading-relaxed text-fg-dim">
          <p>
            Детерминированный индекс 0–100 складывается из шести факторов с
            прозрачными весами:
          </p>
          <ul className="ml-4 list-disc space-y-1.5">
            <li>оценка глубины воды — до 28;</li>
            <li>проходимость участка — до 14;</li>
            <li>AI-признаки подтопления (× уверенность) — до 20;</li>
            <li>плотность соседних инцидентов (800 м) — до 15;</li>
            <li>свежесть данных — до 10;</li>
            <li>повторяемость точки (350 м, 30 дней) — до 13.</li>
          </ul>
          <p className="rounded-lg border border-[#fcd34d] bg-[#fffbeb] p-3 text-[13px] text-[#92400e]">
            <AlertTriangle size={13} className="mr-1.5 inline" />
            Это индекс срочности реагирования на сообщения, а НЕ прогноз наводнения
            и не гидрологическая модель. Расшифровка каждого фактора показывается в
            карточке инцидента и при заполнении формы.
          </p>
        </div>
      </section>

      <section id="supabase">
        <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold">
          <Database size={17} className="text-accent" /> Данные и хранение
        </h2>
        <div className="surface space-y-3 p-5 text-[14px] leading-relaxed text-fg-dim">
          <p>
            Слой данных автоматически выбирает режим:
          </p>
          <ul className="ml-4 list-disc space-y-1.5">
            <li>
              <b className="text-fg">SUPABASE</b> — PostgreSQL-таблица{" "}
              <code className="font-mono text-[12px] text-accent">flood_reports</code> с
              RLS-политиками, комментарии и история; фотографии — в Storage.
            </li>
            <li>
              <b className="text-fg">DEMO</b> — без ключей: данные хранятся локально в
              браузере (localStorage), вместе с синтетическим набором демо-инцидентов
              Павлодара (все помечены <code className="font-mono text-[12px]">is_demo = true</code>).
            </li>
          </ul>
          <p>
            SQL-миграция и инструкция подключения — в файле{" "}
            <code className="font-mono text-[12px] text-accent">supabase/migrations/0001_init.sql</code>{" "}
            и README.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold">
          <ShieldCheck size={17} className="text-accent" /> Безопасность и качество данных
        </h2>
        <div className="surface space-y-2 p-5 text-[13.5px] leading-relaxed text-fg-dim">
          <p>· Валидация всех входных данных (Zod на клиенте, SQL-ограничения и CHECK в БД).</p>
          <p>· Запросы к Supabase выполняются через параметризованный клиент-SDK (защита от SQL-инъекций).</p>
          <p>· Фотографии: ограничение типа (PNG/JPEG/WebP), размера (до 20 МБ) и клиентское сжатие.</p>
          <p>· Демо-данные всегда помечены и визуально отделены от пользовательских сообщений.</p>
          <p>· RLS-политики: публичное чтение и вставка инцидентов, административные операции — для авторизованных ролей.</p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-[17px] font-bold">
          <AlertTriangle size={17} className="text-accent" /> Ограничения MVP
        </h2>
        <div className="surface space-y-2 p-5 text-[13.5px] leading-relaxed text-fg-mute">
          <p>· Демонстрационная авторизация администратора (клиентская проверка пароля) — не production-аутентификация.</p>
          <p>· Демо-инциденты синтетические и не являются реальными подтоплениями Павлодара.</p>
          <p>· AI-анализ без ключей — эвристика, а не модель компьютерного зрения.</p>
          <p>· Индекс риска — не прогноз наводнения.</p>
          <p>· Геокодирование адресов не подключено (только координаты и ориентиры).</p>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="surface relative flex flex-col items-center gap-4 p-8 text-center">
          <Rocket size={22} className="text-accent" />
          <h2 className="text-xl font-bold">Готовы посмотреть систему в работе?</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/map" className="btn btn-primary">
              Открыть карту <ArrowRight size={15} />
            </Link>
            <Link href="/report" className="btn btn-ghost">
              Сообщить о подтоплении
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
