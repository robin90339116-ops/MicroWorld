const interestClubService = require('./interest-club.service');

async function handleInterestClubRoutes({
  req,
  res,
  url,
  send,
  readData
}) {
  if (req.method === 'GET' && url.pathname === '/api/interests') {
    const data = readData();
    send(res, 200, interestClubService.listInterests(data, url.searchParams));
    return true;
  }

  const interestClubsMatch = url.pathname.match(/^\/api\/interests\/([^/]+)\/clubs$/);
  if (req.method === 'GET' && interestClubsMatch) {
    const data = readData();
    const result = interestClubService.listInterestClubs(data, interestClubsMatch[1]);
    send(res, result.status, result.body);
    return true;
  }

  const interestDetailMatch = url.pathname.match(/^\/api\/interests\/([^/]+)$/);
  if (req.method === 'GET' && interestDetailMatch) {
    const data = readData();
    const result = interestClubService.getInterest(data, interestDetailMatch[1]);
    send(res, result.status, result.body);
    return true;
  }

  const clubLeaderboardMatch = url.pathname.match(/^\/api\/clubs\/([^/]+)\/leaderboard$/);
  if (req.method === 'GET' && clubLeaderboardMatch) {
    const result = interestClubService.clubLeaderboard(clubLeaderboardMatch[1]);
    send(res, result.status, result.body);
    return true;
  }

  const clubDetailMatch = url.pathname.match(/^\/api\/clubs\/([^/]+)$/);
  if (req.method === 'GET' && clubDetailMatch) {
    const data = readData();
    const result = interestClubService.getClub(data, clubDetailMatch[1]);
    send(res, result.status, result.body);
    return true;
  }

  return false;
}

module.exports = {
  handleInterestClubRoutes
};
