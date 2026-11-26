const positionRepository = require("../repositories/position.repository");

const toPositionResponse = (position) => ({
  id: position.id,
  code: position.code,
  name: position.name,
  shortName: position.shortName,
});

const listPositions = async () =>
  (await positionRepository.findAllPositions()).map(toPositionResponse);

module.exports = { listPositions, toPositionResponse };
