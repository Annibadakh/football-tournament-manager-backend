const express = require("express");
const userController = require("../controllers/user.controller");
const { authenticate, authorize, requireVerified } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const schemas = require("../validations/user.schema");
const { ACCOUNT_ROLE } = require("../constants/user.constants");

const router = express.Router();

router.use(authenticate, requireVerified, authorize(ACCOUNT_ROLE.SUPERADMIN, ACCOUNT_ROLE.ADMIN));
router.get("/", validate({ query: schemas.listUsersQuerySchema }), userController.listUsers);
router.post("/", validate({ body: schemas.createStaffUserSchema }), userController.createUser);
router.patch(
  "/:userId/status",
  validate({ params: schemas.userIdParamSchema, body: schemas.updateBlockStatusSchema }),
  userController.updateUserStatus,
);
router.post(
  "/:userId/invites",
  validate({ params: schemas.userIdParamSchema }),
  userController.resendUserInvite,
);

module.exports = router;
