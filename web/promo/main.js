// Smart Finance · interacciones de la página promocional (sin dependencias).
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Pantalla de carga: se oculta al cargar (o a los 2,5 s como máximo).
  const hideLoader = () => document.body.classList.add('loaded');
  window.addEventListener('load', () => setTimeout(hideLoader, reduceMotion ? 0 : 600));
  setTimeout(hideLoader, 2500);

  // 2. Navegación: fondo al hacer scroll y menú móvil.
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('mobileMenu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.hidden = !open;
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  // 3. Aparición suave de secciones y contadores animados.
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion || target === 0) { el.textContent = String(target); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / 1200, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      e.target.querySelectorAll?.('[data-count]').forEach(countUp);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal, .hero__stats').forEach((el) => io.observe(el));

  // 4. Chat animado con Moni (se repite en bucle).
  const body = document.getElementById('chatBody');
  const script = [
    ['me', '¿Puedo comprar unos tenis de $380.000?'],
    ['moni', '<b>Con cuidado 🟠</b> Puedes pagarlo, pero usarías el 60 % de lo que te queda este mes.'],
    ['moni', 'Si esperas 2 semanas, no retrasas tu meta <b>“Viaje a Cartagena”</b> ✈️'],
    ['me', '¡Mejor espero! 🙌'],
  ];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const bubble = (who, html) => {
    const div = document.createElement('div');
    div.className = `msg msg--${who}`;
    div.innerHTML = html;
    body.appendChild(div);
    return div;
  };
  async function playChat() {
    if (reduceMotion) { script.forEach(([w, t]) => bubble(w, t)); return; }
    for (;;) {
      body.innerHTML = '';
      for (const [who, text] of script) {
        if (who === 'moni') {
          const typing = bubble('moni', '<span class="typing"><i></i><i></i><i></i></span>');
          typing.style.padding = '0';
          await wait(1100);
          typing.remove();
        } else {
          await wait(700);
        }
        bubble(who, text);
        await wait(1300);
      }
      await wait(3500);
    }
  }
  playChat();

  // 5. Pestañas del showcase: cambian la pantalla y la pose de Moni.
  const img = document.getElementById('showcaseImg');
  const moni = document.getElementById('showcaseMoni');
  const tabs = document.querySelectorAll('.tabs [role="tab"]');
  let current = 0;
  const select = (i) => {
    current = i;
    tabs.forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
    const tab = tabs[i];
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = `/img/app-${tab.dataset.shot}.webp`;
      img.alt = `Pantalla de la app: ${tab.querySelector('b').textContent}`;
      moni.src = `/img/moni-${tab.dataset.moni}.webp`;
      img.style.opacity = '1';
    }, 180);
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => { select(i); clearInterval(auto); }));
  // Precarga para que el cambio sea instantáneo.
  tabs.forEach((t) => { new Image().src = `/img/app-${t.dataset.shot}.webp`; new Image().src = `/img/moni-${t.dataset.moni}.webp`; });
  const auto = reduceMotion ? null : setInterval(() => select((current + 1) % tabs.length), 4500);

  // 6. Demo en vivo: la app se carga dentro del teléfono solo cuando la piden.
  const device = document.querySelector('.device');
  const frame = document.getElementById('demoFrame');
  document.getElementById('demoStart').addEventListener('click', () => {
    frame.src = frame.dataset.src;
    device.classList.add('is-live');
  });
})();
