'use strict';

/**
 * Single Vercel serverless function for the grievance portal.
 *
 * vercel.json rewrites every /api/* request here, so the router below receives
 * the original path (for example /api/grievances/abc). The same handler is used
 * by scripts/dev-server.js for local development. Route handlers live in
 * routes/ and shared helpers in lib/.
 */

const { HttpError, sendJson, parseUrl } = require('../lib/http');
const auth = require('../routes/auth');
const grievances = require('../routes/grievances');
const admin = require('../routes/admin');
const publicRoutes = require('../routes/public');

function index(req, res) {
  sendJson(res, 200, {
    name: 'University Grievance Portal API',
    status: 'ok',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET /api/me',
      'GET /api/meta',
      'GET /api/stats',
      'GET /api/health',
      'POST /api/grievances',
      'GET /api/grievances',
      'GET /api/grievances/:id',
      'PATCH /api/grievances/:id (admin)',
      'GET /api/track?code=GRV-...',
      'GET /api/admin/stats (admin)',
      'GET /api/admin/export (admin)',
    ],
  });
}

// [method, path pattern, handler]. Captured groups are passed as the third argument.
const routes = [
  ['GET', /^\/$/, index],
  ['GET', /^\/health$/, publicRoutes.health],
  ['GET', /^\/meta$/, publicRoutes.meta],
  ['GET', /^\/stats$/, publicRoutes.stats],
  ['GET', /^\/me$/, auth.me],
  ['POST', /^\/auth\/register$/, auth.register],
  ['POST', /^\/auth\/login$/, auth.login],
  ['POST', /^\/auth\/logout$/, auth.logout],
  ['GET', /^\/track$/, grievances.track],
  ['GET', /^\/grievances$/, grievances.list],
  ['POST', /^\/grievances$/, grievances.create],
  ['GET', /^\/grievances\/([\w-]+)$/, grievances.getOne],
  ['PATCH', /^\/grievances\/([\w-]+)$/, grievances.update],
  ['GET', /^\/admin\/stats$/, admin.stats],
  ['GET', /^\/admin\/export$/, admin.exportCsv],
];

module.exports = async function handler(req, res) {
  try {
    const pathname = parseUrl(req).pathname.replace(/^\/api(?=\/|$)/, '') || '/';
    const method = (req.method || 'GET').toUpperCase();
    const route = routes.find(([verb, pattern]) => verb === method && pattern.test(pathname));

    if (!route) throw new HttpError(404, `No API route for ${method} ${pathname}`);

    const match = pathname.match(route[1]);
    await route[2](req, res, match ? match.slice(1) : []);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error('[api]', error);
    if (res.headersSent) return;

    sendJson(res, status, {
      error:
        status >= 500
          ? 'Something went wrong on the server. Please try again in a moment.'
          : error.message,
    });
  }
};
