const express = require('express');
const router = express.Router();

const AuditLogs = require('../lib/AuditLogs');
const UserFavorites = require('../db/models/UserFavorites');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();
const config = require('../config');
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.post('/', auth.checkRoles("favorite_view"), async (req, res) => {
  try {
    const { user_id } = req.body;
    let favorites = await UserFavorites.find({ user_id })
      .populate("perfume_id", "_id brand name image_url");

    const perfumes = favorites.map(fav => fav.perfume_id);

    res.json(Response.successResponse({success: true, data: perfumes}));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/add', auth.checkRoles("favorite_add"),async (req, res) => {
  let body = req.body;
  try{
    if(!body.user_id) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["user_id"]));
    }

    if(!body.perfume_id) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["perfume_id"]));
    }

    let finded = await UserFavorites.findOne({user_id: body.user_id, perfume_id: body.perfume_id});
    
    if(finded) {
      throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, i18n.translate("COMMON.NOT_ACCEPTABLE", req.user.language), i18n.translate("COMMON.ALREADY_EXIST", req.user.language, ["Perfume"]));
    }

    let favorite = new UserFavorites({
      user_id: body.user_id,
      perfume_id: body.perfume_id
    });

    await favorite.save();

    AuditLogs.info(req.user?.email, "Favorites", "Add", favorite);
    logger.info(req.user?.email, "Favorites", "Add", favorite);

    const populated = await favorite.populate("perfume_id", "_id name brand image_url");

    res.json(Response.successResponse({success: true, data: populated.perfume_id}));

  } catch (err) {
    logger.error(req.user?.email, "Users", "AddFavorite", err);
    let errorResponse = Response.errorResponse(err);
    res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

router.post('/delete', auth.checkRoles("favorite_delete"), async (req, res) => {
  try {
    const {user_id, perfume_id} = req.body;
    const deleted = await UserFavorites.deleteOne({user_id: user_id, perfume_id: perfume_id});

    if(deleted.deletedCount === 0) {
      throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", req.user.language, ["Favorite"]));
    }

    AuditLogs.info(req.user?.email, "Users", "DeleteFavorite", deleted);
    logger.info(req.user?.email, "Users", "DeleteFavorite", deleted);

    res.json(Response.successResponse({success: true}));

  } catch (err) {
    logger.error(req.user?.email, "Users", "DeleteFavorite", err);
    let errorResponse = Response.errorResponse(err);
    res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

module.exports = router;
