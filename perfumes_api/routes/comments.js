const express = require('express');
const router = express.Router();

const Comments = require('../db/models/Comments');
const AuditLogs = require('../lib/AuditLogs');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();
const config = require('../config');
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);

router.get('/perfume/:id', async (req, res) => {
    try{
        const perfume_id = req.params.id;
        let comments = await Comments.find({perfume_id: perfume_id}).populate("user_id");
        const lang = req.user?.language || config.DEFAULT_LANG;

        if(comments.length === 0) {
            return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: i18n.translate("COMMON.NOT_FOUND", lang, ["perfume_comments"])}, lang));
        }

        res.json(Response.successResponse(comments));
    } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.get('/', auth.checkRoles("comment_view"),async (req, res) => {
    try{
        let comments = await Comments.find({}).populate("user_id");
        res.json(Response.successResponse(comments));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('/user', auth.checkRoles("comment_view_user"), async (req, res) => {
    try{
        let comments = await Comments.find({user_id: req.user._id}).populate("user_id");

        if(comments.length === 0) {
            return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: i18n.translate("COMMON.NOT_FOUND", req.user.language, ["user_comments"])}, req.user.language));
        }

        res.json(Response.successResponse(comments));
    } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.post('/add', auth.checkRoles("comment_add"), async (req, res) => {
    let body = req.body;
    try{
        if(!body.perfume_id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["perfume_id"]));
        }

        if(!body.content || body.content.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["content"]));
        }

        if(!body.rating) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["rating"]));
        }

        let comment = new Comments({
            user_id: req.user._id,
            perfume_id: body.perfume_id,
            content: body.content,
            rating: body.rating,
        });

        await comment.save();

        const addedComment = await comment.populate("user_id");

        AuditLogs.info(req.user?.email, "Comments", "Add", comment);
        logger.info(req.user?.email, "Comments", "Add", comment);

        res.json(Response.successResponse({success: true, data: addedComment}));

    } catch (err) {
        logger.error(req.user?.email, "Comments", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update', auth.checkRoles("comment_update"),async (req, res) => {
    let body = req.body;
    try{
        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));
        }

        let updates = {};

        if(body.user_id) {
            throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, i18n.translate("COMMON.NOT_ACCEPTABLE", req.user.language), i18n.translate("COMMON.NOT_MODIFIABLE", req.user.language, ["user_id"]));
        }
        if(body.perfume_id) {
            throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, i18n.translate("COMMON.NOT_ACCEPTABLE", req.user.language), i18n.translate("COMMON.NOT_MODIFIABLE", req.user.language, ["perfume_id"]));
        }
        if(body.content) {
            updates.content = body.content; 
        }
        if(body.rating) {
            updates.rating = body.rating; 
        }

        const updated = await Comments.updateOne({_id: body._id}, updates);

        if(updated.matchedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND", req.user.language, ["comment"]));
        }

        AuditLogs.info(req.user?.email, "Comments", "Update", updated);
        logger.info(req.user?.email, "Comments", "Update", updated);

        const updatedComment = await updated.populate("user_id");

        res.json(Response.successResponse({success: true, data: updatedComment}));

    } catch (err) {
        logger.error(req.user?.email, "Comments", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', auth.checkRoles("comment_delete"),async (req, res) => {
    try{
        let commentId = req.params.id;
        const deleted = await Comments.deleteOne({_id: commentId});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", req.user.language, ["comment"]));
        }

        AuditLogs.info(req.user?.email, "Comments", "Delete", deleted);
        logger.info(req.user?.email, "Comments", "Delete", deleted);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user?.email, "Comments", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;