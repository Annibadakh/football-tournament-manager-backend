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

module.exports = { findAllPositions, countPositionsByIds, replaceUserPositions };
