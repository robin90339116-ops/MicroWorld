const ratingService = require('../review-rating/rating.service');

const FRONTEND_REQUIRED_PLACE_FIELDS = [
  'id',
  'name',
  'shortName',
  'tags',
  'score',
  'attendanceCount',
  'nfcTouches',
  'rating',
  'trustLabel',
  'socialPressure',
  'address',
  'introduction',
  'activities'
];

function average(values) {
  return ratingService.average(values);
}

function geoDistanceMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
  const radians = value => value * Math.PI / 180;
  const earthRadius = 6371000;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const startLatitude = radians(latitudeA);
  const endLatitude = radians(latitudeB);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}

function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return '';
  }
  if (distanceMeters < 1000) {
    return `${Math.max(10, Math.round(distanceMeters / 10) * 10)}m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

function enrichPlace(data, place, origin) {
  const ratingSummary = ratingService.summarizePlaceRating(data, place);
  const distanceMeters = origin && Number.isFinite(place.latitude) && Number.isFinite(place.longitude) ?
    geoDistanceMeters(origin.latitude, origin.longitude, place.latitude, place.longitude) :
    Number(place.distanceMeters || 0);

  return {
    ...place,
    ...ratingSummary,
    distanceMeters,
    distance: distanceMeters > 0 ? formatDistance(distanceMeters) : place.distance,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
    mapMarker: {
      id: place.id,
      label: place.shortName || place.name,
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
      kind: place.ar ? 'ar-place' : 'place'
    },
    routeEntrypoints: {
      systemNavigation: true,
      routePlan: true,
      aiRoute: false,
      aiRouteDeferred: true
    }
  };
}

function originFromSearchParams(searchParams) {
  const latitude = Number(searchParams && searchParams.get('latitude'));
  const longitude = Number(searchParams && searchParams.get('longitude'));
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

function searchableText(place) {
  const activityText = (place.activities || []).map(activity => {
    return `${activity.title || ''} ${activity.category || ''} ${activity.type || ''} ${activity.description || ''}`;
  }).join(' ');
  return [
    place.name,
    place.shortName,
    (place.tags || []).join(' '),
    place.address || '',
    place.introduction || '',
    activityText
  ].join(' ').toLowerCase();
}

function filterPlace(place, searchParams) {
  const query = String(searchParams && searchParams.get('q') || '').trim().toLowerCase();
  const interest = String(searchParams && searchParams.get('interest') || '').trim();
  const maxDistance = Number(
    (searchParams && (searchParams.get('maxDistance') || searchParams.get('maxDistanceMeters') || searchParams.get('distance'))) || ''
  );

  if (query && !searchableText(place).includes(query)) {
    return false;
  }
  if (interest && interest !== '全部' && !((place.tags || []).includes(interest)) &&
      !(place.activities || []).some(activity => activity.category === interest)) {
    return false;
  }
  if (Number.isFinite(maxDistance) && maxDistance > 0 && place.distanceMeters > maxDistance) {
    return false;
  }
  return true;
}

function qualityScore(place) {
  const rating = ratingService.normalizedRating(place);
  return Number(place.score || 0) * 20 +
    rating.comfort +
    rating.match +
    rating.safety * 0.6 +
    Number(place.trustScore || 0) +
    Math.min(Number(place.attendanceCount || 0), 250) * 0.08;
}

function listPlaces(data, searchParams) {
  const origin = originFromSearchParams(searchParams);
  return (data.places || [])
    .map(place => enrichPlace(data, place, origin))
    .filter(place => filterPlace(place, searchParams))
    .sort((left, right) => qualityScore(right) - qualityScore(left));
}

function listActivities(places) {
  return places.flatMap(place => {
    return (place.activities || []).map(activity => ({
      ...activity,
      placeId: place.id,
      placeName: place.shortName || place.name,
      distance: place.distance,
      trustLabel: place.trustLabel,
      socialPressure: place.socialPressure
    }));
  });
}

function buildExploreHome(data, searchParams) {
  const places = listPlaces(data, searchParams);
  return {
    places,
    activities: listActivities(places),
    meta: {
      contract: 'SmallWorld Explore v1',
      frontendRequiredFields: FRONTEND_REQUIRED_PLACE_FIELDS,
      filters: {
        q: String(searchParams && searchParams.get('q') || ''),
        interest: String(searchParams && searchParams.get('interest') || '全部'),
        maxDistance: String(searchParams && (searchParams.get('maxDistance') || searchParams.get('distance')) || '')
      },
      deferred: {
        aiRoute: true
      }
    }
  };
}

function pickPlace(data, placeId) {
  return (data.places || []).find(place => place.id === placeId);
}

function buildRoutePlan(data, body) {
  const place = pickPlace(data, body.placeId);
  if (!place) {
    return { status: 404, body: { error: 'PLACE_NOT_FOUND', message: '地点不存在' } };
  }
  const startLatitude = Number(body.latitude);
  const startLongitude = Number(body.longitude);
  if (!Number.isFinite(startLatitude) || !Number.isFinite(startLongitude)) {
    return { status: 400, body: { error: 'LOCATION_REQUIRED', message: '需要当前位置才能规划路线' } };
  }
  const directDistance = geoDistanceMeters(startLatitude, startLongitude, place.latitude, place.longitude);
  const walkingDistance = Math.max(120, Math.round(directDistance * 1.22));
  return {
    status: 200,
    body: {
      placeId: place.id,
      placeName: place.shortName || place.name,
      mode: 'walking',
      provider: 'system-navigation-preview',
      distanceMeters: walkingDistance,
      durationMinutes: Math.max(2, Math.ceil(walkingDistance / 78)),
      start: { latitude: startLatitude, longitude: startLongitude },
      destination: { latitude: place.latitude, longitude: place.longitude },
      systemNavigation: {
        enabled: true,
        label: '系统导航',
        message: '前端可调用系统地图或客户端导航能力'
      },
      aiRoute: {
        enabled: false,
        deferred: true,
        message: 'AI 线下导游后端暂不接入'
      },
      message: '已生成步行路线预览，系统地图将提供道路级导航'
    }
  };
}

module.exports = {
  FRONTEND_REQUIRED_PLACE_FIELDS,
  average,
  buildExploreHome,
  buildRoutePlan,
  enrichPlace,
  formatDistance,
  geoDistanceMeters,
  listActivities,
  listPlaces
};
