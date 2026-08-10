document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем, авторизован ли пользователь. Если да, перекидываем в дашборд.
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        window.location.href = 'index.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('error-message');
    const loginBtn = document.getElementById('login-btn');
    const btnText = loginBtn.querySelector('span');
    const spinner = document.getElementById('login-spinner');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Reset state
        errorMsg.style.display = 'none';
        btnText.style.display = 'none';
        spinner.style.display = 'block';
        loginBtn.disabled = true;

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            // Успешная авторизация - переход в дашборд
            window.location.href = 'index.html';
            
        } catch (error) {
            errorMsg.textContent = error.message || 'Ошибка входа. Проверьте почту и пароль.';
            errorMsg.style.display = 'block';
            
            // Восстанавливаем кнопку
            btnText.style.display = 'inline';
            spinner.style.display = 'none';
            loginBtn.disabled = false;
        }
    });
});
