// Development-only stand-in for Google Places, used when GOOGLE_MAPS_API_KEY is not set
const SAMPLE_PLACES = [
  {
    googlePlaceId: "sample-kopargaon",
    name: "Kopargaon",
    city: "Kopargaon",
    district: "Ahilyanagar",
    latitude: 19.8833,
    longitude: 74.4833,
    isCity: true,
  },
  {
    googlePlaceId: "sample-shirdi",
    name: "Shirdi",
    city: "Shirdi",
    district: "Ahilyanagar",
    latitude: 19.7669,
    longitude: 74.4775,
    isCity: true,
  },
  {
    googlePlaceId: "sample-ahilyanagar",
    name: "Ahilyanagar",
    city: "Ahilyanagar",
    district: "Ahilyanagar",
    latitude: 19.0948,
    longitude: 74.748,
    isCity: true,
  },
  {
    googlePlaceId: "sample-nashik",
    name: "Nashik",
    city: "Nashik",
    district: "Nashik",
    latitude: 19.9975,
    longitude: 73.7898,
    isCity: true,
  },
  {
    googlePlaceId: "sample-pune",
    name: "Pune",
    city: "Pune",
    district: "Pune",
    latitude: 18.5204,
    longitude: 73.8567,
    isCity: true,
  },
  {
    googlePlaceId: "sample-mumbai",
    name: "Mumbai",
    city: "Mumbai",
    district: "Mumbai",
    latitude: 19.076,
    longitude: 72.8777,
    isCity: true,
  },
  {
    googlePlaceId: "sample-sanjivani-ground",
    name: "Sanjivani Grass Ground",
    area: "Sahajanandnagar",
    city: "Kopargaon",
    district: "Ahilyanagar",
    latitude: 19.8918,
    longitude: 74.4721,
    isCity: false,
  },
  {
    googlePlaceId: "sample-shirdi-turf",
    name: "Sai Turf Arena",
    area: "Nagar-Manmad Road",
    city: "Shirdi",
    district: "Ahilyanagar",
    latitude: 19.7715,
    longitude: 74.4823,
    isCity: false,
  },
  {
    googlePlaceId: "sample-balewadi",
    name: "Shree Shiv Chhatrapati Sports Complex",
    area: "Balewadi",
    city: "Pune",
    district: "Pune",
    latitude: 18.5762,
    longitude: 73.7576,
    isCity: false,
  },
  {
    googlePlaceId: "sample-cooperage",
    name: "Cooperage Ground",
    area: "Colaba",
    city: "Mumbai",
    district: "Mumbai",
    latitude: 18.9255,
    longitude: 72.8276,
    isCity: false,
  },
];

const toDetails = (place) => ({
  googlePlaceId: place.googlePlaceId,
  name: place.name,
  formattedAddress: [
    place.name,
    place.area,
    place.city,
    `${place.district} district`,
    "Maharashtra",
  ]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(", "),
  area: place.area ?? null,
  city: place.city,
  district: place.district,
  state: "Maharashtra",
  pincode: null,
  latitude: place.latitude,
  longitude: place.longitude,
  types: [place.isCity ? "locality" : "establishment"],
});

const searchSamplePlaces = (query, { citiesOnly }) => {
  const term = query.toLowerCase();
  return SAMPLE_PLACES.filter(
    (place) =>
      (!citiesOnly || place.isCity) &&
      `${place.name} ${place.area ?? ""} ${place.city}`.toLowerCase().includes(term),
  ).map((place) => ({
    googlePlaceId: place.googlePlaceId,
    primaryText: place.name,
    secondaryText: [place.area, place.city !== place.name && place.city, "Maharashtra"]
      .filter(Boolean)
      .join(", "),
  }));
};

const getSamplePlaceDetails = (googlePlaceId) => {
  const place = SAMPLE_PLACES.find((item) => item.googlePlaceId === googlePlaceId);
  return place ? toDetails(place) : null;
};

module.exports = { searchSamplePlaces, getSamplePlaceDetails };
