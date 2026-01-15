const express = require('express');
const router = express.Router();

const emitter = require("../lib/Emitter");
const CommentsOfTopics = require("../db/models/CommentsOfTopics");
const AuditLogs = require("../lib/AuditLogs");
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();
const config = require('../config');
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);

router.get('/topic/:id', async (req, res) => {
    try{
        const topic_id = req.params.id;
        let comments = await CommentsOfTopics.find({topic_id: topic_id}).populate("user_id");
        const lang = req.user?.language || config.DEFAULT_LANG;

        if(comments.length === 0) {
            return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: i18n.translate("COMMON.NOT_FOUND", lang, ["topic_comments"])}, lang));
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

router.get('/', auth.checkRoles("comment_of_topic_view"), async (req, res) => {
    try{
        let comments = await CommentsOfTopics.find({}).populate("user_id");
        res.json(Response.successResponse(comments));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('/user', auth.checkRoles("comment_of_topic_view_user"), async (req, res) => {
    try{
        let comments = await CommentsOfTopics.find({user_id: req.user._id}).populate("user_id");

        if(comments.length === 0) {
            return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: i18n.translate("COMMON.NOT_FOUND", req.user.language, ["user_comments"])}, req.user.language));
        }

        res.json(Response.successResponse(comments));
    } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.post('/add', auth.checkRoles("comment_of_topic_add"), async (req, res) => {

    try{

        let body = req.body;
         
        if(!body.topic_id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["topic_id"]));
        }

        if(!body.content || body.content.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["content"]));
        }

        let comment = new CommentsOfTopics({
            user_id: req.user._id,
            topic_id: body.topic_id,
            content: body.content,
        });

        await comment.save();

        const addedComment = await comment.populate("user_id");

        AuditLogs.info(req.user.email, "Comments_of_Topics", "Add", comment);
        logger.info(req.user.email, "Comments_of_Topics", "Add", comment);
        emitter.getEmitter("notifications").emit("messages", {message: "topic comment added."});

        res.json(Response.successResponse({success: true, data: addedComment}));

    } catch (err) {
        logger.error(req.user.email, "Comments_of_Topics", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update', auth.checkRoles("comment_of_topic_update"), async (req, res) => {
    
    try{

        let body = req.body;

        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));
        }

        let updates = {};

        if(body.user_id) {
            throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, i18n.translate("COMMON.NOT_ACCEPTABLE", req.user.language), i18n.translate("COMMON.NOT_MODIFIABLE", req.user.language, ["user_id"]));
        }
        if(body.topic_id) {
            throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, i18n.translate("COMMON.NOT_ACCEPTABLE", req.user.language), i18n.translate("COMMON.NOT_MODIFIABLE", req.user.language, ["topic_id"]));
        }
        if(body.content) {
            updates.content = body.content; 
        }

        const before = CommentsOfTopics.findById(body._id);

        if(!before) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND", req.user.language, ["comment"]));
        }

        const updated = await CommentsOfTopics.findByIdAndUpdate(body._id, updates, {new: true});

        const updatedComment = await updated.populate("user_id");

        AuditLogs.info(req.user.email, "Comments_of_Topics", "Update", {before: before, after: updated});
        logger.info(req.user.email, "Comments_of_Topics", "Update", {before: before, after: updated});
        emitter.getEmitter("notifications").emit("messages", {message: "topic comment updated."});

        res.json(Response.successResponse({success: true, data: updatedComment}));

    } catch (err) {
        logger.error(req.user.email, "Comments_of_Topics", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', auth.checkRoles("comment_of_topic_delete"), async (req, res) => {
    try{

        let commentId = req.params.id;

        const comment = await CommentsOfTopics.findById(commentId);

        if(!comment) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", req.user.language, ["comment"]));
        }

        await CommentsOfTopics.deleteOne({_id: commentId});

        AuditLogs.info(req.user.email, "Comments_of_Topics", "Delete", comment);
        logger.info(req.user.email, "Comments_of_Topics", "Delete", comment);
        emitter.getEmitter("notifications").emit("messages", {message: "topic comment deleted."});

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user.email, "Comments_of_Topics", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;