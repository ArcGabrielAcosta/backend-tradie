import { Injectable } from '@nestjs/common';

export type SystemStatus = {
  status: 'online';
  environment: string;
  port: string | number;
  uptimeSeconds: number;
  nodeVersion: string;
  swaggerPath: string;
  nestlensPath: string;
};

@Injectable()
export class WelcomePage {
  render(status: SystemStatus): string {
    const swaggerHref = `/${status.swaggerPath.replace(/^\//, '')}`;
    const nestlensHref = status.nestlensPath.startsWith('/')
      ? status.nestlensPath
      : `/${status.nestlensPath}`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tradie API — Backend</title>
  <link rel="icon" href="/assets/tradie-mark.png" type="image/png" />
  <link rel="stylesheet" href="/welcome.css" />
</head>
<body>
  <main class="page">
    <section class="hero">
      <a class="brand" href="/" aria-label="Tradie">
        <img src="/assets/tradie-logo.png" alt="Tradie — Plataforma de Oficios" />
      </a>
      <h1>Bienvenido al backend de Tradie</h1>
      <p>
        API NestJS para la plataforma de oficios. Desde aquí podés revisar el estado
        del sistema y acceder a la documentación OpenAPI y al panel de observabilidad.
      </p>
    </section>

    <section class="status" aria-label="Estado del sistema">
      <div class="status-head">
        <p class="status-title">Estado del sistema</p>
        <span class="badge">
          <span class="badge-dot" aria-hidden="true"></span>
          Online
        </span>
      </div>
      <div class="metrics">
        <div class="metric">
          <span>Entorno</span>
          <strong>${escapeHtml(status.environment)}</strong>
        </div>
        <div class="metric">
          <span>Puerto</span>
          <strong>${escapeHtml(String(status.port))}</strong>
        </div>
        <div class="metric">
          <span>Uptime</span>
          <strong>${formatUptime(status.uptimeSeconds)}</strong>
        </div>
        <div class="metric">
          <span>Node.js</span>
          <strong>${escapeHtml(status.nodeVersion)}</strong>
        </div>
      </div>
    </section>

    <section class="tools" aria-label="Herramientas de desarrollo">
      <a class="tool" href="${swaggerHref}">
        <div class="tool-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </div>
        <div>
          <h2>Swagger</h2>
          <p>Documentación interactiva de endpoints OpenAPI para explorar y probar la API.</p>
        </div>
        <span class="tool-arrow" aria-hidden="true">→</span>
      </a>

      <a class="tool" href="${nestlensHref}">
        <div class="tool-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
        <div>
          <h2>NestLens</h2>
          <p>Observabilidad local estilo Telescope: requests, excepciones, queries y más.</p>
        </div>
        <span class="tool-arrow" aria-hidden="true">→</span>
      </a>
    </section>

    <p class="footer">Tradie API · desarrollo local</p>
  </main>
</body>
</html>`;
  }
}

function formatUptime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
