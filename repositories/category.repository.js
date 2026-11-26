const { AgeGroup, GameFormat, GenderCategory } = require("../models");

const ACTIVE_ORDERED = { where: { isActive: true }, order: [["sortOrder", "ASC"]] };

const findAllCategories = async () => {
  const [gameFormats, ageGroups, genderCategories] = await Promise.all([
    GameFormat.findAll(ACTIVE_ORDERED),
    AgeGroup.findAll(ACTIVE_ORDERED),
    GenderCategory.findAll(ACTIVE_ORDERED),
  ]);
  return { gameFormats, ageGroups, genderCategories };
};

const countActive = (Model, id) =>
  id ? Model.count({ where: { id, isActive: true } }) : Promise.resolve(1);

// Checks every provided category id points to an active master row
const findInvalidCategoryFields = async ({ gameFormatId, ageGroupId, genderCategoryId }) => {
  const [gameFormatCount, ageGroupCount, genderCount] = await Promise.all([
    countActive(GameFormat, gameFormatId),
    countActive(AgeGroup, ageGroupId),
    countActive(GenderCategory, genderCategoryId),
  ]);
  return [
    !gameFormatCount && "gameFormatId",
    !ageGroupCount && "ageGroupId",
    !genderCount && "genderCategoryId",
  ].filter(Boolean);
};

module.exports = { findAllCategories, findInvalidCategoryFields };
