const exploreService = require('./explore.service');

async function handleExploreRoutes({ req, res, url, send, readData, readBody }) {
  if (req.method === 'GET' && url.pathname === '/api/explore/places') {
    const data = readData();
    send(res, 200, exploreService.buildExploreHome(data, url.searchParams));
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/explore/route-plan') {
    const data = readData();
    const body = await readBody(req);
    const result = exploreService.buildRoutePlan(data, body);
    send(res, result.status, result.body);
    return true;
  }

  return false;
}

module.exports = {
  handleExploreRoutes
};
