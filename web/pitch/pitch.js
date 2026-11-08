// Smart Finance · interacciones de la página del pitch (sin dependencias).
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Pantalla de carga
  const hideLoader = () => document.body.classList.add('loaded');
  window.addEventListener('load', () => setTimeout(hideLoader, reduceMotion ? 0 : 500));
  setTimeout(hideLoader, 2500);

  // Navegación: fondo, barra de avance y menú móvil
  const nav = $('#nav');
  const bar = $('#progressBar');
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 10);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = $('#navToggle');
  const menu = $('#mobileMenu');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.hidden = !open;
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  // Aparición, contadores y barras de las gráficas
  const fmt = (n, d) => n.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    const d = Number(el.dataset.decimals || 0);
    if (reduceMotion) { el.textContent = fmt(target, d); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / 1300, 1);
      el.textContent = fmt(target * (1 - Math.pow(1 - t, 3)), d);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const fillBars = (list) => {
    const max = Number(list.dataset.max);
    $$('li', list).forEach((li) => li.querySelector('i').style.setProperty('--w', `${(Number(li.dataset.v) / max) * 100}%`));
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      $$('[data-count]', e.target).forEach(countUp);
      $$('.bars', e.target).forEach(fillBars);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach((el) => io.observe(el));

  // Chat animado con Moni (portada)
  const body = $('#chatBody');
  const script = [
    ['me', 'Gasté 12 mil en almuerzo 🍔'],
    ['moni', 'Listo ✅ Lo guardé en <b>Alimentación</b>. Te quedan <b>$180.000</b> para comida este mes.'],
    ['me', '¿Puedo comprar unos tenis de $380.000?'],
    ['moni', '<b>Con cuidado 🟠</b> Si esperas 2 semanas no retrasas tu meta <b>“Viaje a Cartagena”</b> ✈️'],
  ];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const bubble = (who, html) => {
    const div = document.createElement('div');
    div.className = `msg msg--${who}`;
    div.innerHTML = html;
    body.appendChild(div);
    return div;
  };
  (async function playChat() {
    if (reduceMotion) { script.forEach(([w, t]) => bubble(w, t)); return; }
    for (;;) {
      body.innerHTML = '';
      for (const [who, text] of script) {
        if (who === 'moni') {
          const typing = bubble('moni', '<span class="typing"><i></i><i></i><i></i></span>');
          typing.style.padding = '0';
          await wait(1000);
          typing.remove();
        } else {
          await wait(600);
        }
        bubble(who, text);
        await wait(1400);
      }
      await wait(3500);
    }
  })();

  // Riel lateral: resalta la sección actual
  const steps = $$('[data-step]');
  const railLinks = $$('.rail a');
  let currentIndex = 0;
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      currentIndex = steps.indexOf(e.target);
      railLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  steps.forEach((s) => spy.observe(s));

  // Teclado: ← → (o AvPág/RePág) cambian de sección; T inicia o pausa el cronómetro; R lo reinicia
  const go = (i) => {
    const target = steps[Math.max(0, Math.min(steps.length - 1, i))];
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, iframe, dialog[open]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (['ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); go(currentIndex + 1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(currentIndex - 1); }
    if (e.key === 't' || e.key === 'T') toggleTimer();
    if (e.key === 'r' || e.key === 'R') resetTimer();
  });

  // Cronómetro de 15 minutos
  const LIMIT = 15 * 60;
  const timerBtn = $('#timer');
  const timerText = $('#timerText');
  let remaining = LIMIT;
  let tick = null;
  const paint = () => {
    const s = Math.abs(remaining);
    timerText.textContent = `${remaining < 0 ? '+' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    timerBtn.classList.toggle('is-late', remaining < 0);
  };
  function toggleTimer() {
    if (tick) { clearInterval(tick); tick = null; }
    else { tick = setInterval(() => { remaining -= 1; paint(); }, 1000); }
    timerBtn.classList.toggle('is-running', Boolean(tick));
    timerBtn.setAttribute('aria-label', tick ? 'Pausar cronómetro' : 'Iniciar cronómetro del pitch');
  }
  function resetTimer() {
    clearInterval(tick); tick = null; remaining = LIMIT; paint();
    timerBtn.classList.remove('is-running');
  }
  timerBtn.addEventListener('click', toggleTimer);
  timerBtn.addEventListener('dblclick', resetTimer);

  // Lean Canvas: detalle de cada bloque
  const blocks = {
    problema: { t: 'Problema', m: 'investigando', h: `<ul>
      <li><b>Falta de control</b> sobre los gastos cotidianos: gastos hormiga y suscripciones invisibles.</li>
      <li><b>Falta de educación y acompañamiento</b> financiero.</li>
      <li>Las personas no logran pasar de <b>“llegar a fin de mes”</b> a ahorrar e invertir de forma constante.</li></ul>
      <p><b>Alternativas actuales:</b> Excel, libreta, cuentas mentales o la app de cada banco por separado.</p>` },
    segmento: { t: 'Segmento de clientes', m: 'celebrando', h: `<ul>
      <li>Estudiantes de último año de secundaria y preuniversitarios.</li>
      <li>Estudiantes universitarios.</li>
      <li>Jóvenes profesionales en su primer empleo formal.</li>
      <li>Jóvenes independientes y emprendedores.</li></ul>
      <p><b>Primeros usuarios:</b> universitarios, porque el 95,7 % de los encuestados quiere empezar antes de los 24 años.</p>` },
    propuesta: { t: 'Propuesta de valor', m: 'senalando', h: `<p style="color:var(--text);font-size:1.15rem">Controla tu dinero sin tocar la pantalla: dile todo a tu asistente de IA, automatiza tus registros y recibe consejos inteligentes para hacer crecer tus finanzas.</p>
      <p><b>En una frase:</b> tu asistente financiero por voz.</p>` },
    solucion: { t: 'Solución', m: 'corriendo', h: `<ul>
      <li><b>Registro rápido</b> por voz, atajo o mensaje del banco.</li>
      <li><b>Saldo unificado</b> de bancos, billeteras y efectivo.</li>
      <li><b>Recordatorios</b> de pagos y alertas de presupuesto.</li>
      <li><b>Metas y tips</b> de ahorro.</li>
      <li><b>Asistente con IA</b> que convierte tus datos en recomendaciones.</li></ul>` },
    metricas: { t: 'Métricas clave', m: 'senalando', h: `<ul>
      <li>Porcentaje de usuarios que se convierten a <b>Premium</b>.</li>
      <li>Número de <b>beneficios redimidos</b> con aliados.</li>
      <li><b>Licencias B2B</b> vendidas.</li>
      <li><b>Retención a 30 días</b>.</li>
      <li>Relación <b>LTV / CAC</b>.</li></ul>
      <p>¿La gente paga? ¿El modelo es sostenible? ¿Los usuarios obtienen los beneficios esperados?</p>` },
    ventaja: { t: 'Ventaja especial', m: 'protegiendo', h: `<ul>
      <li><b>Neutralidad:</b> del lado del usuario, no de un banco.</li>
      <li><b>Red de aliados</b> que premian buenos hábitos.</li>
      <li><b>Historia y plan</b> personal que se acumulan.</li>
      <li><b>Canal B2B</b> con empresas y universidades.</li>
      <li><b>Adaptación</b> a la realidad latinoamericana.</li></ul>` },
    canales: { t: 'Canales', m: 'corriendo', h: `<ul>
      <li>Contenido educativo corto y promocional en <b>TikTok e Instagram</b>.</li>
      <li><b>Charlas</b> y espacios sobre finanzas en universidades.</li>
      <li><b>Referidos</b> de conocidos.</li></ul>
      <p>El 57,1 % no conocía estas apps: el primer reto es que nos conozcan. Al descargarla, cada usuario recibe una bienvenida personalizada según su objetivo.</p>` },
    costos: { t: 'Estructura de costos', m: 'investigando', h: `<p><b>Fijos</b></p><ul>
      <li>Personal: desarrollo, diseño y equipo comercial.</li>
      <li>Servidores, alojamiento y almacenamiento en la nube.</li>
      <li>Cuentas de desarrollador (Apple y Google Play).</li>
      <li>Cumplimiento legal, protección de datos y seguridad.</li></ul>
      <p><b>Variables</b></p><ul>
      <li>Consumo de IA por consulta.</li>
      <li>Comisiones de las tiendas por suscripción.</li>
      <li>Marketing, adquisición y atención al cliente.</li></ul>` },
    ingresos: { t: 'Flujo de ingresos', m: 'celebrando', h: `<ul>
      <li><b>Suscripciones Premium</b> (B2C), mensuales o anuales.</li>
      <li><b>Comisiones</b> por referidos de productos financieros.</li>
      <li><b>Campañas comerciales</b> y beneficios de aliados.</li>
      <li><b>Licencias</b> empresariales e institucionales (B2B).</li>
      <li><b>Comisiones</b> por asesorías financieras.</li></ul>
      <p>Sin vender datos: el usuario decide qué producto toma.</p>` },
  };
  const sheet = $('#sheet');
  $$('.lc__cell').forEach((cell) => cell.addEventListener('click', () => {
    const b = blocks[cell.dataset.block];
    $('#sheetTitle').textContent = b.t;
    $('#sheetBody').innerHTML = b.h;
    $('#sheetMoni').src = `/img/moni-${b.m}.webp`;
    if (typeof sheet.showModal === 'function') sheet.showModal(); else sheet.setAttribute('open', '');
  }));
  $('#sheetClose').addEventListener('click', () => sheet.close());
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

  // Demo en vivo: la app se carga dentro del teléfono al tocarla
  const device = $('.device');
  const frame = $('#demoFrame');
  $('#demoStart').addEventListener('click', () => {
    frame.src = frame.dataset.src;
    device.classList.add('is-live');
  });
})();
