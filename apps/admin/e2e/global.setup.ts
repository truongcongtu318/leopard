import { createServer } from 'node:http';

const HOST = '127.0.0.1';
const PORT = 4011;

export default async function globalSetup() {
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');

    if (request.url !== '/api/v1/me') {
      response.statusCode = 404;
      response.end(JSON.stringify({ code: 'NOT_FOUND' }));
      return;
    }

    const token = request.headers.authorization?.replace(/^Bearer\s+/u, '') ?? '';
    const role = token === 'qa-fleet' ? 'FLEET_OWNER' : token === 'qa-admin' ? 'ADMIN' : null;
    if (!role) {
      response.statusCode = 401;
      response.end(JSON.stringify({ code: 'UNAUTHORIZED' }));
      return;
    }

    response.end(
      JSON.stringify({
        id: role === 'ADMIN' ? 'admin-static-e2e' : 'fleet-static-e2e',
        role,
        status: 'ACTIVE',
      }),
    );
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });

  return async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  };
}
