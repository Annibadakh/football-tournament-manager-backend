const streamService = require("../services/stream.service");
const { sendSuccess } = require("../utils/apiResponse");
const { HTTP_STATUS } = require("../constants/common.constants");

const params = (req) => req.validated.params;
const body = (req) => req.validated.body;

const listStreams = async (req, res) =>
  sendSuccess(res, {
    data: await streamService.listStreams(req.user, params(req).tournamentId),
    message: "Streams fetched",
  });

const createStream = async (req, res) =>
  sendSuccess(res, {
    data: await streamService.createStream(req.user, params(req).tournamentId, body(req)),
    message: "Stream added",
    status: HTTP_STATUS.CREATED,
  });

const getStream = async (req, res) =>
  sendSuccess(res, {
    data: await streamService.getStream(req.user, params(req).streamId),
    message: "Stream fetched",
  });

const updateStream = async (req, res) =>
  sendSuccess(res, {
    data: await streamService.updateStream(req.user, params(req).streamId, body(req)),
    message: "Stream updated",
  });

const deleteStream = async (req, res) =>
  sendSuccess(res, {
    data: await streamService.deleteStream(req.user, params(req).streamId),
    message: "Stream removed",
  });

const listMyStreamingTournaments = async (req, res) =>
  sendSuccess(res, {
    data: await streamService.listMyStreamingTournaments(req.user),
    message: "Tournaments fetched",
  });

module.exports = {
  listStreams,
  createStream,
  getStream,
  updateStream,
  deleteStream,
  listMyStreamingTournaments,
};
