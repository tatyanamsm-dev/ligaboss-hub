-- =============================================
-- LigaBoss Hub — схема базы данных Supabase
-- Запустите этот SQL в редакторе Supabase SQL Editor
-- =============================================

-- 1. Таблица профилей пользователей
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('rop', 'mop')),
  mop_name TEXT CHECK (mop_name IN ('Владимир', 'Анастасия', 'Ксения')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица встреч (календарь Zoom)
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mop_name TEXT NOT NULL CHECK (mop_name IN ('Владимир', 'Анастасия', 'Ксения')),
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_telegram TEXT,
  bitrix_link TEXT,
  status TEXT NOT NULL DEFAULT 'Занято' CHECK (status IN ('Занято', 'Проведено', 'Не пришёл', 'Отмена', 'Перенос')),
  result TEXT CHECK (result IN ('Продажа', 'Отказ', 'Думает')),
  comment TEXT,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Таблица оплат
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings ON DELETE SET NULL,
  mop_name TEXT NOT NULL CHECK (mop_name IN ('Владимир', 'Анастасия', 'Ксения')),
  client_name TEXT NOT NULL,
  tariff TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Карта', 'Наличные', 'Расчётный счёт', 'Рассрочка')),
  bitrix_link TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  comment TEXT,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Автоматическое обновление updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Автосоздание профиля при регистрации
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'mop')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Row Level Security (RLS) — контроль доступа
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Профили: каждый видит свой, РОП видит всех
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rop')
  );

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Встречи: МОП видит только свои, РОП видит все
CREATE POLICY "meetings_select" ON meetings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rop')
    OR mop_name = (SELECT mop_name FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "meetings_insert" ON meetings FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rop')
    OR mop_name = (SELECT mop_name FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "meetings_update" ON meetings FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rop')
    OR mop_name = (SELECT mop_name FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "meetings_delete" ON meetings FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rop')
  );

-- Оплаты: МОП видит только свои, РОП видит все
CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rop')
    OR mop_name = (SELECT mop_name FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rop')
    OR mop_name = (SELECT mop_name FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "payments_update" ON payments FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rop')
    OR mop_name = (SELECT mop_name FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "payments_delete" ON payments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rop')
  );

-- =============================================
-- Индексы для ускорения запросов
-- =============================================
CREATE INDEX meetings_date_idx ON meetings (date);
CREATE INDEX meetings_mop_idx ON meetings (mop_name);
CREATE INDEX payments_date_idx ON payments (payment_date);
CREATE INDEX payments_mop_idx ON payments (mop_name);
