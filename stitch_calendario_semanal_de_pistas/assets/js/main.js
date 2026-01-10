document.addEventListener('DOMContentLoaded', () => {
  const headerContainer = document.createElement('header');
  const footerContainer = document.createElement('footer');
  document.body.prepend(headerContainer);
  document.body.append(footerContainer);

  const token = getCookie('token');
  let user = null;
  if (token) {
    try {
      user = JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      console.error('Error parsing token:', e);
    }
  }

  renderHeader(headerContainer, user);
  renderFooter(footerContainer, user);
});

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function renderHeader(container, user) {
  const homeUrl = user ? "/calendario_semanal_de_pistas_1/code.html" : "/inicio_de_sesion/code.html";
  container.innerHTML = `
    <div class="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
      <a href="${homeUrl}" class="text-2xl font-bold text-primary">Padel Booking</a>
      <div>
        ${user ? `
          <span class="text-gray-800 dark:text-white mr-4">Hola, ${user.name}</span>
        ` : `
          <a href="/inicio_de_sesion/code.html" class="text-primary hover:underline">Iniciar Sesión</a>
          <a href="/registro_de_usuario/code.html" class="ml-4 text-primary hover:underline">Registrarse</a>
        `}
      </div>
    </div>
  `;
}

function renderFooter(container, user) {
  if (!user) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <nav class="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 shadow-t-md flex justify-around p-4">
      <a href="/calendario_semanal_de_pistas_1/code.html" class="text-primary hover:underline">Calendario</a>
      <a href="/mis_reservas/code.html" class="text-primary hover:underline">Mis Reservas</a>
      ${user.role === 'admin' ? `
        <a href="/dashboard_de_administración/code.html" class="text-primary hover:underline">Admin Dashboard</a>
      ` : ''}
      <a href="#" id="logout-btn" class="text-primary hover:underline">Salir</a>
    </nav>
  `;

  document.getElementById('logout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/logout', { method: 'POST' });
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.href = '/inicio_de_sesion/code.html';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  });
}
