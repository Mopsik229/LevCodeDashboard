// Замените эти значения на данные из вашего проекта Supabase (Settings -> API)
const SUPABASE_URL = 'https://vqyzzctjymrnymhwwtry.supabase.co';
const SUPABASE_ANON_KEY = 'sb_secret_9KxgU7o4xPQtHH440jtc1Q_eFA7GLIo';

// Инициализация клиента Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Экспорт для удобства (поскольку мы не используем модули, supabase доступен в window)
window.supabaseClient = supabase;
