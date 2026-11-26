const { Position, UserPosition } = require("../models");

const findAllPositions = () =>
  Position.findAll({
    attributes: ["id", "code", "name", "shortName", "sortOrder"],
    order: [["sortOrder", "ASC"]],
  });

const countPositionsByIds = (ids) => Position.count({ where: { id: ids } });

const replaceUserPositions = async (userId, positions, { transaction }) => {
  await UserPosition.destroy({ where: { userId }, transaction });
  await UserPosition.bulkCreate(
    positions.map(({ positionId, isPrimary }) => ({ userId, positionId, isPrimary })),
    { transaction },
  );
};

const findUserPositionIds = async (userId, { transaction } = {}) =>
  (await UserPosition.findAll({ where: { userId }, attributes: ["positionId"], transaction })).map(
    (row) => row.positionId,
  );

// Adds a position to a profile if missing (guest players get the position their captain chose)
const addUserPositionIfMissing = async (userId, positionId, { transaction }) => {
  const existing = await UserPosition.findAll({
    where: { userId },
    attributes: ["positionId"],
    transaction,
  });
  if (existing.some((row) => row.positionId === positionId)) return;
  await UserPosition.create(
    { userId, positionId, isPrimary: existing.length === 0 },
    { transaction },
  );
};

const findPositionById = (id) => Position.findByPk(id);

module.exports = {
  findAllPositions,
  countPositionsByIds,
  replaceUserPositions,
  findUserPositionIds,
  addUserPositionIfMissing,
  findPositionById,
};
