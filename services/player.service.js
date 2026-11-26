const userRepository = require("../repositories/user.repository");
const storageService = require("./storage.service");
const placeService = require("./place.service");
const { buildPagination, buildPaginationMeta } = require("../utils/pagination");

// Search card for captains/organizers picking verified players; never includes contact details
const presentPlayerCard = async (user) => ({
  id: user.uuid,
  fullName: user.fullName,
  photoUrl: await storageService.getReadUrl(user.photoKey),
  city: placeService.presentPlace(user.city),
  positions: (user.positions ?? [])
    .map((position) => ({
      id: position.id,
      name: position.name,
      shortName: position.shortName,
      isPrimary: position.UserPosition.isPrimary,
    }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
});

const searchPlayers = async (query) => {
  const pagination = buildPagination(query, {
    sortableFields: [],
    defaultSort: ["fullName", "asc"],
  });
  const { rows, count } = await userRepository.findVerifiedPlayersPage({
    search: query.search,
    ...pagination,
  });
  return {
    items: await Promise.all(rows.map(presentPlayerCard)),
    meta: buildPaginationMeta({ ...pagination, total: count }),
  };
};

module.exports = { searchPlayers };
