const categoryRepository = require("../repositories/category.repository");

const presentCategories = ({ gameFormats, ageGroups, genderCategories }) => ({
  gameFormats: gameFormats.map(
    ({ id, code, name, playersPerSide, defaultMinSquad, defaultMaxSquad }) => ({
      id,
      code,
      name,
      playersPerSide,
      defaultMinSquad,
      defaultMaxSquad,
    }),
  ),
  ageGroups: ageGroups.map(({ id, code, name, minAge, maxAge }) => ({
    id,
    code,
    name,
    minAge,
    maxAge,
  })),
  genderCategories: genderCategories.map(({ id, code, name }) => ({ id, code, name })),
});

const listCategories = async () => presentCategories(await categoryRepository.findAllCategories());

module.exports = { listCategories };
