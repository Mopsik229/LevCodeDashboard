document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('error-message');
    const loginBtn = document.getElementById('login-btn');
    const btnText = loginBtn.querySelector('span');
    const spinner = document.getElementById('login-spinner');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Функция для вывода ошибки
    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    }

    function hideError() {
        errorMsg.textContent = '';
        errorMsg.style.display = 'none';
    }

    function setLoading(isLoading) {
        if (isLoading) {
            btnText.style.display = 'none';
            spinner.style.display = 'block';
            loginBtn.disabled = true;
        } else {
            btnText.style.display = 'inline';
            spinner.style.display = 'none';
            loginBtn.disabled = false;
        }
    }

    // Привязываем обработчик отправки формы СИНХРОННО, чтобы избежать перезагрузки страницы
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError('Пожалуйста, заполните все поля.');
            return;
        }

        if (!window.supabaseClient) {
            showError('Не удалось инициализировать подключение к серверу. Попробуйте обновить страницу.');
            return;
        }

        setLoading(true);

        try {
            // Таймаут на случай медленного ответа сети
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('TIMEOUT')), 12000);
            });

            let authResult;
            try {
                const authPromise = window.supabaseClient.auth.signInWithPassword({
                    email,
                    password,
                });
                authResult = await Promise.race([authPromise, timeoutPromise]);
                if (authResult.error) {
                    throw authResult.error;
                }
            } catch (err) {
                const isProxyError = err.message?.includes('JSON') || 
                                     err.message?.includes('Unexpected') ||
                                     err.message?.includes('Failed to execute');

                if (isProxyError && window.DIRECT_SUPABASE_URL && window.supabase) {
                    console.warn('Сбой прокси, попытка прямого подключения к Supabase...', err);
                    const directClient = window.supabase.createClient(window.DIRECT_SUPABASE_URL, window.SUPABASE_ANON_KEY, {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true,
                            storage: window.localStorage
                        }
                    });
                    const directPromise = directClient.auth.signInWithPassword({ email, password });
                    authResult = await Promise.race([directPromise, timeoutPromise]);
                    if (authResult.error) {
                        throw authResult.error;
                    }
                    window.supabaseClient = directClient;
                } else {
                    throw err;
                }
            }

            const { data } = authResult;
            if (data?.session) {
                // Успешная авторизация - переход в дашборд
                window.location.href = 'index.html';
            } else {
                throw new Error('Не удалось получить сессию авторизации.');
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            let msg = error.message;

            if (msg === 'TIMEOUT' || msg?.includes('Failed to fetch') || msg?.includes('NetworkError') || error.name === 'AuthRetryableFetchError') {
                msg = 'Ошибка соединения с базой данных. Проверьте интернет или включенный VPN.';
            } else if (msg?.includes('Unexpected token') || msg?.includes('not valid JSON') || msg?.includes('Unexpected end of JSON input') || msg?.includes("Failed to execute 'json'")) {
                msg = 'Ошибка соединения с сервером авторизации. Проверьте соединение или попробуйте с VPN.';
            } else if (msg === 'Invalid login credentials' || msg?.includes('invalid_credentials')) {
                msg = 'Неверный email или пароль.';
            } else if (msg === 'Email not confirmed' || msg?.includes('email_not_confirmed')) {
                msg = 'Email не подтвержден. Проверьте почту.';
            } else if (msg === 'User not found') {
                msg = 'Пользователь с таким email не найден.';
            } else if (!msg) {
                msg = 'Неизвестная ошибка входа. Попробуйте позже.';
            }

            showError(msg);
            setLoading(false);
        }
    });

    // Фоновая проверка существующей сессии (не блокирует форму)
    (async function checkExistingSession() {
        try {
            if (!window.supabaseClient) return;

            const sessionPromise = window.supabaseClient.auth.getSession();
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 3000));

            const { data } = await Promise.race([sessionPromise, timeoutPromise]);
            if (data?.session) {
                window.location.href = 'index.html';
            }
        } catch (err) {
            console.warn('Не удалось автоматически проверить существующую сессию:', err);
        }
    })();
});

